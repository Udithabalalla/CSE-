import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor


# ── Shared helpers ────────────────────────────────────────────────────────────

def _compute_metrics(actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
    mae = float(np.mean(np.abs(actual - predicted)))
    rmse = float(np.sqrt(np.mean((actual - predicted) ** 2)))
    mape = float(np.mean(np.abs((actual - predicted) / (actual + 1e-8))) * 100)
    ss_res = np.sum((actual - predicted) ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    r2 = float(1 - ss_res / (ss_tot + 1e-8))
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "mape": round(mape, 4), "r2_score": round(r2, 4)}


def _confidence_interval(predictions: np.ndarray, std_scale: float = 1.96) -> Tuple[List[float], List[float]]:
    std = float(np.std(predictions) * 0.1)
    upper = (predictions + std_scale * std).round(4).tolist()
    lower = (predictions - std_scale * std).round(4).tolist()
    return upper, lower


# ── ARIMA ─────────────────────────────────────────────────────────────────────

def run_arima(close: pd.Series, forecast_days: int) -> Dict[str, Any]:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.stattools import adfuller

    adf_result = adfuller(close.dropna())
    is_stationary = adf_result[1] < 0.05
    d = 0 if is_stationary else 1

    train = close.values
    model = ARIMA(train, order=(5, d, 0))
    fitted = model.fit()
    forecast_result = fitted.get_forecast(steps=forecast_days)
    predicted = forecast_result.predicted_mean
    conf_int = forecast_result.conf_int(alpha=0.05)

    train_pred = fitted.fittedvalues
    actual = train[1:] if d == 1 else train
    pred_trimmed = train_pred[:len(actual)]

    return {
        "model": "arima",
        "predicted_prices": predicted.round(4).tolist(),
        "upper_bound": conf_int.iloc[:, 1].round(4).tolist(),
        "lower_bound": conf_int.iloc[:, 0].round(4).tolist(),
        "accuracy_metrics": _compute_metrics(actual, pred_trimmed),
    }


# ── Random Forest ─────────────────────────────────────────────────────────────

def run_random_forest(close: pd.Series, forecast_days: int) -> Dict[str, Any]:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import MinMaxScaler

    df = pd.DataFrame({"close": close})
    for lag in [1, 2, 3, 5, 10]:
        df[f"lag_{lag}"] = df["close"].shift(lag)
    for w in [5, 10, 20]:
        df[f"sma_{w}"] = df["close"].rolling(w).mean()
    df["volume_ratio"] = 1.0  # placeholder when volume not in scope
    df = df.dropna()

    X = df.drop("close", axis=1).values
    y = df["close"].values

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    test_pred = model.predict(X_test)
    metrics = _compute_metrics(y_test, test_pred)

    last_row = X[-1].reshape(1, -1)
    predictions = []
    for _ in range(forecast_days):
        pred = float(model.predict(last_row)[0])
        predictions.append(pred)
        last_row = np.roll(last_row, -1, axis=1)
        last_row[0, -1] = pred

    predicted = np.array(predictions)
    upper, lower = _confidence_interval(predicted)

    feature_names = [c for c in df.columns if c != "close"]
    importances = dict(zip(feature_names, model.feature_importances_.round(4).tolist()))

    return {
        "model": "random_forest",
        "predicted_prices": predicted.round(4).tolist(),
        "upper_bound": upper,
        "lower_bound": lower,
        "accuracy_metrics": metrics,
        "feature_importance": importances,
    }


# ── LSTM ──────────────────────────────────────────────────────────────────────

def run_lstm(close: pd.Series, forecast_days: int) -> Dict[str, Any]:
    import tensorflow as tf
    from sklearn.preprocessing import MinMaxScaler

    tf.get_logger().setLevel("ERROR")
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(close.values.reshape(-1, 1))

    lookback = 60
    X, y = [], []
    for i in range(lookback, len(scaled)):
        X.append(scaled[i - lookback:i, 0])
        y.append(scaled[i, 0])
    X, y = np.array(X), np.array(y)
    X = X.reshape(X.shape[0], X.shape[1], 1)

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = tf.keras.Sequential([
        tf.keras.layers.LSTM(50, return_sequences=True, input_shape=(lookback, 1)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.LSTM(50),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(25),
        tf.keras.layers.Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")
    model.fit(X_train, y_train, epochs=10, batch_size=32, verbose=0, validation_split=0.1)

    test_pred_scaled = model.predict(X_test, verbose=0).flatten()
    test_pred = scaler.inverse_transform(test_pred_scaled.reshape(-1, 1)).flatten()
    actual = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    metrics = _compute_metrics(actual, test_pred)

    last_seq = scaled[-lookback:].reshape(1, lookback, 1)
    predictions = []
    for _ in range(forecast_days):
        pred_scaled = model.predict(last_seq, verbose=0)[0, 0]
        predictions.append(pred_scaled)
        last_seq = np.roll(last_seq, -1, axis=1)
        last_seq[0, -1, 0] = pred_scaled

    predicted = scaler.inverse_transform(np.array(predictions).reshape(-1, 1)).flatten()
    upper, lower = _confidence_interval(predicted)

    return {
        "model": "lstm",
        "predicted_prices": predicted.round(4).tolist(),
        "upper_bound": upper,
        "lower_bound": lower,
        "accuracy_metrics": metrics,
    }


# ── Hybrid Ensemble ───────────────────────────────────────────────────────────

def run_hybrid(close: pd.Series, forecast_days: int) -> Dict[str, Any]:
    weights = {"arima": 0.3, "random_forest": 0.3, "lstm": 0.4}
    results = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            "arima": executor.submit(run_arima, close, forecast_days),
            "random_forest": executor.submit(run_random_forest, close, forecast_days),
            "lstm": executor.submit(run_lstm, close, forecast_days),
        }
        for name, future in futures.items():
            try:
                results[name] = future.result()
            except Exception as e:
                results[name] = None

    valid = {k: v for k, v in results.items() if v is not None}
    if not valid:
        raise RuntimeError("All models failed")

    total_weight = sum(weights[k] for k in valid)
    hybrid_prices = np.zeros(forecast_days)
    for name, res in valid.items():
        w = weights[name] / total_weight
        hybrid_prices += w * np.array(res["predicted_prices"][:forecast_days])

    avg_metrics = {}
    metric_keys = ["mae", "rmse", "mape", "r2_score"]
    for k in metric_keys:
        vals = [v["accuracy_metrics"][k] for v in valid.values() if k in v.get("accuracy_metrics", {})]
        avg_metrics[k] = round(float(np.mean(vals)), 4) if vals else 0.0

    upper, lower = _confidence_interval(hybrid_prices)

    return {
        "model": "hybrid",
        "predicted_prices": hybrid_prices.round(4).tolist(),
        "upper_bound": upper,
        "lower_bound": lower,
        "accuracy_metrics": avg_metrics,
        "component_models": {k: v["accuracy_metrics"] for k, v in valid.items()},
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────

def run_model(close: pd.Series, model_type: str, forecast_days: int) -> Dict[str, Any]:
    dispatch = {
        "arima": run_arima,
        "random_forest": run_random_forest,
        "lstm": run_lstm,
        "hybrid": run_hybrid,
    }
    fn = dispatch.get(model_type)
    if fn is None:
        raise ValueError(f"Unknown model type: {model_type}")
    return fn(close, forecast_days)
