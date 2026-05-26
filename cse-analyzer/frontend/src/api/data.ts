import client from "./client";
import type { UploadResponse, StockSymbol, DashboardSummary } from "../types";

export const uploadData = (file: File, dataType: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("data_type", dataType);
  return client.post<UploadResponse>("/data/upload", form).then((r) => r.data);
};

export const getStocks = () =>
  client.get<StockSymbol[]>("/data/stocks").then((r) => r.data);

export const getDashboardSummary = () =>
  client.get<DashboardSummary>("/data/dashboard/summary").then((r) => r.data);
