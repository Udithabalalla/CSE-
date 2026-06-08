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
  { value: "trend",             label: "Trend Analysis",      desc: "SMA, EMA, RSI, MACD, Bollinger Bands" },
  { value: "correlation",       label: "Correlation",         desc: "Cross-stock correlation heatmap" },
  { value: "risk",              label: "Risk Analysis",       desc: "Volatility, Sharpe, VaR, Max Drawdown" },
  { value: "sector_comparison", label: "Sector Comparison",   desc: "Compare performance across stocks" },
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
    setSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">Analysis</h1>
      <div className="flex gap-6 flex-wrap lg:flex-nowrap">

        {/* Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="card p-4 space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Analysis Type</h3>
            {ANALYSIS_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setSelectedType(t.value); setResult(null); setSymbols([]); }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                  selectedType === t.value
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <div className={`font-semibold text-sm ${selectedType === t.value ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>
                  {t.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>

          {selectedType && (
            <div className="card p-4 space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">
                  {selectedType === "trend" || selectedType === "risk" ? "Select Symbol" : "Select Symbols"}
                </h4>
                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg p-2 space-y-1">
                  {stocks.map((s) => (
                    <label key={s.symbol} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-sm">
                      <input
                        type={selectedType === "trend" || selectedType === "risk" ? "radio" : "checkbox"}
                        checked={symbols.includes(s.symbol)}
                        onChange={() => {
                          if (selectedType === "trend" || selectedType === "risk") setSymbols([s.symbol]);
                          else toggleSymbol(s.symbol);
                        }}
                        className="accent-blue-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300">{s.symbol}</span>
                    </label>
                  ))}
                  {!stocks.length && <p className="text-xs text-slate-400 px-2">No stocks uploaded yet</p>}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">Date Range</h4>
                <div className="flex flex-col gap-2">
                  <input type="date" className="input text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <input type="date" className="input text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {selectedType === "correlation" && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">Method</h4>
                  <div className="flex gap-3">
                    {["pearson", "spearman", "kendall"].map((m) => (
                      <label key={m} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="radio" value={m} checked={corrMethod === m} onChange={() => setCorrMethod(m)} className="accent-blue-600" />
                        <span className="text-slate-600 dark:text-slate-300 capitalize">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleRun}
                disabled={mutation.isPending || symbols.length === 0}
                className="btn-primary w-full"
              >
                {mutation.isPending ? "Running..." : "Run Analysis"}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {mutation.isPending && (
            <div className="card p-8 text-center text-slate-500 dark:text-slate-400">Analyzing...</div>
          )}
          {mutation.isError && (
            <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              Analysis failed. Please try again.
            </div>
          )}
          {result && <AnalysisResults result={result} />}
          {!result && !mutation.isPending && (
            <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
              Select an analysis type and symbols to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisResults({ result }: { result: AnalysisResponse }) {
  const d = result.data as Record<string, unknown>;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 dark:text-white capitalize">
          {result.analysis_type.replace("_", " ")} Results
        </h3>
        <span className="text-xs text-slate-400">{result.metadata.execution_time_ms}ms</span>
      </div>

      {result.warnings.map((w, i) => (
        <div key={i} className="px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 text-sm">
          {w}
        </div>
      ))}
      {result.recommendations.map((r, i) => (
        <div key={i} className="px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-sm">
          {r}
        </div>
      ))}

      {result.analysis_type === "trend"             && <TrendChart data={d} />}
      {result.analysis_type === "correlation"       && <CorrelationTable data={d} />}
      {result.analysis_type === "risk"              && <RiskMetrics data={d} />}
      {result.analysis_type === "sector_comparison" && <SectorTable data={d} />}
    </div>
  );
}

function TrendChart({ data }: { data: Record<string, unknown> }) {
  const prices = data.prices as { dates: string[]; close: number[] } | undefined;
  if (!prices) return null;
  const chartData = prices.dates.map((d, i) => ({ date: d, close: prices.close[i] }));
  const trend = data.trend_direction as string;
  const trendColor = trend === "bullish" ? "text-emerald-600" : trend === "bearish" ? "text-red-500" : "text-slate-400";

  return (
    <div>
      <p className="text-sm mb-3">
        Trend: <strong className={trendColor}>{trend}</strong>
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
  const matrix  = data.matrix  as number[][] | undefined;
  if (!symbols || !matrix) return null;

  const getColor = (v: number) => {
    const r = v < 0 ? 255 : Math.round(255 * (1 - v));
    const g = v > 0 ? 255 : Math.round(255 * (1 + v));
    return `rgb(${r},${g},150)`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="th" />
            {symbols.map((s) => <th key={s} className="th">{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={symbols[i]}>
              <td className="th font-semibold">{symbols[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{ background: getColor(v) }} className="px-2 py-1 text-center text-slate-900 text-xs">
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
    { label: "Mean Annual Return",  value: `${data.mean_annual_return_pct}%` },
    { label: "Sharpe Ratio",        value: String(data.sharpe_ratio) },
    { label: "Max Drawdown",        value: `${data.max_drawdown_pct}%` },
    { label: "VaR 95%",            value: `${data.var_95_pct}%` },
    { label: "CVaR 95%",           value: `${data.cvar_95_pct}%` },
    { label: "Beta",               value: data.beta != null ? String(data.beta) : "N/A" },
    { label: "Risk Level",         value: String(data.risk_level) },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="stat-card">
          <div className="text-xs text-slate-400">{m.label}</div>
          <div className="font-bold text-slate-900 dark:text-white text-base">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function SectorTable({ data }: { data: Record<string, unknown> }) {
  const comparison = data.comparison as
    Record<string, { total_return_pct: number; volatility_pct: number; current_price: number }>
    | undefined;
  if (!comparison) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {["Symbol", "Total Return %", "Volatility %", "Current Price"].map((h) => (
              <th key={h} className="th">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(comparison).map(([sym, v]) => (
            <tr key={sym} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <td className="td font-semibold text-blue-600 dark:text-blue-400">{sym}</td>
              <td className={`td font-medium ${v.total_return_pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {v.total_return_pct >= 0 ? "+" : ""}{v.total_return_pct}%
              </td>
              <td className="td text-slate-500">{v.volatility_pct}%</td>
              <td className="td text-slate-700 dark:text-slate-300">{v.current_price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
