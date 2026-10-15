import type { ImpactRule } from '../../engine/impact';
import type { Bucket, HoldingCategory } from '../../engine/types';

export type RiskTag = 'Very low' | 'Low' | 'Moderate' | 'High';

/** One entry in today's research snapshot. Categories only, never a named fund or brand. */
export interface MarketOpportunity {
  id: string;
  category: string; // e.g. "Liquid fund"
  holdingCategory: HoldingCategory;
  bucket: Bucket;
  rateRange: [number, number]; // illustrative % a year
  why: string; // one-line "why today"
  risk: RiskTag;
  newsTag: string; // links to a news topic id on the News page
}

export interface MarketSnapshot {
  dayKey: string;
  updatedLabel: string;
  isDemo: boolean;
  items: MarketOpportunity[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string; // two plain sentences, evergreen market mechanics
  affects: Bucket[];
  direction: 'up' | 'down' | 'mixed';
  impact: ImpactRule;
  topic: string; // matches MarketOpportunity.newsTag
}

export interface Theme {
  id: string;
  title: string;
  body: string;
  affects: Bucket[];
  impact: ImpactRule;
}

export interface NewsSnapshot {
  dayKey: string;
  updatedLabel: string;
  isDemo: boolean;
  sourceLabel: string;
  items: NewsItem[];
  themes: Theme[];
}

export type Regime = { kind: 'NORMAL' } | { kind: 'DRAWDOWN'; scenarioId: string };

export interface MarketProvider {
  getSnapshot(asOf: Date): MarketSnapshot;
  getRegime(asOf: Date): Regime;
}

export interface NewsProvider {
  getSnapshot(asOf: Date): NewsSnapshot;
}
