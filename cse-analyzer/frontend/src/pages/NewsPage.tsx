import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNews, refreshNews, getNewsCategories, type NewsItem } from "../api/news";

const TYPE_ICONS: Record<string, string> = {
  announcement:   "📋",
  market_news:    "📰",
  dividend:       "💰",
  agm:            "🏛️",
  rights_issue:   "📜",
  trading_halt:   "🚫",
};

const DAYS_OPTIONS = [
  { label: "Today",   value: 1 },
  { label: "7 days",  value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function NewsPage() {
  const qc = useQueryClient();
  const [symbol,   setSymbol]   = useState("");
  const [category, setCategory] = useState("");
  const [days,     setDays]     = useState(7);

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["news", symbol, category, days],
    queryFn: () => getNews({ symbol: symbol || undefined, category: category || undefined, days, limit: 100 }),
    refetchInterval: 5 * 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["news-categories"],
    queryFn: getNewsCategories,
  });

  const refreshMut = useMutation({
    mutationFn: () => refreshNews(days),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["news"] }), 2000);
    },
  });

  const grouped = groupByDate(news);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">News & Announcements</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            CSE company announcements and market news
          </p>
        </div>
        <button
          onClick={() => refreshMut.mutate()}
          disabled={refreshMut.isPending}
          className="btn-secondary gap-2"
        >
          {refreshMut.isPending ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {refreshMut.isSuccess && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-sm">
          News refresh started — results will appear shortly.
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Symbol</label>
          <input className="input" placeholder="e.g. JKH" value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</label>
          <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Period</label>
          <div className="flex gap-1">
            {DAYS_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setDays(o.value)}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                  days === o.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* News feed */}
      {isLoading ? (
        <div className="card p-8 text-center text-slate-400">Loading news...</div>
      ) : news.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <p className="text-slate-400">No news found for this period.</p>
          <p className="text-slate-400 text-sm">Click Refresh to fetch the latest announcements from CSE.</p>
          <button onClick={() => refreshMut.mutate()} className="btn-primary">
            Fetch News Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <NewsCard key={i} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const icon = TYPE_ICONS[item.category] || TYPE_ICONS[item.type] || "📄";
  const time = new Date(item.published_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {item.symbol && (
              <span className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold">
                {item.symbol}
              </span>
            )}
            <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs capitalize">
              {item.category.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-slate-400 ml-auto">{time}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
          {item.company && (
            <p className="text-xs text-slate-400 mt-0.5">{item.company}</p>
          )}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
              View document →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(items: NewsItem[]): Record<string, NewsItem[]> {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const groups: Record<string, NewsItem[]> = {};

  for (const item of items) {
    const d = new Date(item.published_at).toDateString();
    const label = d === today ? "Today" : d === yesterday ? "Yesterday"
      : new Date(item.published_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  }
  return groups;
}
