import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { runScreener, getScreenerSectors, type ScreenerFilters, type ScreenerRow } from "../api/screener";

const SORT_OPTIONS = [
  { value: "symbol",     label: "Symbol" },
  { value: "pct_change", label: "% Change" },
  { value: "volume",     label: "Volume" },
  { value: "turnover",   label: "Turnover" },
  { value: "market_cap", label: "Market Cap" },
  { value: "close",      label: "Price" },
];

const PRESETS = [
  { label: "Top Gainers",   filters: { sort_by: "pct_change", sort_dir: -1 } },
  { label: "Top Losers",    filters: { sort_by: "pct_change", sort_dir: 1 } },
  { label: "Most Active",   filters: { sort_by: "volume", sort_dir: -1 } },
  { label: "Near 52W High", filters: { near_52w_high: true, sort_by: "pct_change", sort_dir: -1 } },
  { label: "Near 52W Low",  filters: { near_52w_low: true, sort_by: "pct_change", sort_dir: 1 } },
  { label: "Large Cap",     filters: { min_market_cap: 1e10, sort_by: "market_cap", sort_dir: -1 } },
];

const empty: ScreenerFilters = {
  sort_by: "symbol", sort_dir: 1, limit: 200,
};

export default function ScreenerPage() {
  const navigate   = useNavigate();
  const [filters, setFilters] = useState<ScreenerFilters>(empty);
  const [applied,  setApplied] = useState<ScreenerFilters>(empty);

  const { data: sectors = [] } = useQuery({
    queryKey: ["screener-sectors"],
    queryFn: getScreenerSectors,
  });

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ["screener", applied],
    queryFn: () => runScreener(applied),
    staleTime: 2 * 60_000,
  });

  const set = (k: keyof ScreenerFilters, v: unknown) =>
    setFilters(f => ({ ...f, [k]: v === "" ? undefined : v }));

  const applyPreset = (preset: Partial<ScreenerFilters>) =>
    setApplied({ ...empty, ...preset });

  const handleRun = () => setApplied({ ...filters });

  const handleReset = () => { setFilters(empty); setApplied(empty); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Screener</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Filter {results.length} stocks by price, change, volume and more
        </p>
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.filters)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

          {/* Sector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Sector</label>
            <select className="input" value={filters.sector ?? ""} onChange={e => set("sector", e.target.value)}>
              <option value="">All sectors</option>
              {sectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Price range */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Min Price (Rs.)</label>
            <input type="number" className="input" placeholder="0" min={0}
              value={filters.min_price ?? ""} onChange={e => set("min_price", e.target.value ? +e.target.value : undefined)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Max Price (Rs.)</label>
            <input type="number" className="input" placeholder="∞" min={0}
              value={filters.max_price ?? ""} onChange={e => set("max_price", e.target.value ? +e.target.value : undefined)} />
          </div>

          {/* Change % */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Min Change %</label>
            <input type="number" className="input" placeholder="-100" step={0.1}
              value={filters.min_change_pct ?? ""} onChange={e => set("min_change_pct", e.target.value ? +e.target.value : undefined)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Max Change %</label>
            <input type="number" className="input" placeholder="100" step={0.1}
              value={filters.max_change_pct ?? ""} onChange={e => set("max_change_pct", e.target.value ? +e.target.value : undefined)} />
          </div>

          {/* Volume */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Min Volume</label>
            <input type="number" className="input" placeholder="0" min={0}
              value={filters.min_volume ?? ""} onChange={e => set("min_volume", e.target.value ? +e.target.value : undefined)} />
          </div>

          {/* Market cap */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Min Mkt Cap (Rs.)</label>
            <input type="number" className="input" placeholder="0" min={0}
              value={filters.min_market_cap ?? ""} onChange={e => set("min_market_cap", e.target.value ? +e.target.value : undefined)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Max Mkt Cap (Rs.)</label>
            <input type="number" className="input" placeholder="∞" min={0}
              value={filters.max_market_cap ?? ""} onChange={e => set("max_market_cap", e.target.value ? +e.target.value : undefined)} />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Sort By</label>
            <select className="input" value={filters.sort_by ?? "symbol"} onChange={e => set("sort_by", e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Direction</label>
            <select className="input" value={filters.sort_dir ?? 1} onChange={e => set("sort_dir", +e.target.value)}>
              <option value={1}>Ascending ▲</option>
              <option value={-1}>Descending ▼</option>
            </select>
          </div>
        </div>

        {/* Toggles + actions */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          <Toggle label="Near 52W High (within 5%)" checked={!!filters.near_52w_high}
            onChange={v => set("near_52w_high", v || undefined)} />
          <Toggle label="Near 52W Low (within 5%)"  checked={!!filters.near_52w_low}
            onChange={v => set("near_52w_low", v || undefined)} />
          <div className="flex gap-2 ml-auto">
            <button onClick={handleReset}  className="btn-secondary">Reset</button>
            <button onClick={handleRun}    className="btn-primary">
              {isFetching ? "Screening..." : "Run Screen"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          {isLoading ? "Loading..." : `${results.length} stocks matched`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {["Symbol", "Name", "Sector", "Price", "Change %", "Volume", "Turnover", "Mkt Cap", "52W High", "52W Low"].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row: ScreenerRow) => {
                const up = (row.pct_change ?? 0) >= 0;
                return (
                  <tr key={row.symbol} onClick={() => navigate(`/stocks/${row.symbol}`)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer">
                    <td className="td font-bold text-blue-600 dark:text-blue-400">{row.symbol}</td>
                    <td className="td max-w-[150px] truncate text-slate-600 dark:text-slate-300">{row.name || "—"}</td>
                    <td className="td">
                      {row.sector
                        ? <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">{row.sector}</span>
                        : "—"}
                    </td>
                    <td className="td font-semibold">{row.close?.toFixed(2) ?? "—"}</td>
                    <td className={`td font-semibold ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {row.pct_change != null ? `${up ? "+" : ""}${row.pct_change.toFixed(2)}%` : "—"}
                    </td>
                    <td className="td text-slate-500">{row.volume != null ? Number(row.volume).toLocaleString() : "—"}</td>
                    <td className="td text-slate-500">{row.turnover != null ? `${(row.turnover / 1e6).toFixed(2)}M` : "—"}</td>
                    <td className="td text-slate-500">{row.market_cap != null ? `${(row.market_cap / 1e9).toFixed(2)}B` : "—"}</td>
                    <td className="td text-slate-400 text-xs">{row.high_52w?.toFixed(2) ?? "—"}</td>
                    <td className="td text-slate-400 text-xs">{row.low_52w?.toFixed(2)  ?? "—"}</td>
                  </tr>
                );
              })}
              {!isLoading && results.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    No stocks match the current filters
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </div>
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
    </label>
  );
}
