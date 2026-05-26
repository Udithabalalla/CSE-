import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadData } from "../api/data";
import type { UploadResponse } from "../types";

const DATA_TYPES = [
  { value: "stocks", label: "Stock Data (OHLCV)" },
  { value: "indices", label: "Market Indices (ASPI, S&P SL20)" },
  { value: "macro", label: "Macroeconomic Indicators" },
];

export default function UploadPage() {
  const [dataType, setDataType] = useState("stocks");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    setFile(accepted[0] ?? null);
    setResult(null);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadData(file, dataType);
      setResult(res);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>Upload Data</h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontWeight: 500, display: "block", marginBottom: 6 }}>Data Type</label>
        <select value={dataType} onChange={(e) => setDataType(e.target.value)} style={selectStyle}>
          {DATA_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? "#2563eb" : "#cbd5e1"}`,
          borderRadius: 8, padding: "3rem", textAlign: "center", cursor: "pointer",
          background: isDragActive ? "#eff6ff" : "#f8fafc", marginBottom: "1.5rem",
        }}
      >
        <input {...getInputProps()} />
        {file ? (
          <p>{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
        ) : isDragActive ? (
          <p>Drop the file here...</p>
        ) : (
          <p>Drag & drop a CSV or XLSX file here, or click to select</p>
        )}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading} style={btnStyle}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 }}>
          <h3 style={{ color: "#166534" }}>{result.message}</h3>
          <p>Imported: <strong>{result.records_imported}</strong> | Failed: <strong>{result.failed_records}</strong></p>
          {result.errors.length > 0 && (
            <>
              <p style={{ fontWeight: 500, marginTop: "0.5rem" }}>Errors:</p>
              <ul style={{ maxHeight: 200, overflowY: "auto", fontSize: 13, color: "#dc2626" }}>
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = { padding: "0.5rem", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 14, width: "100%" };
const btnStyle: React.CSSProperties = { padding: "0.6rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 };
