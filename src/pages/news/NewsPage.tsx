import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Video,
  ChevronDown,
  Sparkles,
  Search,
  Quote as QuoteIcon,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  selectActivePlan,
  selectPlanSpec,
  selectSavingsBreakdown,
} from '../../store/selectors';
import { impactText } from '../../engine/impact';
import { inr } from '../../engine/format';
import { liveNewsProvider } from '../../data/providers';
import { BOOKS, bookSearchUrl } from '../../data/books';
import { LEARN_TOPICS, MOTIVATION_TOPICS, youtubeSearchUrl } from '../../data/videos';
import { TAGLINES } from '../../data/taglines';
import { GLOSSARY } from '../../data/glossary';
import { ScrollReveal } from '../../components/ui/ScrollReveal';

export const NewsPage: React.FC = () => {
  const activePlan = useStore(selectActivePlan);
  const spec = useStore(selectPlanSpec);
  const savings = useStore(selectSavingsBreakdown);

  const [openGlossaryTerm, setOpenGlossaryTerm] = useState<string | null>('SIP');

  // Load news snapshot from provider
  const newsSnapshot = useMemo(() => liveNewsProvider.getSnapshot(new Date()), []);
  const todayItems = newsSnapshot.items.slice(0, 5);
  const upcomingThemes = newsSnapshot.themes.slice(0, 3);

  // Impact context for live calculations
  const impactCtx = useMemo(() => {
    return {
      spec,
      savingsByBucket: savings.byBucket,
      panicBudget: activePlan.plan.panicBudget,
      remainingMonths: activePlan.goal.months,
    };
  }, [spec, savings.byBucket, activePlan]);

  // Section 3: "Because of what you are doing" suggestions
  const personalizedSuggestions = useMemo(() => {
    const list: string[] = [];
    const longPct = spec.allocation.long;
    const panic = activePlan.plan.panicBudget || 15000;

    if (longPct >= 50) {
      list.push(
        `Your plan allocates ${longPct}% to index funds, so market pullbacks matter more to you than to a pure bank saver. Your ${inr(panic)} panic budget is sized to keep you steady during bad years.`,
      );
    }
    if (spec.stepUpPct > 0) {
      list.push(
        `You have an active ${spec.stepUpPct}% annual step-up. As your pocket money or stipend grows, your contributions automatically accelerate compounding without extra decisions.`,
      );
    } else {
      list.push(
        `Your plan has a steady monthly contribution. Once your stipend or pocket money rises, consider setting a 5% to 10% annual step-up in Admin to shave years off your timeline.`,
      );
    }
    if (savings.byBucket.safe < 10000) {
      list.push(
        `Your safe cash cushion is currently ${inr(savings.byBucket.safe)}. Keeping at least ₹15,000 to ₹25,000 in your safe bucket prevents emergency expenses from ever disturbing your monthly SIP.`,
      );
    } else {
      list.push(
        `Your safe bucket currently holds ${inr(savings.byBucket.safe)}. This liquid reserve gives you the peace of mind to ignore day-to-day market volatility.`,
      );
    }
    return list;
  }, [spec, activePlan, savings]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
          News, Mechanics & Learning
        </h1>
        <p className="text-sm text-muted mt-1">
          Evergreen market fundamentals, tailored impact on your active plan numbers, and curated educational resources.
        </p>
      </div>

      {/* 1. Today in Markets */}
      <ScrollReveal>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Today in Markets (Mechanics)</h2>
              <p className="text-xs text-muted">
                Evergreen market dynamics with numbers computed directly from your live plan.
              </p>
            </div>
            <span className="text-xs text-muted">{newsSnapshot.updatedLabel}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayItems.map((item) => {
              const impactSentence = impactText(item.impact, item.affects, impactCtx);
              return (
                <div
                  key={item.id}
                  className="p-5 glass-card flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span className="font-semibold px-2 py-0.5 rounded bg-surface-2 text-ink uppercase tracking-wider">
                        {newsSnapshot.sourceLabel}
                      </span>
                      <span className="capitalize">{item.topic}</span>
                    </div>

                    <h3 className="font-display font-semibold text-base text-ink leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-muted leading-relaxed">{item.summary}</p>
                  </div>

                  {/* What this means for you (computed numbers) */}
                  <div className="p-3 rounded-ctl bg-surface-2/80 border border-line/60 text-xs space-y-1">
                    <div className="font-semibold text-accent flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3 h-3" />
                      <span>What this means for your plan</span>
                    </div>
                    <p className="text-ink leading-relaxed">{impactSentence}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* 2. What could change soon (Themes) */}
      <ScrollReveal delay={0.05}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">What Could Change Soon (Themes)</h2>
            <p className="text-xs text-muted">
              Macroeconomic themes and regulatory shifts to watch, framed around your plan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {upcomingThemes.map((th) => {
              const impactSentence = impactText(th.impact, th.affects, impactCtx);
              return (
                <div
                  key={th.id}
                  className="p-4 glass-card flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Upcoming Theme
                    </span>
                    <h4 className="font-semibold text-sm text-ink">{th.title}</h4>
                    <p className="text-xs text-muted leading-relaxed">{th.body}</p>
                  </div>

                  <div className="pt-2 border-t border-line/60 text-[11px] text-ink leading-relaxed">
                    <strong className="text-accent block mb-0.5">Plan effect:</strong>
                    {impactSentence}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* 3. Because of what you are doing */}
      <ScrollReveal delay={0.1}>
        <section className="p-5 glass-card space-y-3">
          <h2 className="text-base font-semibold text-ink">Because of What You Are Doing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {personalizedSuggestions.map((sug, i) => (
              <div key={i} className="p-3.5 rounded-ctl bg-surface-2/70 text-xs text-ink leading-relaxed border border-line/60">
                {sug}
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 4. Books Worth Reading */}
      <ScrollReveal delay={0.15}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Books Worth Reading</h2>
            <p className="text-xs text-muted">
              Curated personal finance and investing literature. Click "Find it" to open Google Books.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BOOKS.map((b) => (
              <div
                key={b.id}
                className="p-4 glass-card flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted font-medium">{b.level}</span>
                    {b.india && (
                      <span className="px-1.5 py-0.2 rounded bg-safe/10 text-safe font-semibold text-[10px]">
                        Indian Context
                      </span>
                    )}
                  </div>
                  <h4 className="font-display font-semibold text-base text-ink leading-tight">
                    {b.title}
                  </h4>
                  <div className="text-xs text-muted font-medium">— {b.author}</div>
                  <p className="text-xs text-ink/80 pt-1 leading-relaxed">{b.why}</p>
                </div>

                <div className="pt-2 border-t border-line/60">
                  <a
                    href={bookSearchUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find it on Google Books</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 5. Watch & Learn (Curated video topics) */}
      <ScrollReveal delay={0.2}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Watch and Learn</h2>
            <p className="text-xs text-muted">
              Curated financial concepts explained simply. Opens YouTube search results in a new tab.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LEARN_TOPICS.map((vt) => (
              <a
                key={vt.id}
                href={youtubeSearchUrl(vt.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-ctl glass-card hover:border-accent hover:bg-surface-2/40 transition-colors flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-ink group-hover:text-accent transition-colors flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>{vt.title}</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">{vt.blurb}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-accent shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* 6. Motivation & Rotating Taglines */}
      <ScrollReveal delay={0.25}>
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rotating Taglines List */}
          <div className="lg:col-span-2 p-5 glass-card space-y-3">
            <div className="flex items-center gap-2">
              <QuoteIcon className="w-4 h-4 text-accent" />
              <h3 className="font-semibold text-sm text-ink">Principles to Outlast the Market</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {TAGLINES.map((tl, i) => (
                <div key={i} className="p-3 rounded-ctl bg-surface-2/60 border border-line/60 text-ink italic">
                  "{tl}"
                </div>
              ))}
            </div>
          </div>

          {/* Motivational video tiles */}
          <div className="p-5 glass-card space-y-3">
            <h3 className="font-semibold text-sm text-ink">Mental Models to Watch</h3>
            <div className="space-y-2 text-xs">
              {MOTIVATION_TOPICS.map((mt) => (
                <a
                  key={mt.id}
                  href={youtubeSearchUrl(mt.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-ctl bg-surface-2/60 border border-line/60 hover:border-accent block transition-colors group"
                >
                  <div className="font-semibold text-ink group-hover:text-accent flex items-center justify-between">
                    <span>{mt.title}</span>
                    <ExternalLink className="w-3 h-3 text-muted" />
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">{mt.blurb}</div>
                </a>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* 7. Learn the Words (Glossary Accordion) */}
      <ScrollReveal delay={0.3}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Learn the Words (Glossary)</h2>
            <p className="text-xs text-muted">
              Key investing concepts explained in exactly two plain sentences each.
            </p>
          </div>

          <div className="glass-card divide-y divide-line overflow-hidden">
            {GLOSSARY.map((g) => {
              const isOpen = openGlossaryTerm === g.term;
              return (
                <div key={g.term}>
                  <button
                    type="button"
                    onClick={() => setOpenGlossaryTerm(isOpen ? null : g.term)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-2/40 transition-colors"
                  >
                  <span className="font-semibold text-sm text-ink">{g.term}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-accent' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-muted leading-relaxed">
                    {g.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      </ScrollReveal>
    </div>
  );
};
