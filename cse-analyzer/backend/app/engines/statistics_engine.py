import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import date


def _fetch_prices(db_data: List[dict]) -> pd.DataFrame:
    df = pd.DataFrame(db_data)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").set_index("date")
    return df


# ── Trend Analysis ────────────────────────────────────────────────────────────

def compute_trend(df: pd.DataFrame, params: Dict[str, Any]) -> Dict[str, Any]:
    close = df["close"].astype(float)
    result: Dict[str, Any] = {}

    indicators = params.get("indicators", ["sma", "ema", "rsi", "macd", "bollinger"])

    if "sma" in indicators:
        result["sma"] = {
            f"sma_{p}": close.rolling(p).mean().round(4).dropna().tolist()
            for p in [5, 10, 20, 50, 200] if len(close) >= p
        }

    if "ema" in indicators:
        result["ema"] = {
            f"ema_{p}": close.ewm(span=p, adjust=False).mean().round(4).tolist()
            for p in [12, 26]
        }

    if "rsi" in indicators and len(close) >= 15:
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        result["rsi"] = (100 - 100 / (1 + rs)).round(2).dropna().tolist()

    if "macd" in indicators and len(close) >= 26:
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = ema12 - ema26
        signal = macd_line.ewm(span=9, adjust=False).mean()
        result["macd"] = {
            "macd": macd_line.round(4).tolist(),
            "signal": signal.round(4).tolist(),
            "histogram": (macd_line - signal).round(4).tolist(),
        }

    if "bollinger" in indicators and len(close) >= 20:
        sma20 = close.rolling(20).mean()
        std20 = close.rolling(20).std()
        result["bollinger"] = {
            "middle": sma20.round(4).dropna().tolist(),
            "upper": (sma20 + 2 * std20).round(4).dropna().tolist(),
            "lower": (sma20 - 2 * std20).round(4).dropna().tolist(),
        }

    last_price = float(close.iloc[-1])
    sma20_last = float(close.rolling(20).mean().iloc[-1]) if len(close) >= 20 else None
    trend = "sideways"
    if sma20_last:
        if last_price > sma20_last * 1.02:
            trend = "bullish"
        elif last_price < sma20_last * 0.98:
            trend = "bearish"

    result["prices"] = {
        "dates": df.index.strftime("%Y-%m-%d").tolist(),
        "open": df["open"].round(4).tolist(),
        "high": df["high"].round(4).tolist(),
        "low": df["low"].round(4).tolist(),
        "close": close.round(4).tolist(),
        "volume": df["volume"].tolist(),
    }
    result["trend_direction"] = trend
    result["current_price"] = last_price
    return result


# ── Correlation Analysis ──────────────────────────────────────────────────────

def compute_correlation(dfs: Dict[str, pd.DataFrame], method: str = "pearson") -> Dict[str, Any]:
    closes = {}
    for symbol, df in dfs.items():
        if not df.empty:
            closes[symbol] = df["close"].astype(float)

    if len(closes) < 2:
        return {"error": "Need at least 2 symbols for correlation"}

    price_df = pd.DataFrame(closes).dropna()
    returns = price_df.pct_change().dropna()
    corr_matrix = returns.corr(method=method).round(4)

    symbols = list(corr_matrix.columns)
    matrix = corr_matrix.values.tolist()
    return {
        "symbols": symbols,
        "matrix": matrix,
        "method": method,
        "date_range": {
            "start": price_df.index[0].strftime("%Y-%m-%d"),
            "end": price_df.index[-1].strftime("%Y-%m-%d"),
        },
    }


# ── Risk Analysis ─────────────────────────────────────────────────────────────

def compute_risk(df: pd.DataFrame, benchmark_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    close = df["close"].astype(float)
    returns = close.pct_change().dropna()

    volatility = float(returns.std() * np.sqrt(252) * 100)
    mean_return = float(returns.mean() * 252 * 100)
    sharpe = float(mean_return / volatility) if volatility > 0 else 0

    cumulative = (1 + returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    max_drawdown = float(drawdown.min() * 100)

    var_95 = float(np.percentile(returns, 5) * 100)
    cvar_95 = float(returns[returns <= np.percentile(returns, 5)].mean() * 100)

    beta = None
    if benchmark_df is not None and not benchmark_df.empty:
        bench_returns = benchmark_df["close"].astype(float).pct_change().dropna()
        aligned = pd.concat([returns, bench_returns], axis=1).dropna()
        if len(aligned) > 10:
            cov = aligned.cov().iloc[0, 1]
            bench_var = float(aligned.iloc[:, 1].var())
            beta = round(cov / bench_var, 4) if bench_var != 0 else None

    risk_level = "low"
    if volatility >= 4:
        risk_level = "high"
    elif volatility >= 2:
        risk_level = "medium"

    return {
        "volatility_annualized_pct": round(volatility, 4),
        "mean_annual_return_pct": round(mean_return, 4),
        "sharpe_ratio": round(sharpe, 4),
        "max_drawdown_pct": round(max_drawdown, 4),
        "var_95_pct": round(var_95, 4),
        "cvar_95_pct": round(cvar_95, 4),
        "beta": beta,
        "risk_level": risk_level,
    }


# ── Sector Comparison ─────────────────────────────────────────────────────────

def compute_sector_comparison(dfs: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    results = {}
    for symbol, df in dfs.items():
        if df.empty:
            continue
        close = df["close"].astype(float)
        returns = close.pct_change().dropna()
        total_return = float((close.iloc[-1] / close.iloc[0] - 1) * 100)
        volatility = float(returns.std() * np.sqrt(252) * 100)
        results[symbol] = {
            "total_return_pct": round(total_return, 4),
            "volatility_pct": round(volatility, 4),
            "current_price": round(float(close.iloc[-1]), 4),
        }
    return {"comparison": results}
