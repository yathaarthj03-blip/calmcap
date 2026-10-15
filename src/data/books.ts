// Appendix B: Books worth reading

export interface Book {
  id: string;
  title: string;
  author: string;
  level: 'Beginner' | 'Beginner to intermediate' | 'Intermediate';
  why: string;
  india?: boolean;
}

export const BOOKS: Book[] = [
  {
    id: 'psychology-of-money',
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    level: 'Beginner',
    why: 'Explains why how you behave with money matters far more than how smart you are.',
  },
  {
    id: 'common-sense-investing',
    title: 'The Little Book of Common Sense Investing',
    author: 'John C. Bogle',
    level: 'Beginner',
    why: 'The classic case for owning the whole market through low-cost index funds.',
  },
  {
    id: 'lets-talk-money',
    title: "Let's Talk Money",
    author: 'Monika Halan',
    level: 'Beginner',
    why: 'A practical, honest system for managing personal finance in the Indian context.',
    india: true,
  },
  {
    id: 'i-will-teach-you',
    title: 'I Will Teach You to Be Rich',
    author: 'Ramit Sethi',
    level: 'Beginner',
    why: 'Shows how to automate your savings and investments so you stick to your plan without friction.',
  },
  {
    id: 'almanack-naval',
    title: 'The Almanack of Naval Ravikant',
    author: 'Eric Jorgenson',
    level: 'Beginner to intermediate',
    why: 'Clear thinking on building long-term wealth, judgment, and patience.',
  },
  {
    id: 'millionaire-next-door',
    title: 'The Millionaire Next Door',
    author: 'Thomas J. Stanley and William D. Danko',
    level: 'Intermediate',
    why: 'Reveals how ordinary savers build lasting wealth through quiet, consistent habits.',
  },
  {
    id: 'intelligent-investor',
    title: 'The Intelligent Investor',
    author: 'Benjamin Graham',
    level: 'Intermediate',
    why: 'The foundational guide on investor temperament, margin of safety, and emotional discipline.',
  },
  {
    id: 'random-walk',
    title: 'A Random Walk Down Wall Street',
    author: 'Burton Malkiel',
    level: 'Intermediate',
    why: 'A readable explanation of why beating the broad market is very hard, and why index funds work.',
  },
  {
    id: 'one-up-on-wall-street',
    title: 'One Up On Wall Street',
    author: 'Peter Lynch',
    level: 'Intermediate',
    why: 'Focuses on understanding what you own and keeping your investment logic simple.',
  },
  {
    id: 'richest-man-in-babylon',
    title: 'The Richest Man in Babylon',
    author: 'George S. Clason',
    level: 'Beginner',
    why: 'Timeless parables on paying yourself first and keeping expenses below what you earn.',
  },
  {
    id: 'principles',
    title: 'Principles',
    author: 'Ray Dalio',
    level: 'Intermediate',
    why: 'A thoughtful framework for making decisions, facing reality, and learning from mistakes.',
  },
];

export function bookSearchUrl(b: Book): string {
  return `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(`${b.title} ${b.author}`)}`;
}
