import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStockDetail } from "../api/data";
import { checkWatching, addToWatchlist, removeFromWatchlist } from "../api/watchlist";
import CandlestickChart from "../components/charts/CandlestickChart";
import type { OHLCVRow } from "../types";

const PERIODS = [
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "6M",  days: 180 },
  { label: "1Y",  days: 365 },
  { label: "2Y",  days: 730 },
];

const OVERLAYS = ["SMA 20", "SMA 50", "EMA 12", "EMA 26", "Bollinger"];
const OVERLAY_COLORS: Record<string, string> = {
  "SMA 20":   "#f59e0b",
  "SMA 50":   "#8b5cf6",
  "EMA 12":   "#06b6d4",
  "EMA 26":   "#ec4899",
  "Bollinger":"#64748b",
};

function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) =>
    i < period - 1 ? null : closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );
}

function ema(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  return closes.reduce<number[]>((acc, v, i) => {
    acc.push(i === 0 ? v : v * k + acc[i - 1] * (1 - k));
    return acc;
  }, []);
}

function buildOverlays(data: OHLCVRow[], active: string[]) {
  const closes = data.map((r) => r.close);
  const dates  = data.map((r) => r.date);
  const result = [];

  if (active.includes("SMA 20")) {
    const vals = sma(closes, 20);
    result.push({ label: "SMA 20", color: OVERLAY_COLORS["SMA 20"],
      values: dates.flatMap((t, i) => vals[i] != null ? [{ time: t, value: vals[i]! }] : []) });
  }
  if (active.includes("SMA 50")) {
    const vals = sma(closes, 50);
    result.push({ label: "SMA 50", color: OVERLAY_COLORS["SMA 50"],
      values: dates.flatMap((t, i) => vals[i] != null ? [{ time: t, value: vals[i]! }] : []) });
  }
  if (active.includes("EMA 12")) {
    const vals = ema(closes, 12);
    result.push({ label: "EMA 12", color: OVERLAY_COLORS["EMA 12"],
      values: dates.map((t, i) => ({ time: t, value: vals[i] })) });
  }
  if (active.includes("EMA 26")) {
    const vals = ema(closes, 26);
    result.push({ label: "EMA 26", color: OVERLAY_COLORS["EMA 26"],
      values: dates.map((t, i) => ({ time: t, value: vals[i] })) });
  }
  if (active.includes("Bollinger")) {
    const mid = sma(closes, 20);
    const std = closes.map((_, i) => {
      if (i < 19) return null;
      const sl = closes.slice(i - 19, i + 1);
      const m  = sl.reduce((a, b) => a + b, 0) / 20;
      return Math.sqrt(sl.map((v) => (v - m) ** 2).reduce((a, b) => a + b, 0) / 20);
    });
    result.push({ label: "BB Upper", color: "#64748b",
      values: dates.flatMap((t, i) => mid[i] != null && std[i] != null ? [{ time: t, value: mid[i]! + 2 * std[i]! }] : []) });
    result.push({ label: "BB Lower", color: "#64748b",
      values: dates.flatMap((t, i) => mid[i] != null && std[i] != null ? [{ time: t, value: mid[i]! - 2 * std[i]! }] : []) });
  }
  return result;
}

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate   = useNavigate();
  const [days, setDays]             = useState(365);
  const [activeOverlays, setActive] = useState<string[]>(["SMA 20"]);

  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock-detail", symbol, days],
    queryFn: () => getStockDetail(symbol!, days),
    enabled: !!symbol,
  });

  const { data: watchData } = useQuery({
    queryKey: ["watching", symbol],
    queryFn: () => checkWatching(symbol!),
    enabled: !!symbol,
  });
  const watching = watchData?.watching ?? false;

  const watchMut = useMutation({
    mutationFn: () => watching ? removeFromWatchlist(symbol!) : addToWatchlist(symbol!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watching", symbol] });
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  const overlays = useMemo(
    () => (data ? buildOverlays(data.ohlcv, activeOverlays) : []),
    [data, activeOverlays]
  );

  const toggle = (name: string) =>
    setActive((p) => p.includes(name) ? p.filter((o) => o !== name) : [...p, name]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
      Loading {symbol}...
    </div>
  );
  if (isError || !data) return (
    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
      Failed to load data for {symbol}.
    </div>
  );

  const { stats } = data;
  const isUp = (stats.pct_change ?? 0) >= 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate(-1)} className="btn-secondary mt-1">← Back</button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">{data.symbol}</h1>
            {data.name   && <span className="text-slate-500 dark:text-slate-400 text-base">{data.name}</span>}
            {data.sector && <span className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{data.sector}</span>}
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              Rs. {stats.current_price?.toFixed(2) ?? "—"}
            </span>
            <span className={`text-base font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
              {isUp ? "▲" : "▼"} {Math.abs(stats.pct_change ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-1 flex-wrap">
          <button onClick={() => watchMut.mutate()} disabled={watchMut.isPending}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
              watching
                ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-yellow-400 hover:text-yellow-600"
            }`}>
            {watching ? "★ Watching" : "☆ Watch"}
          </button>
          <button onClick={() => navigate(`/analysis?symbol=${data.symbol}`)} className="btn-primary">
            Run Analysis
          </button>
          <button onClick={() => navigate(`/predictions?symbol=${data.symbol}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            Predict
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Prev Close",     value: `Rs. ${stats.prev_close?.toFixed(2) ?? "—"}` },
          { label: "52W High",       value: `Rs. ${stats.high_52w.toFixed(2)}` },
          { label: "52W Low",        value: `Rs. ${stats.low_52w.toFixed(2)}` },
          { label: "Volume",         value: stats.volume != null ? Number(stats.volume).toLocaleString() : "—" },
          { label: "Turnover",       value: stats.turnover != null ? `Rs. ${(stats.turnover / 1e6).toFixed(2)}M` : "—" },
          { label: "Market Cap",     value: stats.market_cap != null ? `Rs. ${(stats.market_cap / 1e9).toFixed(2)}B` : "—" },
          { label: "Period Return",  value: `${stats.total_return_pct >= 0 ? "+" : ""}${stats.total_return_pct.toFixed(2)}%`,
            color: stats.total_return_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="text-xs text-slate-400">{s.label}</div>
            <div className={`font-bold text-sm ${s.color ?? "text-slate-900 dark:text-white"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                days === p.days
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {OVERLAYS.map((name) => (
            <button key={name} onClick={() => toggle(name)}
              className="px-2.5 py-1 text-xs rounded-md font-medium border transition-colors"
              style={{
                borderColor: OVERLAY_COLORS[name],
                background: activeOverlays.includes(name) ? OVERLAY_COLORS[name] : "transparent",
                color: activeOverlays.includes(name) ? "#fff" : OVERLAY_COLORS[name],
              }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick chart */}
      <div className="rounded-xl overflow-hidden bg-slate-900">
        <CandlestickChart data={data.ohlcv} overlays={overlays} height={420} />
      </div>

      {/* Recent OHLCV table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200">Recent Trading Data</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Date", "Open", "High", "Low", "Close", "Volume", "Change %"].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.ohlcv].reverse().slice(0, 20).map((row) => {
                const up = (row.pct_change ?? 0) >= 0;
                return (
                  <tr key={row.date} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="td font-medium">{row.date}</td>
                    <td className="td">{row.open.toFixed(2)}</td>
                    <td className="td">{row.high.toFixed(2)}</td>
                    <td className="td">{row.low.toFixed(2)}</td>
                    <td className="td font-semibold">{row.close.toFixed(2)}</td>
                    <td className="td text-slate-500">{Number(row.volume).toLocaleString()}</td>
                    <td className={`td font-medium ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {row.pct_change != null ? `${row.pct_change >= 0 ? "+" : ""}${row.pct_change.toFixed(2)}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
