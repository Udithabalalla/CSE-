import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMarketOverview } from "../api/data";
import type { MarketOverviewRow } from "../types";

type SortKey = keyof MarketOverviewRow;

export default function MarketOverviewPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data = [], isLoading } = useQuery({
    queryKey: ["market-overview"],
    queryFn: getMarketOverview,
    refetchInterval: 5 * 60 * 1000,
  });

  const sectors = useMemo(() => {
    const s = new Set(data.map((r) => r.sector).filter(Boolean));
    return ["All", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (sector !== "All") rows = rows.filter((r) => r.sector === sector);
    if (search) rows = rows.filter(
      (r) => r.symbol.toLowerCase().includes(search.toLowerCase()) ||
             r.name?.toLowerCase().includes(search.toLowerCase())
    );
    return [...rows].sort((a, b) => {
      const av = a[sortKey] as number | string ?? "";
      const bv = b[sortKey] as number | string ?? "";
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sector, search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };
  const setDir = setSortDir;

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  if (isLoading) return <div style={center}>Loading market data...</div>;

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Market Overview</h1>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />
          <select value={sector} onChange={(e) => setSector(e.target.value)} style={inputStyle}>
            {sectors.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: "0.75rem" }}>
        {filtered.length} stocks {sector !== "All" ? `in ${sector}` : ""}
      </div>

      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {(
                [
                  ["symbol", "Symbol"],
                  ["name", "Name"],
                  ["sector", "Sector"],
                  ["close", "Price (Rs.)"],
                  ["pct_change", "Change %"],
                  ["volume", "Volume"],
                  ["turnover", "Turnover"],
                  ["market_cap", "Mkt Cap"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{ ...th, cursor: "pointer", userSelect: "none" }}
                >
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
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ ...td, fontWeight: 700, color: "#2563eb" }}>{row.symbol}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name || "—"}</td>
                  <td style={td}>
                    {row.sector ? <span style={sectorBadge}>{row.sector}</span> : "—"}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{row.close?.toFixed(2) ?? "—"}</td>
                  <td style={{ ...td, fontWeight: 600, color: up ? "#22c55e" : "#ef4444" }}>
                    {row.pct_change != null
                      ? `${up ? "+" : ""}${row.pct_change.toFixed(2)}%`
                      : "—"}
                  </td>
                  <td style={td}>{row.volume != null ? Number(row.volume).toLocaleString() : "—"}</td>
                  <td style={td}>
                    {row.turnover != null ? `${(row.turnover / 1e6).toFixed(2)}M` : "—"}
                  </td>
                  <td style={td}>
                    {row.market_cap != null ? `${(row.market_cap / 1e9).toFixed(2)}B` : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No stocks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const center: React.CSSProperties = { display: "flex", justifyContent: "center", padding: "6rem", color: "#64748b" };
const inputStyle: React.CSSProperties = { padding: "0.45rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, minWidth: 180 };
const sectorBadge: React.CSSProperties = { background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 };
const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 12px" };
