import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getWatchlist, removeFromWatchlist } from "../api/watchlist";
import { getAspiHistory } from "../api/news";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: getWatchlist,
    refetchInterval: 5 * 60_000,
  });

  const { data: aspi = [] } = useQuery({
    queryKey: ["aspi", 365],
    queryFn: () => getAspiHistory(365),
  });

  const removeMut = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
  });

  // Normalize ASPI for chart (base 100)
  const aspiChart = (() => {
    if (!aspi.length) return [];
    const base = aspi[0].close;
    return aspi.map(r => ({
      date:  r.date,
      value: base ? +((r.close / base) * 100).toFixed(2) : 100,
    }));
  })();

  const aspiChange = aspiChart.length >= 2
    ? (aspiChart[aspiChart.length - 1].value - 100).toFixed(2)
    : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Watchlist</h1>

      {/* ASPI overview card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">ASPI — All Share Price Index</h2>
            <p className="text-xs text-slate-400 mt-0.5">Colombo Stock Exchange · 1-Year Performance (Base 100)</p>
          </div>
          {aspiChange !== null && (
            <span className={`text-lg font-bold ${+aspiChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {+aspiChange >= 0 ? "+" : ""}{aspiChange}%
            </span>
          )}
        </div>
        {aspiChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={aspiChart}>
              <defs>
                <linearGradient id="aspiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickCount={6} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Index"]} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#aspiGrad)" dot={false} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
            No ASPI data yet — trigger a scrape to populate index data
          </div>
        )}
      </div>

      {/* Watchlist table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">
            My Stocks <span className="text-slate-400 font-normal text-sm">({items.length})</span>
          </h2>
          <button onClick={() => navigate("/stocks")} className="btn-secondary text-xs">
            + Add stocks from Markets
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-slate-400">Your watchlist is empty.</p>
            <button onClick={() => navigate("/stocks")} className="btn-primary">
              Browse Markets
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Symbol", "Name", "Sector", "Price (Rs.)", "Change %", "Volume", "Mkt Cap", "Added", ""].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const up = (item.pct_change ?? 0) >= 0;
                  return (
                    <tr key={item.symbol}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group"
                      onClick={() => navigate(`/stocks/${item.symbol}`)}>
                      <td className="td font-bold text-blue-600 dark:text-blue-400">{item.symbol}</td>
                      <td className="td max-w-[160px] truncate text-slate-600 dark:text-slate-300">{item.name || "—"}</td>
                      <td className="td">
                        {item.sector
                          ? <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{item.sector}</span>
                          : "—"}
                      </td>
                      <td className="td font-semibold text-slate-900 dark:text-slate-100">
                        {item.close?.toFixed(2) ?? "—"}
                      </td>
                      <td className={`td font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {item.pct_change != null ? `${up ? "+" : ""}${item.pct_change.toFixed(2)}%` : "—"}
                      </td>
                      <td className="td text-slate-500">{item.volume != null ? Number(item.volume).toLocaleString() : "—"}</td>
                      <td className="td text-slate-500">
                        {item.market_cap != null ? `${(item.market_cap / 1e9).toFixed(2)}B` : "—"}
                      </td>
                      <td className="td text-slate-400 text-xs">
                        {item.added_at ? new Date(item.added_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="td" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => removeMut.mutate(item.symbol)}
                          disabled={removeMut.isPending}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-base px-2"
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
