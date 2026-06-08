import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getStocks } from "../api/data";
import { generatePrediction, getPredictionStatus } from "../api/predictions";
import type { ModelType, PredictionResult } from "../types";

const MODELS: { value: ModelType; label: string; time: string }[] = [
  { value: "arima",         label: "ARIMA",                  time: "~5-10s" },
  { value: "random_forest", label: "Random Forest",          time: "~10-20s" },
  { value: "lstm",          label: "LSTM",                   time: "~30-60s" },
  { value: "hybrid",        label: "Hybrid (Recommended)",   time: "~45-90s" },
];

export default function PredictionsPage() {
  const [symbol, setSymbol] = useState("");
  const [model, setModel]   = useState<ModelType>("hybrid");
  const [forecastDays, setForecastDays] = useState(30);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const { data: stocks = [] } = useQuery({ queryKey: ["stocks"], queryFn: getStocks });

  const generateMutation = useMutation({
    mutationFn: generatePrediction,
    onSuccess: (data) => { setTaskId(data.task_id); setResult(null); },
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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">Predictions</h1>
      <div className="flex gap-6 flex-wrap lg:flex-nowrap">

        {/* Config panel */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="card p-5 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Stock Symbol</label>
              <select className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                <option value="">Select a stock...</option>
                {stocks.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Model</label>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <label key={m.value} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    model === m.value
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                  }`}>
                    <input
                      type="radio" value={m.value}
                      checked={model === m.value}
                      onChange={() => setModel(m.value)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{m.label}</span>
                    <span className="text-xs text-slate-400">{m.time}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Forecast: <span className="text-blue-600 dark:text-blue-400">{forecastDays} days</span>
              </label>
              <input
                type="range" min={1} max={90} value={forecastDays}
                onChange={(e) => setForecastDays(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1d</span><span>30d</span><span>90d</span>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={!symbol || isPending} className="btn-primary w-full py-2.5">
              {isPending ? "Generating..." : "Generate Forecast"}
            </button>

            {taskId && (
              <div className="px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm">
                Processing — polling every 3s...
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {generateMutation.isError && (
            <div className="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
              Failed to start prediction. Please try again.
            </div>
          )}
          {result
            ? <PredictionResults result={result} />
            : !isPending && (
              <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
                Select a stock and model, then click Generate Forecast
              </div>
            )
          }
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

  const recColor =
    insights?.recommendation === "buy"  ? "text-emerald-600 dark:text-emerald-400" :
    insights?.recommendation === "sell" ? "text-red-500" : "text-slate-500";
  const trendIcon = insights?.trend === "uptrend" ? "▲" : "▼";

  return (
    <div className="card p-5 space-y-5">
      <div>
        <h3 className="font-bold text-slate-900 dark:text-white">
          {result.symbol} — {result.model_used.toUpperCase()} Forecast
        </h3>
      </div>

      {insights && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Trend",         value: `${trendIcon} ${insights.trend}` },
            { label: "Recommendation",value: insights.recommendation.toUpperCase(), cls: recColor },
            { label: "Risk Level",    value: insights.risk_level },
            { label: "Price Change",  value: `${insights.price_change_pct > 0 ? "+" : ""}${insights.price_change_pct}%` },
          ].map((c) => (
            <div key={c.label} className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm">
              <span className="text-slate-400 mr-1">{c.label}:</span>
              <span className={`font-semibold ${c.cls ?? "text-slate-900 dark:text-white"}`}>{c.value}</span>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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

      <div>
        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">Accuracy Metrics</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(result.accuracy_metrics).map(([k, v]) => (
            <div key={k} className="stat-card px-4 py-2">
              <div className="text-xs text-slate-400">{k.toUpperCase()}</div>
              <div className="font-bold text-slate-900 dark:text-white">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
