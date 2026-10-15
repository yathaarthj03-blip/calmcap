import { demoMarketProvider, demoNewsProvider } from './demoProvider';
import type { MarketProvider, NewsProvider, NewsSnapshot } from './types';

let cachedRealNews: NewsSnapshot | null = null;
let lastFetchDate = '';

async function fetchRealNews(url: string, asOf: Date): Promise<NewsSnapshot | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    if (json && Array.isArray(json.items) && Array.isArray(json.themes)) {
      return {
        ...demoNewsProvider.getSnapshot(asOf),
        items: json.items,
        themes: json.themes,
        isDemo: true, // honest labeling
      };
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export const liveMarketProvider: MarketProvider = demoMarketProvider;

export const liveNewsProvider: NewsProvider = {
  getSnapshot(asOf: Date): NewsSnapshot {
    const fallback = demoNewsProvider.getSnapshot(asOf);
    const feedUrl = import.meta.env.VITE_NEWS_FEED_URL;
    if (!feedUrl) return fallback;

    const todayStr = fallback.dayKey;
    if (cachedRealNews && lastFetchDate === todayStr) {
      return cachedRealNews;
    }

    // Trigger async refresh in background, return fallback immediately
    fetchRealNews(feedUrl, asOf).then((result) => {
      if (result) {
        cachedRealNews = result;
        lastFetchDate = todayStr;
      }
    });

    return fallback;
  },
};
