export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface StockSymbol {
  symbol: string;
  sector?: string;
  earliest_date?: string;
  latest_date?: string;
  record_count: number;
}

export interface UploadResponse {
  message: string;
  records_imported: number;
  failed_records: number;
  errors: string[];
}

export interface DashboardSummary {
  total_stocks: number;
  total_records: number;
  date_range: { start?: string; end?: string };
  sectors: string[];
  recent_analyses: AnalysisRecord[];
  recent_predictions: PredictionRecord[];
}

export type AnalysisType = "trend" | "correlation" | "risk" | "sector_comparison";
export type ModelType = "arima" | "random_forest" | "lstm" | "hybrid";

export interface AnalysisRequest {
  analysis_type: AnalysisType;
  symbols: string[];
  start_date: string;
  end_date: string;
  params?: Record<string, unknown>;
}

export interface AnalysisResponse {
  analysis_type: string;
  data: Record<string, unknown>;
  metadata: { execution_time_ms: number; symbols: string[] };
  warnings: string[];
  recommendations: string[];
}

export interface AnalysisRecord {
  analysis_type: string;
  symbols: string[];
  created_at: string;
}

export interface PredictionRequest {
  symbol: string;
  model_type: ModelType;
  forecast_days: number;
  include_confidence: boolean;
}

export interface PredictionStatus {
  task_id: string;
  status: "pending" | "processing" | "done" | "failed";
  result?: PredictionResult;
  error?: string;
}

export interface PredictionResult {
  symbol: string;
  model_used: string;
  forecast_dates: string[];
  predicted_prices: number[];
  upper_bound?: number[];
  lower_bound?: number[];
  accuracy_metrics: { mae: number; rmse: number; mape: number; r2_score: number };
  insights?: {
    trend: string;
    recommendation: string;
    risk_level: string;
    current_price: number;
    predicted_final_price: number;
    price_change_pct: number;
  };
  created_at: string;
}

export interface PredictionRecord {
  symbol: string;
  model_used: string;
  created_at: string;
}
