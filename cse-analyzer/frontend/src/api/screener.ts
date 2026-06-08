import client from "./client";

export interface ScreenerFilters {
  sector?: string;
  min_price?: number;
  max_price?: number;
  min_change_pct?: number;
  max_change_pct?: number;
  min_volume?: number;
  min_market_cap?: number;
  max_market_cap?: number;
  near_52w_high?: boolean;
  near_52w_low?: boolean;
  sort_by?: string;
  sort_dir?: number;
  limit?: number;
}

export interface ScreenerRow {
  symbol: string;
  name?: string;
  sector?: string;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  pct_change?: number;
  volume?: number;
  turnover?: number;
  market_cap?: number;
  high_52w?: number;
  low_52w?: number;
  date?: string;
}

export const runScreener = (filters: ScreenerFilters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  );
  return client.get<ScreenerRow[]>("/screener", { params }).then(r => r.data);
};

export const getScreenerSectors = () =>
  client.get<string[]>("/screener/sectors").then(r => r.data);
