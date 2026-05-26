import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getStocks } from "../api/data";
import { generatePrediction, getPredictionStatus } from "../api/predictions";
import type { ModelType, PredictionResult } from "../types";

const MODELS: { value: ModelType; label: string; time: string }[] = [
  { value: "arima", label: "ARIMA", time: "~5-10s" },
  { value: "random_forest", label: "Random Forest", time: "~10-20s" },
  { value: "lstm", label: "LSTM", time: "~30-60s" },
  { value: "hybrid", label: "Hybrid (Recommended)", time: "~45-90s" },
];

export default function PredictionsPage() {
  const [symbol, setSymbol] = useState("");
  const [model, setModel] = useState<ModelType>("hybrid");
  const [forecastDays, setForecastDays] = useState(30);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const { data: stocks = [] } = useQuery({ queryKey: ["stocks"], queryFn: getStocks });

  const generateMutation = useMutation({
    mutationFn: generatePrediction,
    onSuccess: (data) => {
      setTaskId(data.task_id);
      setResult(null);
    },
  });

  useQuery({
    queryKey: ["prediction-status", taskId],
    queryFn: () => getPredictionStatus(taskId!),
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 3000;
    },
    select: (data) => {
      if (data.status === "done" && data.result) {
        setResult(data.result as unknown as PredictionResult);
        setTaskId(null);
      }
      return data;
    },
  });

  const handleGenerate = () => {
    if (!symbol) return;
    generateMutation.mutate({ symbol, model_type: model, forecast_days: forecastDays, include_confidence: true });
  };

  const isPending = !!taskId || generateMutation.isPending;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Predictions</h1>
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 280, maxWidth: 320 }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>Stock Symbol</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={inputStyle}>
              <option value="">Select a stock...</option>
              {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>Model</label>
            {MODELS.map((m) => (
              <label key={m.value} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 13 }}>
                <input type="radio" value={m.value} checked={model === m.value} onChange={() => setModel(m.value)} />
                <span>{m.label}</span>
                <span style={{ color: "#94a3b8", marginLeft: "auto" }}>{m.time}</span>
              </label>
            ))}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontWeight: 500, display: "block", marginBottom: 4 }}>
              Forecast Period: <strong>{forecastDays} days</strong>
            </label>
            <input
              type="range" min={1} max={90} value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <button onClick={handleGenerate} disabled={!symbol || isPending} style={{ ...btnStyle, width: "100%" }}>
            {isPending ? "Generating..." : "Generate Forecast"}
          </button>

          {taskId && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#eff6ff", borderRadius: 6, fontSize: 13 }}>
              Processing... polling every 3s
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 300 }}>
          {generateMutation.isError && <p style={{ color: "red" }}>Failed to start prediction</p>}
          {result && <PredictionResults result={result} />}
        </div>
      </div>
    </div>
  );
}

function PredictionResults({ result }: { result: PredictionResult }) {
  const insights = result.insights;
  const chartData = result.forecast_dates.map((d, i) => ({
    date: d,
    predicted: result.predicted_prices[i],
    upper: result.upper_bound?.[i],
    lower: result.lower_bound?.[i],
  }));

  const recColor = insights?.recommendation === "buy" ? "green" : insights?.recommendation === "sell" ? "red" : "#64748b";
  const trendIcon = insights?.trend === "uptrend" ? "▲" : "▼";

  return (
    <div>
      <h3>{result.symbol} — {result.model_used.toUpperCase()} Forecast</h3>

      {insights && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <Chip label="Trend" value={`${trendIcon} ${insights.trend}`} />
          <Chip label="Recommendation" value={insights.recommendation.toUpperCase()} color={recColor} />
          <Chip label="Risk Level" value={insights.risk_level} />
          <Chip label="Price Change" value={`${insights.price_change_pct > 0 ? "+" : ""}${insights.price_change_pct}%`} />
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickCount={6} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="predicted" stroke="#2563eb" dot={false} name="Forecast" strokeDasharray="5 5" />
          {result.upper_bound && (
            <Line type="monotone" dataKey="upper" stroke="#93c5fd" dot={false} name="Upper 95%" strokeDasharray="3 3" />
          )}
          {result.lower_bound && (
            <Line type="monotone" dataKey="lower" stroke="#93c5fd" dot={false} name="Lower 95%" strokeDasharray="3 3" />
          )}
        </LineChart>
      </ResponsiveContainer>

      <h4 style={{ marginTop: "1.5rem" }}>Accuracy Metrics</h4>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {Object.entries(result.accuracy_metrics).map(([k, v]) => (
          <div key={k} style={{ padding: "0.6rem 1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>{k.toUpperCase()}</div>
            <div style={{ fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, value, color = "#1e293b" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "0.5rem 1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 20 }}>
      <span style={{ fontSize: 11, color: "#94a3b8" }}>{label}: </span>
      <span style={{ fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 14, width: "100%" };
const btnStyle: React.CSSProperties = { padding: "0.6rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 };
