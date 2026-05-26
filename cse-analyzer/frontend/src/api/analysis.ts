import client from "./client";
import type { AnalysisRequest, AnalysisResponse, AnalysisRecord } from "../types";

export const runAnalysis = (body: AnalysisRequest) =>
  client.post<AnalysisResponse>("/analysis/run", body).then((r) => r.data);

export const getAnalysisHistory = () =>
  client.get<AnalysisRecord[]>("/analysis/history").then((r) => r.data);
