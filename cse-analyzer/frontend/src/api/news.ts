import client from "./client";

export interface NewsItem {
  symbol?: string;
  company?: string;
  title: string;
  category: string;
  published_at: string;
  url?: string;
  type: string;
  source: string;
}

export const getNews = (params: { symbol?: string; category?: string; days?: number; limit?: number } = {}) =>
  client.get<NewsItem[]>("/news", { params }).then(r => r.data);

export const refreshNews = (days_back = 7) =>
  client.post("/news/refresh", null, { params: { days_back } }).then(r => r.data);

export const getNewsCategories = () =>
  client.get<string[]>("/news/categories").then(r => r.data);

export const getAspiHistory = (days = 365) =>
  client.get<{ date: string; close: number; volume: number }[]>(
    `/data/indices/aspi`, { params: { days } }
  ).then(r => r.data);
