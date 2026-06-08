import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadData } from "../api/data";
import type { UploadResponse } from "../types";

const DATA_TYPES = [
  { value: "stocks",  label: "Stock Data (OHLCV)" },
  { value: "indices", label: "Market Indices (ASPI, S&P SL20)" },
  { value: "macro",   label: "Macroeconomic Indicators" },
];

export default function UploadPage() {
  const [dataType, setDataType] = useState("stocks");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState<UploadResponse | null>(null);
  const [error, setError]       = useState("");

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
      setResult(await uploadData(file, dataType));
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Data</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Import CSV or XLSX market data files</p>
      </div>

      {/* Data type selector */}
      <div className="card p-5 space-y-3">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Data Type</label>
        <div className="grid grid-cols-3 gap-2">
          {DATA_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setDataType(t.value)}
              className={`p-3 text-sm rounded-lg border-2 text-left transition-colors font-medium ${
                dataType === t.value
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">{isDragActive ? "📂" : "📁"}</div>
        {file ? (
          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
            <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-600 dark:text-blue-400 font-medium">Drop the file here</p>
        ) : (
          <div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Drag & drop a CSV or XLSX file</p>
            <p className="text-slate-400 text-sm mt-1">or click to browse — max 50 MB</p>
          </div>
        )}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full py-3">
          {uploading ? "Uploading..." : `Upload ${file.name}`}
        </button>
      )}

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="card p-5 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10">
          <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">{result.message}</h3>
          <div className="flex gap-6 text-sm">
            <div><span className="text-slate-500">Imported</span> <strong className="text-slate-900 dark:text-white">{result.records_imported}</strong></div>
            <div><span className="text-slate-500">Failed</span> <strong className="text-red-500">{result.failed_records}</strong></div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Errors:</p>
              <ul className="max-h-40 overflow-y-auto text-xs text-red-500 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
