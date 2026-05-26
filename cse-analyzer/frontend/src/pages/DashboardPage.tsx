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

  if (isLoading) return <div style={center}>Loading dashboard...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Dashboard</h1>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="Stocks Tracked" value={data?.total_stocks ?? 0} />
        <StatCard label="Total Records" value={data?.total_records ?? 0} />
        <StatCard label="Sectors" value={data?.sectors.length ?? 0} />
        <StatCard
          label="Date Range"
          value={data?.date_range.start ? `${data.date_range.start} — ${data.date_range.end}` : "N/A"}
        />
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        <Section title="Quick Actions">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <ActionBtn label="Upload Data" onClick={() => navigate("/upload")} />
            <ActionBtn label="Run Analysis" onClick={() => navigate("/analysis")} />
            <ActionBtn label="Generate Prediction" onClick={() => navigate("/predictions")} />
          </div>
        </Section>

        <Section title="Recent Analyses">
          {data?.recent_analyses.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Type", "Symbols", "Date"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_analyses.map((a, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{a.analysis_type}</td>
                    <td style={tdStyle}>{a.symbols?.join(", ")}</td>
                    <td style={tdStyle}>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#888" }}>No analyses yet</p>
          )}
        </Section>

        <Section title="Recent Predictions">
          {data?.recent_predictions.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Symbol", "Model", "Date"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recent_predictions.map((p, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{p.symbol}</td>
                    <td style={tdStyle}>{p.model_used}</td>
                    <td style={tdStyle}>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#888" }}>No predictions yet</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: "1rem 1.5rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, minWidth: 160 }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      <h3 style={{ marginBottom: "0.75rem" }}>{title}</h3>
      {children}
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "0.6rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
      {label}
    </button>
  );
}

const center: React.CSSProperties = { display: "flex", justifyContent: "center", padding: "4rem" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "6px 8px", borderBottom: "2px solid #e2e8f0", fontSize: 13 };
const tdStyle: React.CSSProperties = { padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
