import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStockDetail } from "../api/data";
import CandlestickChart from "../components/charts/CandlestickChart";
import type { OHLCVRow } from "../types";

const PERIOD_OPTIONS = [
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "6M",  days: 180 },
  { label: "1Y",  days: 365 },
  { label: "2Y",  days: 730 },
];

const OVERLAY_OPTIONS = ["SMA 20", "SMA 50", "EMA 12", "EMA 26", "Bollinger"];
const OVERLAY_COLORS: Record<string, string> = {
  "SMA 20": "#f59e0b",
  "SMA 50": "#8b5cf6",
  "EMA 12": "#06b6d4",
  "EMA 26": "#ec4899",
  "Bollinger": "#64748b",
};

// ── Technical indicator helpers ────────────────────────────────────────────

function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) =>
    i < period - 1 ? null : closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );
}

function ema(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  closes.forEach((v, i) => {
    result.push(i === 0 ? v : v * k + result[i - 1] * (1 - k));
  });
  return result;
}

function buildOverlays(data: OHLCVRow[], active: string[]) {
  const closes = data.map((r) => r.close);
  const dates  = data.map((r) => r.date);
  const overlays = [];

  if (active.includes("SMA 20")) {
    const vals = sma(closes, 20);
    overlays.push({ label: "SMA 20", color: OVERLAY_COLORS["SMA 20"],
      values: dates.map((t, i) => ({ time: t, value: vals[i]! })).filter((v) => v.value != null) });
  }
  if (active.includes("SMA 50")) {
    const vals = sma(closes, 50);
    overlays.push({ label: "SMA 50", color: OVERLAY_COLORS["SMA 50"],
      values: dates.map((t, i) => ({ time: t, value: vals[i]! })).filter((v) => v.value != null) });
  }
  if (active.includes("EMA 12")) {
    const vals = ema(closes, 12);
    overlays.push({ label: "EMA 12", color: OVERLAY_COLORS["EMA 12"],
      values: dates.map((t, i) => ({ time: t, value: vals[i] })) });
  }
  if (active.includes("EMA 26")) {
    const vals = ema(closes, 26);
    overlays.push({ label: "EMA 26", color: OVERLAY_COLORS["EMA 26"],
      values: dates.map((t, i) => ({ time: t, value: vals[i] })) });
  }
  if (active.includes("Bollinger")) {
    const mid = sma(closes, 20);
    const stdVals = closes.map((_, i) => {
      if (i < 19) return null;
      const slice = closes.slice(i - 19, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / 20;
      const std = Math.sqrt(slice.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / 20);
      return std;
    });
    overlays.push({ label: "BB Upper", color: "#64748b",
      values: dates.map((t, i) => ({ time: t, value: mid[i]! + 2 * stdVals[i]! })).filter((v) => !isNaN(v.value)) });
    overlays.push({ label: "BB Lower", color: "#64748b",
      values: dates.map((t, i) => ({ time: t, value: mid[i]! - 2 * stdVals[i]! })).filter((v) => !isNaN(v.value)) });
  }
  return overlays;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(365);
  const [activeOverlays, setActiveOverlays] = useState<string[]>(["SMA 20"]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stock-detail", symbol, days],
    queryFn: () => getStockDetail(symbol!, days),
    enabled: !!symbol,
  });

  const overlays = useMemo(
    () => (data ? buildOverlays(data.ohlcv, activeOverlays) : []),
    [data, activeOverlays]
  );

  const toggleOverlay = (name: string) =>
    setActiveOverlays((prev) =>
      prev.includes(name) ? prev.filter((o) => o !== name) : [...prev, name]
    );

  if (isLoading) return <div style={center}>Loading {symbol}...</div>;
  if (isError || !data) return <div style={center}>Failed to load data for {symbol}.</div>;

  const { stats } = data;
  const isUp = (stats.pct_change ?? 0) >= 0;

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1400, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>{data.symbol}</h1>
            {data.name && <span style={{ color: "#64748b", fontSize: 15 }}>{data.name}</span>}
            {data.sector && <span style={sectorBadge}>{data.sector}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>
              Rs. {stats.current_price?.toFixed(2) ?? "—"}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: isUp ? "#22c55e" : "#ef4444" }}>
              {isUp ? "▲" : "▼"} {Math.abs(stats.pct_change ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate(`/analysis?symbol=${data.symbol}`)} style={actionBtn("#2563eb")}>
            Run Analysis
          </button>
          <button onClick={() => navigate(`/predictions?symbol=${data.symbol}`)} style={actionBtn("#7c3aed")}>
            Predict
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <StatCard label="Prev Close"   value={`Rs. ${stats.prev_close?.toFixed(2) ?? "—"}`} />
        <StatCard label="52W High"     value={`Rs. ${stats.high_52w.toFixed(2)}`} />
        <StatCard label="52W Low"      value={`Rs. ${stats.low_52w.toFixed(2)}`} />
        <StatCard label="Volume"       value={stats.volume != null ? Number(stats.volume).toLocaleString() : "—"} />
        <StatCard label="Turnover"     value={stats.turnover != null ? `Rs. ${(stats.turnover / 1e6).toFixed(2)}M` : "—"} />
        <StatCard label="Market Cap"   value={stats.market_cap != null ? `Rs. ${(stats.market_cap / 1e9).toFixed(2)}B` : "—"} />
        <StatCard label="Period Return" value={`${stats.total_return_pct >= 0 ? "+" : ""}${stats.total_return_pct.toFixed(2)}%`}
          color={stats.total_return_pct >= 0 ? "#22c55e" : "#ef4444"} />
      </div>

      {/* Chart controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {/* Period selector */}
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {PERIOD_OPTIONS.map((p) => (
            <button key={p.days} onClick={() => setDays(p.days)} style={periodBtn(days === p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Overlay toggles */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {OVERLAY_OPTIONS.map((name) => (
            <button
              key={name}
              onClick={() => toggleOverlay(name)}
              style={{
                padding: "0.25rem 0.6rem", fontSize: 12, borderRadius: 4, cursor: "pointer",
                border: `1px solid ${OVERLAY_COLORS[name] || "#475569"}`,
                background: activeOverlays.includes(name) ? OVERLAY_COLORS[name] : "transparent",
                color: activeOverlays.includes(name) ? "#fff" : OVERLAY_COLORS[name] || "#94a3b8",
                fontWeight: 500,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick chart */}
      <div style={{ background: "#0f172a", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
        <CandlestickChart data={data.ohlcv} overlays={overlays} height={420} />
      </div>

      {/* OHLCV table - recent 20 rows */}
      <div>
        <h3 style={{ marginBottom: "0.75rem", fontSize: 15, color: "#475569" }}>Recent Trading Data</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Date", "Open", "High", "Low", "Close", "Volume", "Change %"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.ohlcv].reverse().slice(0, 20).map((row) => (
                <tr key={row.date} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{row.date}</td>
                  <td style={td}>{row.open.toFixed(2)}</td>
                  <td style={td}>{row.high.toFixed(2)}</td>
                  <td style={td}>{row.low.toFixed(2)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{row.close.toFixed(2)}</td>
                  <td style={td}>{Number(row.volume).toLocaleString()}</td>
                  <td style={{ ...td, color: (row.pct_change ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                    {row.pct_change != null ? `${row.pct_change >= 0 ? "+" : ""}${row.pct_change.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "0.6rem 1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: color ?? "#1e293b" }}>{value}</div>
    </div>
  );
}

const center: React.CSSProperties = { display: "flex", justifyContent: "center", alignItems: "center", padding: "6rem", fontSize: 16, color: "#64748b" };
const sectorBadge: React.CSSProperties = { background: "#eff6ff", color: "#2563eb", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 };
const backBtn: React.CSSProperties = { padding: "0.4rem 0.75rem", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 4, cursor: "pointer", fontSize: 13, color: "#475569" };
const actionBtn = (bg: string): React.CSSProperties => ({ padding: "0.5rem 1rem", background: bg, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 });
const periodBtn = (active: boolean): React.CSSProperties => ({ padding: "0.3rem 0.6rem", fontSize: 12, borderRadius: 4, cursor: "pointer", border: "1px solid #e2e8f0", background: active ? "#2563eb" : "#f8fafc", color: active ? "#fff" : "#64748b", fontWeight: active ? 600 : 400 });
const th: React.CSSProperties = { padding: "8px 10px", borderBottom: "2px solid #e2e8f0", textAlign: "left", background: "#f8fafc", fontSize: 12, color: "#64748b", fontWeight: 600 };
const td: React.CSSProperties = { padding: "7px 10px", fontSize: 13, color: "#1e293b" };
