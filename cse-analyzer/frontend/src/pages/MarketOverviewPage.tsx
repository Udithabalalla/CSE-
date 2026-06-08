import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMarketOverview } from "../api/data";
import type { MarketOverviewRow } from "../types";

type SortKey = keyof MarketOverviewRow;

const COLUMNS: [SortKey, string][] = [
  ["symbol",     "Symbol"],
  ["name",       "Name"],
  ["sector",     "Sector"],
  ["close",      "Price (Rs.)"],
  ["pct_change", "Change %"],
  ["volume",     "Volume"],
  ["turnover",   "Turnover"],
  ["market_cap", "Mkt Cap"],
];

export default function MarketOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [sector, setSector]   = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data = [], isLoading } = useQuery({
    queryKey: ["market-overview"],
    queryFn: getMarketOverview,
    refetchInterval: 5 * 60 * 1000,
  });

  const sectors = useMemo(() => {
    const s = new Set(data.map((r) => r.sector).filter(Boolean) as string[]);
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (sector !== "All") rows = rows.filter((r) => r.sector === sector);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.symbol.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = (a[sortKey] as number | string) ?? "";
      const bv = (b[sortKey] as number | string) ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sector, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? " ↕" : sortDir === "asc" ? " ▲" : " ▼";

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
      Loading market data...
    </div>
  );

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Markets</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {filtered.length} stocks {sector !== "All" ? `· ${sector}` : ""}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            className="input w-56"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-44"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {sectors.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {COLUMNS.map(([key, label]) => (
                  <th key={key} className="th" onClick={() => handleSort(key)}>
                    {label}{sortIcon(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const up = (row.pct_change ?? 0) >= 0;
                return (
                  <tr
                    key={row.symbol}
                    onClick={() => navigate(`/stocks/${row.symbol}`)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                  >
                    <td className="td font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700">
                      {row.symbol}
                    </td>
                    <td className="td max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                      {row.name || "—"}
                    </td>
                    <td className="td">
                      {row.sector
                        ? <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{row.sector}</span>
                        : "—"}
                    </td>
                    <td className="td font-semibold text-slate-900 dark:text-slate-100">
                      {row.close?.toFixed(2) ?? "—"}
                    </td>
                    <td className={`td font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                      {row.pct_change != null ? `${up ? "+" : ""}${row.pct_change.toFixed(2)}%` : "—"}
                    </td>
                    <td className="td text-slate-500 dark:text-slate-400">
                      {row.volume != null ? Number(row.volume).toLocaleString() : "—"}
                    </td>
                    <td className="td text-slate-500 dark:text-slate-400">
                      {row.turnover != null ? `${(row.turnover / 1e6).toFixed(2)}M` : "—"}
                    </td>
                    <td className="td text-slate-500 dark:text-slate-400">
                      {row.market_cap != null ? `${(row.market_cap / 1e9).toFixed(2)}B` : "—"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No stocks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
