import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../api/data";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboardSummary,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
      Loading dashboard...
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Stocks Tracked"  value={data?.total_stocks ?? 0} />
        <StatCard label="Total Records"   value={(data?.total_records ?? 0).toLocaleString()} />
        <StatCard label="Sectors"         value={data?.sectors.length ?? 0} />
        <StatCard
          label="Date Range"
          value={data?.date_range.start ? `${data.date_range.start} → ${data.date_range.end}` : "N/A"}
          small
        />
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Quick Actions</h3>
          <div className="flex flex-col gap-2">
            <ActionBtn label="📈  View Markets"        onClick={() => navigate("/stocks")} />
            <ActionBtn label="🔬  Run Analysis"        onClick={() => navigate("/analysis")} />
            <ActionBtn label="🤖  Generate Prediction" onClick={() => navigate("/predictions")} />
            <ActionBtn label="📂  Upload Data"         onClick={() => navigate("/upload")} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Analyses</h3>
          {data?.recent_analyses.length ? (
            <div className="space-y-2">
              {data.recent_analyses.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{a.analysis_type}</span>
                  <span className="text-slate-400 text-xs">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No analyses yet</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Predictions</h3>
          {data?.recent_predictions.length ? (
            <div className="space-y-2">
              {data.recent_predictions.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="font-medium text-blue-600 dark:text-blue-400">{p.symbol}</span>
                  <span className="text-slate-400 text-xs">{p.model_used}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No predictions yet</p>
          )}
        </div>
      </div>

      {/* Sectors */}
      {data?.sectors.length ? (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-3">Tracked Sectors</h3>
          <div className="flex flex-wrap gap-2">
            {data.sectors.map((s) => (
              <span key={s} className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="stat-card">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`font-bold text-slate-900 dark:text-white ${small ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-700"
    >
      {label}
    </button>
  );
}
