import client from "./client";
import type { PredictionRequest, PredictionStatus, PredictionRecord } from "../types";

export const generatePrediction = (body: PredictionRequest) =>
  client.post<{ task_id: string; status: string }>("/predictions/generate", body).then((r) => r.data);

export const getPredictionStatus = (taskId: string) =>
  client.get<PredictionStatus>(`/predictions/status/${taskId}`).then((r) => r.data);

export const getPredictionHistory = () =>
  client.get<PredictionRecord[]>("/predictions/history").then((r) => r.data);
