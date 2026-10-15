// Appendix C: Video topic tiles (each opens a YouTube search results URL)

export interface VideoTopic {
  id: string;
  title: string;
  blurb: string;
}

export const LEARN_TOPICS: VideoTopic[] = [
  { id: 'sip-simple', title: 'How a SIP works explained simply', blurb: 'Understand rupee cost averaging and regular investing.' },
  { id: 'index-fund', title: 'What is an index fund', blurb: 'How broad low-cost index funds work without fund manager bias.' },
  { id: 'compounding', title: 'Compound interest explained', blurb: 'Why starting in your twenties makes time do the heavy lifting.' },
  { id: 'emergency-fund', title: 'Emergency fund for beginners', blurb: 'How having a liquid cash cushion protects your investments from forced selling.' },
  { id: 'market-fall-recover', title: 'Why markets fall and recover', blurb: 'Historical market drawdowns and why patient investors stayed ahead.' },
  { id: 'buffett-patience', title: 'Warren Buffett on patience', blurb: 'The legendary investor on temperament and sitting through quiet periods.' },
  { id: 'munger-compounding', title: 'Charlie Munger on compounding', blurb: 'The golden rule of never interrupting compounding unnecessarily.' },
  { id: 'factsheet', title: 'How to read a mutual fund factsheet', blurb: 'Decode AUM, expense ratio, benchmark, and turnover in plain language.' },
  { id: 'inflation-savings', title: 'Inflation and your savings explained', blurb: 'Why leaving money in idle bank accounts slowly destroys purchasing power.' },
  { id: 'student-budget', title: 'How to build a budget as a student', blurb: 'Simple methods to manage pocket money, side income, and small monthly savings.' },
  { id: 'investing-india', title: 'Investing for beginners in India', blurb: 'A clean overview of savings accounts, fixed deposits, gold, and mutual funds.' },
];

export const MOTIVATION_TOPICS: VideoTopic[] = [
  { id: 'buffett-young', title: 'Warren Buffett advice for young people', blurb: 'Habits and mental models for building long-term financial independence.' },
  { id: 'dalio-principles', title: 'Ray Dalio principles explained', blurb: 'Embracing reality, learning from mistakes, and building systems that work.' },
  { id: 'habits-consistency', title: 'Stay consistent with money habits', blurb: 'Why small, boring, regular contributions outshine sporadic grand bets.' },
];

export function youtubeSearchUrl(topic: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}`;
}
