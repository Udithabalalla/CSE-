import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { getStocks } from "../api/data";
import { runAnalysis } from "../api/analysis";
import type { AnalysisType, AnalysisResponse } from "../types";

const ANALYSIS_TYPES: { value: AnalysisType; label: string; desc: string }[] = [
  { value: "trend", label: "Trend Analysis", desc: "Technical indicators: SMA, EMA, RSI, MACD, Bollinger Bands" },
  { value: "correlation", label: "Correlation", desc: "Cross-stock correlation heatmap" },
  { value: "risk", label: "Risk Analysis", desc: "Volatility, Sharpe ratio, VaR, Max Drawdown" },
  { value: "sector_comparison", label: "Sector Comparison", desc: "Compare performance across stocks" },
];

export default function AnalysisPage() {
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [corrMethod, setCorrMethod] = useState("pearson");
  const [result, setResult] = useState<AnalysisResponse | null>(null);

  const { data: stocks = [] } = useQuery({ queryKey: ["stocks"], queryFn: getStocks });

  const mutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: (data) => setResult(data),
  });

  const handleRun = () => {
    if (!selectedType || symbols.length === 0) return;
    mutation.mutate({
      analysis_type: selectedType,
      symbols,
      start_date: startDate,
      end_date: endDate,
      params: selectedType === "correlation" ? { method: corrMethod } : {},
    });
  };

  const toggleSymbol = (sym: string) =>
    setSymbols((prev) => prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Analysis</h1>
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 280, maxWidth: 320 }}>
          <h3>Analysis Type</h3>
          {ANALYSIS_TYPES.map((t) => (
            <div
              key={t.value}
              onClick={() => { setSelectedType(t.value); setResult(null); }}
              style={{
                padding: "0.75rem", marginBottom: "0.5rem", cursor: "pointer", borderRadius: 6,
                border: `2px solid ${selectedType === t.value ? "#2563eb" : "#e2e8f0"}`,
                background: selectedType === t.value ? "#eff6ff" : "#fff",
              }}
            >
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>{t.desc}</div>
            </div>
          ))}

          {selectedType && (
            <>
              <h3 style={{ marginTop: "1.5rem" }}>Symbols</h3>
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 4, padding: "0.5rem" }}>
                {stocks.map((s) => (
                  <label key={s.symbol} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 13 }}>
                    <input
                      type={selectedType === "trend" || selectedType === "risk" ? "radio" : "checkbox"}
                      checked={symbols.includes(s.symbol)}
                      onChange={() => {
                        if (selectedType === "trend" || selectedType === "risk") setSymbols([s.symbol]);
                        else toggleSymbol(s.symbol);
                      }}
                    />
                    {s.symbol}
                  </label>
                ))}
                {!stocks.length && <p style={{ fontSize: 12, color: "#888" }}>No stocks uploaded yet</p>}
              </div>

              <h3 style={{ marginTop: "1rem" }}>Date Range</h3>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>

              {selectedType === "correlation" && (
                <>
                  <h3 style={{ marginTop: "1rem" }}>Method</h3>
                  {["pearson", "spearman", "kendall"].map((m) => (
                    <label key={m} style={{ marginRight: "0.75rem", fontSize: 13 }}>
                      <input type="radio" value={m} checked={corrMethod === m} onChange={() => setCorrMethod(m)} /> {m}
                    </label>
                  ))}
                </>
              )}

              <button
                onClick={handleRun}
                disabled={mutation.isPending || symbols.length === 0}
                style={{ ...btnStyle, marginTop: "1rem", width: "100%" }}
              >
                {mutation.isPending ? "Running..." : "Run Analysis"}
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          {mutation.isPending && <p>Analyzing...</p>}
          {mutation.isError && <p style={{ color: "red" }}>Analysis failed</p>}
          {result && <AnalysisResults result={result} />}
        </div>
      </div>
    </div>
  );
}

