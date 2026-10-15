import { format } from 'date-fns';
import { dayKey } from '../../engine/dates';
import { hashString, seededShuffle } from '../../engine/seed';
import { MARKET_ENTRIES } from '../market';
import { NEWS_ENTRIES, THEMES } from '../news';
import type { MarketProvider, MarketSnapshot, NewsProvider, NewsSnapshot, Regime } from './types';

export const demoMarketProvider: MarketProvider = {
  getSnapshot(asOf: Date): MarketSnapshot {
    const key = dayKey(asOf);
    const seed = hashString(key);
    const shuffled = seededShuffle(MARKET_ENTRIES, seed);
    const dateFormatted = format(asOf, 'dd MMM yyyy');
    return {
      dayKey: key,
      updatedLabel: `Updated ${dateFormatted} · Demo data`,
      isDemo: true,
      items: shuffled,
    };
  },
  getRegime(_asOf: Date): Regime {
    return { kind: 'NORMAL' };
  },
};

export const demoNewsProvider: NewsProvider = {
  getSnapshot(asOf: Date): NewsSnapshot {
    const key = dayKey(asOf);
    const seed = hashString(key + ':news');
    const shuffledNews = seededShuffle(NEWS_ENTRIES, seed);
    const shuffledThemes = seededShuffle(THEMES, seed);
    const dateFormatted = format(asOf, 'dd MMM yyyy');
    return {
      dayKey: key,
      updatedLabel: `Updated ${dateFormatted} · Demo data`,
      isDemo: true,
      sourceLabel: 'Demo feed',
      items: shuffledNews,
      themes: shuffledThemes,
    };
  },
};
