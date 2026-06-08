import client from "./client";

export interface WatchlistItem {
  symbol: string;
  added_at: string;
  name?: string;
  sector?: string;
  close?: number;
  pct_change?: number;
  volume?: number;
  market_cap?: number;
  date?: string;
}

export const getWatchlist    = () => client.get<WatchlistItem[]>("/watchlist").then(r => r.data);
export const addToWatchlist  = (symbol: string) => client.post(`/watchlist/${symbol}`).then(r => r.data);
export const removeFromWatchlist = (symbol: string) => client.delete(`/watchlist/${symbol}`).then(r => r.data);
export const checkWatching   = (symbol: string) => client.get<{ watching: boolean }>(`/watchlist/check/${symbol}`).then(r => r.data);