function AnalysisResults({ result }: { result: AnalysisResponse }) {
  const d = result.data as Record<string, unknown>;

  return (
    <div>
      <h3>{result.analysis_type.replace("_", " ").toUpperCase()} Results</h3>
      <p style={{ fontSize: 12, color: "#64748b" }}>
        Computed in {result.metadata.execution_time_ms}ms
      </p>

      {result.warnings.map((w, i) => (
        <div key={i} style={{ padding: "0.5rem", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 4, marginBottom: "0.5rem", fontSize: 13 }}>
          {w}
        </div>
      ))}

      {result.recommendations.map((r, i) => (
        <div key={i} style={{ padding: "0.5rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 4, marginBottom: "0.5rem", fontSize: 13 }}>
          {r}
        </div>
      ))}

      {result.analysis_type === "trend" && <TrendChart data={d} />}
      {result.analysis_type === "correlation" && <CorrelationTable data={d} />}
      {result.analysis_type === "risk" && <RiskMetrics data={d} />}
      {result.analysis_type === "sector_comparison" && <SectorTable data={d} />}
    </div>
  );
}

function TrendChart({ data }: { data: Record<string, unknown> }) {
  const prices = data.prices as { dates: string[]; close: number[] } | undefined;
  if (!prices) return null;

  const chartData = prices.dates.map((d, i) => ({ date: d, close: prices.close[i] }));
  const trend = data.trend_direction as string;

  return (
    <div>
      <p>Trend: <strong style={{ color: trend === "bullish" ? "green" : trend === "bearish" ? "red" : "#888" }}>{trend}</strong></p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickCount={6} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#2563eb" dot={false} name="Close Price" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CorrelationTable({ data }: { data: Record<string, unknown> }) {
  const symbols = data.symbols as string[] | undefined;
  const matrix = data.matrix as number[][] | undefined;
  if (!symbols || !matrix) return null;

  const getColor = (v: number) => {
    const r = v < 0 ? 255 : Math.round(255 * (1 - v));
    const g = v > 0 ? 255 : Math.round(255 * (1 + v));
    return `rgb(${r},${g},150)`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}></th>
            {symbols.map((s) => <th key={s} style={thStyle}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={symbols[i]}>
              <td style={{ ...thStyle, fontWeight: 600 }}>{symbols[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{ ...tdStyle, background: getColor(v), textAlign: "center" }}>
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RiskMetrics({ data }: { data: Record<string, unknown> }) {
  const metrics = [
    { label: "Volatility (Annual)", value: `${data.volatility_annualized_pct}%` },
    { label: "Mean Annual Return", value: `${data.mean_annual_return_pct}%` },
    { label: "Sharpe Ratio", value: String(data.sharpe_ratio) },
    { label: "Max Drawdown", value: `${data.max_drawdown_pct}%` },
    { label: "VaR 95%", value: `${data.var_95_pct}%` },
    { label: "CVaR 95%", value: `${data.cvar_95_pct}%` },
    { label: "Beta", value: data.beta != null ? String(data.beta) : "N/A" },
    { label: "Risk Level", value: String(data.risk_level) },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
      {metrics.map((m) => (
        <div key={m.label} style={{ padding: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>{m.label}</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function SectorTable({ data }: { data: Record<string, unknown> }) {
  const comparison = data.comparison as Record<string, { total_return_pct: number; volatility_pct: number; current_price: number }> | undefined;
  if (!comparison) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>{["Symbol", "Total Return %", "Volatility %", "Current Price"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {Object.entries(comparison).map(([sym, v]) => (
          <tr key={sym}>
            <td style={tdStyle}>{sym}</td>
            <td style={{ ...tdStyle, color: v.total_return_pct >= 0 ? "green" : "red" }}>{v.total_return_pct}%</td>
            <td style={tdStyle}>{v.volatility_pct}%</td>
            <td style={tdStyle}>{v.current_price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const inputStyle: React.CSSProperties = { padding: "0.4rem", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 13 };
const btnStyle: React.CSSProperties = { padding: "0.6rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 };
const thStyle: React.CSSProperties = { padding: "6px 10px", borderBottom: "2px solid #e2e8f0", textAlign: "left", background: "#f8fafc" };
const tdStyle: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #f1f5f9" };
