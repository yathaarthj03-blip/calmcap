// Pure engine module: Education-driven career to-dos, internships, and freelance roadmap.
// No React, no Date.now(), pure functions with optional asOf: Date.

import { monthsToGoal } from './finance';
import type { CareerTrack, EducationProfile } from './types';

export type CareerCategory = 'JOB_PREP' | 'INTERNSHIPS' | 'FREELANCE' | 'SKILLS';

export interface CareerTaskTemplate {
  id: string;
  title: string;
  category: CareerCategory;
  description: string;
  checklist: string[];
  marketContext: string;
  estMonthlyEarningRupees: number; // Potential income boost
  recommendedStage: string; // e.g. "Next 2 weeks", "Summer season"
}

export interface CareerTrackInfo {
  track: CareerTrack;
  label: string;
  description: string;
  primaryMarketPlatforms: string[];
  suggestedTasks: CareerTaskTemplate[];
}

export const CAREER_TRACKS_CATALOG: Record<CareerTrack, CareerTrackInfo> = {
  TECH_SOFTWARE: {
    track: 'TECH_SOFTWARE',
    label: 'Tech & Software Engineering',
    description: 'Software development, full-stack web, cloud, and data engineering pathways.',
    primaryMarketPlatforms: ['Wellfound (AngelList)', 'Internshala', 'GitHub', 'LinkedIn Jobs'],
    suggestedTasks: [
      {
        id: 'tech-prep-1',
        title: 'Master 15 Essential Coding Patterns & DSA Fundamentals',
        category: 'JOB_PREP',
        description: 'Complete core data structure patterns (Sliding Window, Two Pointers, BFS/DFS, Binary Search) commonly tested in campus and startup technical rounds.',
        checklist: [
          'Solve 3 problems on Two Pointers and Sliding Window',
          'Implement Depth-First Search (DFS) on trees and graphs',
          'Solve 5 medium-difficulty string manipulation problems',
          'Conduct 1 timed mock coding interview on Pramp or with a classmate',
        ],
        marketContext: 'Indian tech startups prioritize problem-solving fundamentals and clean code over memorized algorithm tricks during initial screening.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2–3 weeks',
      },
      {
        id: 'tech-intern-1',
        title: 'Apply for 10 Summer Software Internships on Wellfound & Internshala',
        category: 'INTERNSHIPS',
        description: 'Target growth-stage Indian tech startups with verified stipends between ₹15,000–₹35,000/month for 8–12 week summer roles.',
        checklist: [
          'Update GitHub profile with 2 pinned, deployed full-stack projects',
          'Tailor single-page ATS-compliant resume highlighting React and Node/Python skills',
          'Submit 5 applications on Wellfound with personalized founder/lead cover notes',
          'Reach out to 3 university alumni working at target software companies on LinkedIn',
        ],
        marketContext: 'Summer tech internship hiring in India peaks between November and March. Early applicants receive over 3x the interview callback rate.',
        estMonthlyEarningRupees: 20000,
        recommendedStage: 'Immediate (Next 7 days)',
      },
      {
        id: 'tech-free-1',
        title: 'Launch a Paid Campus Freelance Web Development Service',
        category: 'FREELANCE',
        description: 'Offer website building, redesign, or script automation for local neighborhood retailers, campus student societies, or small businesses.',
        checklist: [
          'Create a 1-page digital portfolio showcasing 2 sample responsive business websites',
          'Identify 5 local coaching centers, cafes, or student clubs that need an updated website',
          'Pitch a lightweight fixed-price website package (₹8,000–₹15,000 per site)',
          'Deliver first client project with mobile responsiveness and Google Business profile setup',
        ],
        marketContext: 'Local Indian MSMEs and retail services eagerly pay ₹10,000–₹25,000 to students for modern landing pages and fast WhatsApp ordering integrations.',
        estMonthlyEarningRupees: 12000,
        recommendedStage: 'This month',
      },
      {
        id: 'tech-skills-1',
        title: 'Deploy a Full-Stack Project with Authentication & Database',
        category: 'SKILLS',
        description: 'Build a production-grade application (e.g. personal finance tracker, peer-to-peer campus marketplace, or note-sharing hub).',
        checklist: [
          'Setup clean database schema (PostgreSQL or MongoDB)',
          'Implement secure user authentication (JWT or OAuth)',
          'Deploy frontend to Vercel/Netlify and backend to Render/Fly.io',
          'Add a descriptive README with architecture diagram and live demo link',
        ],
        marketContext: 'Interviewers look for evidence that a student can independently take an application from idea to a live, working URL.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 3 weeks',
      },
    ],
  },
  FINANCE_COMMERCE: {
    track: 'FINANCE_COMMERCE',
    label: 'Finance, Banking & Accounting',
    description: 'Equity research, financial modeling, accounting, corporate finance, and banking.',
    primaryMarketPlatforms: ['LinkedIn Jobs', 'NISM Exam Portal', 'Internshala', 'Alumni Network'],
    suggestedTasks: [
      {
        id: 'fin-prep-1',
        title: 'Complete 3-Statement Financial Modeling & Valuation Model',
        category: 'JOB_PREP',
        description: 'Build a comprehensive dynamic financial model in Microsoft Excel projecting income statement, balance sheet, and cash flow for an Indian listed company.',
        checklist: [
          'Download past 5 years annual reports (10-K / Annual Filings) of a Nifty 50 firm',
          'Construct historical balance sheet, P&L, and cash flow schedules in Excel',
          'Forecast revenue growth, working capital ratios, and capital expenditures for 3 years',
          'Calculate discounted cash flow (DCF) intrinsic equity valuation and sensitivity table',
        ],
        marketContext: 'Boutique investment banks, mutual fund AMCs, and equity research desks test practical Excel modeling above theoretical textbook knowledge.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2–3 weeks',
      },
      {
        id: 'fin-intern-1',
        title: 'Apply for Financial Analyst & Equity Research Internships',
        category: 'INTERNSHIPS',
        description: 'Target equity advisory firms, wealth management practices, and fintech startups for summer analyst and research internships.',
        checklist: [
          'Draft a 2-page initiation research note on an Indian mid-cap company',
          'Polish resume highlighting financial modeling skills, Excel shortcuts, and accounting coursework',
          'Apply to 8 financial advisory boutique openings on LinkedIn and Internshala',
          'Connect with 5 chartered accountants or research analysts on LinkedIn with your sample model',
        ],
        marketContext: 'Indian wealth management and equity research firms actively recruit commerce and finance students who can analyze company disclosures.',
        estMonthlyEarningRupees: 15000,
        recommendedStage: 'Immediate (Next 7 days)',
      },
      {
        id: 'fin-free-1',
        title: 'Offer Bookkeeping & GST Filing Assistance for Local Businesses',
        category: 'FREELANCE',
        description: 'Provide basic monthly bookkeeping, invoice reconciliation, and tax documentation preparation for local shops or campus startups using Tally or Zoho Books.',
        checklist: [
          'Review practical Tally Prime and Zoho Books bookkeeping workflows',
          'Approach 3 local retail stores or family businesses to organize their monthly expense ledgers',
          'Agree on a ₹4,000–₹8,000 monthly retainer for organizing receipts and bank reconciliations',
          'Produce clean monthly profit-and-loss summaries for the shop owners',
        ],
        marketContext: 'Over 60 million Indian small businesses need reliable student bookkeepers to keep their transaction records updated for quarterly GST filings.',
        estMonthlyEarningRupees: 8000,
        recommendedStage: 'This month',
      },
      {
        id: 'fin-skills-1',
        title: 'Prepare for NISM Series VIII or XV Certification Exam',
        category: 'SKILLS',
        description: 'Obtain an official regulatory certification from the National Institute of Securities Markets (SEBI recognized).',
        checklist: [
          'Register for NISM Series XV (Research Analyst) or Series VIII (Equity Derivatives)',
          'Complete 2 full mock test papers from the NISM workbook',
          'Review key regulations on insider trading, research disclosure standards, and derivative margins',
          'Pass the certification and feature the credential prominently on LinkedIn',
        ],
        marketContext: 'NISM certifications are formally recognized across the Indian securities industry and give student applicants an immediate credential edge.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 4 weeks',
      },
    ],
  },
  BUSINESS_MARKETING: {
    track: 'BUSINESS_MARKETING',
    label: 'Business, Marketing & Operations',
    description: 'Growth marketing, product operations, sales development, and brand strategy.',
    primaryMarketPlatforms: ['LinkedIn Jobs', 'Internshala', 'Twitter/X Tech Community', 'Wellfound'],
    suggestedTasks: [
      {
        id: 'biz-prep-1',
        title: 'Build a Data-Driven Growth Marketing Campaign Deck',
        category: 'JOB_PREP',
        description: 'Create a hypothetical user acquisition campaign for an Indian consumer app analyzing funnel metrics, CAC, and retention tactics.',
        checklist: [
          'Choose an Indian startup (e.g. in edtech, fintech, or quick commerce)',
          'Audit their current digital marketing presence across Instagram, Google, and LinkedIn',
          'Design 3 creative campaign concepts with estimated cost-per-click and conversion rates',
          'Compile into a 10-slide polished presentation showcasing analytical problem solving',
        ],
        marketContext: 'Startups value candidates who understand unit economics (CAC, LTV) over generic social media vanity metrics.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2 weeks',
      },
      {
        id: 'biz-intern-1',
        title: 'Apply for Growth Marketing & Operations Internships',
        category: 'INTERNSHIPS',
        description: 'Target D2C brands, B2B SaaS companies, and consumer startups for marketing and sales development internships.',
        checklist: [
          'Apply to 10 growth and operations roles on Wellfound and Internshala',
          'Send your campaign audit deck directly to founders or marketing leads via email',
          'Prepare for interview questions on A/B testing, user acquisition funnels, and retention',
        ],
        marketContext: 'Indian D2C and consumer startups maintain year-round intern pipelines with stipends ranging from ₹10,000–₹25,000/month.',
        estMonthlyEarningRupees: 14000,
        recommendedStage: 'Immediate (Next 7 days)',
      },
      {
        id: 'biz-free-1',
        title: 'Manage Social Media & Paid Ad Campaigns for Local Brands',
        category: 'FREELANCE',
        description: 'Handle Instagram content scheduling, customer response management, and local Meta ads for local clinics, cafes, or boutiques.',
        checklist: [
          'Set up Meta Business Suite and Canva Pro design templates',
          'Pitch a monthly content management package (12 posts + reels + ad monitoring) for ₹6,000–₹12,000',
          'Run a ₹500 test geo-targeted Instagram ad campaign for a local store to prove footfall gain',
        ],
        marketContext: 'Local businesses struggle with consistent social media posting and happily pay ₹8,000–₹15,000/month for reliable student assistance.',
        estMonthlyEarningRupees: 10000,
        recommendedStage: 'This month',
      },
      {
        id: 'biz-skills-1',
        title: 'Complete Google Analytics 4 & Meta Ads Manager Certifications',
        category: 'SKILLS',
        description: 'Earn recognized free industry certifications that validate hands-on digital advertising and analytics competence.',
        checklist: [
          'Complete Google Skillshop Google Analytics 4 (GA4) certification course',
          'Complete Meta Blueprint digital marketing associate modules',
          'Add verified digital certificates to your LinkedIn licenses section',
        ],
        marketContext: 'Certified candidates stand out immediately among thousands of student applicants on internship platforms.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 3 weeks',
      },
    ],
  },
  DESIGN_CREATIVE: {
    track: 'DESIGN_CREATIVE',
    label: 'Design, UI/UX & Creative',
    description: 'Product design, UI/UX, visual design, and brand identity systems.',
    primaryMarketPlatforms: ['Behance', 'Dribbble', 'LinkedIn', 'Figma Community'],
    suggestedTasks: [
      {
        id: 'des-prep-1',
        title: 'Build & Publish 2 Detailed UI/UX Case Studies on Behance',
        category: 'JOB_PREP',
        description: 'Design mobile and desktop product case studies documenting problem statement, user research, wireframes, and high-fidelity Figma prototypes.',
        checklist: [
          'Redesign a broken everyday user flow (e.g. railway ticketing or college course registration)',
          'Create high-fidelity screens using auto-layout, design tokens, and components',
          'Document user persona, friction points, and before/after usability comparisons',
          'Publish formatted project presentation on Behance and Dribbble',
        ],
        marketContext: 'Design hiring in tech companies is 95% portfolio-driven. Two outstanding, deeply explained case studies beat twenty superficial Dribbble shots.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2–3 weeks',
      },
      {
        id: 'des-intern-1',
        title: 'Apply for UI/UX & Product Design Internships',
        category: 'INTERNSHIPS',
        description: 'Apply to design agencies, software consultancies, and product tech companies for student design internships.',
        checklist: [
          'Create a clean 1-page Framer or Notion design portfolio with live Figma links',
          'Apply to 8 design internships on Wellfound and LinkedIn',
          'Engage with design leads on Twitter/X and LinkedIn by sharing thoughtful critiques of modern product updates',
        ],
        marketContext: 'Indian tech companies pay competitive design stipends (₹15,000–₹35,000/month) for interns with solid Figma component and prototyping skills.',
        estMonthlyEarningRupees: 18000,
        recommendedStage: 'Immediate (Next 7 days)',
      },
      {
        id: 'des-free-1',
        title: 'Offer Brand Identity & Landing Page Design for Early Startups',
        category: 'FREELANCE',
        description: 'Design logos, color palettes, social asset kits, and landing page wireframes for early-stage founders and campus projects.',
        checklist: [
          'Package a Startup Identity Starter Kit (Logo + Color tokens + Typography + Social templates) for ₹10,000',
          'Share design concept explorations on LinkedIn and Twitter tagging indie hackers',
          'Deliver design assets in organized Figma files with clear export specifications',
        ],
        marketContext: 'Indie founders and new businesses frequently hire freelance student designers for quick ₹10,000–₹25,000 visual identity kickstarts.',
        estMonthlyEarningRupees: 15000,
        recommendedStage: 'This month',
      },
      {
        id: 'des-skills-1',
        title: 'Master Figma Advanced Auto-Layout, Variables & Prototyping',
        category: 'SKILLS',
        description: 'Learn modern industry design workflows including component properties, responsive variants, and dark mode tokens.',
        checklist: [
          'Build an interactive 10-component design system in Figma using Variables for light and dark modes',
          'Create an interactive prototype with smart animate and micro-interactions',
          'Publish component system to Figma Community as a free resource to build organic discovery',
        ],
        marketContext: 'Figma proficiency and systematic thinking are the #1 screening criteria for junior product design roles.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2 weeks',
      },
    ],
  },
  GENERAL_CORPORATE: {
    track: 'GENERAL_CORPORATE',
    label: 'Corporate Careers & Applied Skills',
    description: 'Research, human resources, content writing, consulting, and project coordination.',
    primaryMarketPlatforms: ['LinkedIn Jobs', 'Internshala', 'University Career Cell'],
    suggestedTasks: [
      {
        id: 'gen-prep-1',
        title: 'Craft a Tailored Corporate Resume & LinkedIn Profile Overhaul',
        category: 'JOB_PREP',
        description: 'Restructure your resume using the Harvard/Wharton action-verb format with quantifiable impact metrics for corporate campus drives.',
        checklist: [
          'Rewrite bullet points using format: Accomplished [X], as measured by [Y], by doing [Z]',
          'Optimize LinkedIn headline, summary, and skills section with target industry keywords',
          'Request recommendations from 2 professors or previous project coordinators',
          'Run resume through ATS checker to ensure clean 100% parsing',
        ],
        marketContext: 'Corporate recruiters review resumes in under 10 seconds. Quantifiable achievements and crisp formatting double interview invitations.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 7 days',
      },
      {
        id: 'gen-intern-1',
        title: 'Apply for Corporate Management & Research Internships',
        category: 'INTERNSHIPS',
        description: 'Target corporate advisory firms, research institutes, NGO consulting projects, and corporate HR departments.',
        checklist: [
          'Identify 10 corporate summer internship openings on Internshala and LinkedIn',
          'Write custom cover notes connecting your educational background with the company mission',
          'Prepare for behavioral and case interview questions using the STAR framework',
        ],
        marketContext: 'Corporate internships provide invaluable corporate exposure, professional networks, and stipends averaging ₹8,000–₹20,000/month.',
        estMonthlyEarningRupees: 12000,
        recommendedStage: 'Immediate (Next 7 days)',
      },
      {
        id: 'gen-free-1',
        title: 'Launch a High-Quality Content Writing & Research Freelance Gig',
        category: 'FREELANCE',
        description: 'Write long-form articles, industry summaries, and whitepapers for B2B blogs, marketing agencies, or academic researchers.',
        checklist: [
          'Write 3 polished 1,000-word sample articles on Medium or Substack in your subject of interest',
          'Pitch B2B content marketing agencies on LinkedIn offering well-researched technical or business articles at ₹1.5–₹2.5 per word',
          'Deliver articles with zero plagiarism, fact-checked citations, and clean formatting',
        ],
        marketContext: 'Quality long-form writing is in high demand by Indian SaaS and digital marketing companies seeking thought leadership articles.',
        estMonthlyEarningRupees: 9000,
        recommendedStage: 'This month',
      },
      {
        id: 'gen-skills-1',
        title: 'Master Advanced Excel, PowerPoint & Business Communication',
        category: 'SKILLS',
        description: 'Acquire the universal corporate toolkit: pivot tables, VLOOKUP/XLOOKUP, executive slide design, and business email etiquette.',
        checklist: [
          'Complete practical tutorials on Excel Pivot Tables, XLOOKUP, and conditional formatting',
          'Design an executive summary slide deck summarizing an industry trend',
          'Practice structuring professional client and managerial email correspondence',
        ],
        marketContext: 'Flawless presentation and spreadsheet skills are the fastest way to earn high-visibility assignments as a junior team member.',
        estMonthlyEarningRupees: 0,
        recommendedStage: 'Next 2 weeks',
      },
    ],
  },
};

export interface CareerBoostAnalysis {
  baselineMonthlySavings: number;
  boostMonthlySavings: number;
  additionalMonthlyIncome: number;
  originalMonthsToGoal: number;
  boostedMonthsToGoal: number;
  shavedMonths: number;
  shavedYearsFormatted: string;
}

/**
 * Pure function: Calculates how much landing an internship or freelance gig
 * accelerates the user's financial goal timeline.
 */
export function calculateCareerBoostImpact(
  goalAmount: number,
  existingSavings: number,
  currentMonthlySavings: number,
  additionalMonthlyIncome: number,
  capacityRatio: number = 0.5, // assuming user saves 50% of new income
  annualRate: number = 9.0,
): CareerBoostAnalysis {
  const currentSafeMonthly = Math.max(100, currentMonthlySavings);
  const additionalSavings = Math.round(additionalMonthlyIncome * capacityRatio);
  const boostedMonthly = currentSafeMonthly + additionalSavings;

  const originalMonths = monthsToGoal({
    monthly: currentSafeMonthly,
    goal: goalAmount,
    annualRate,
    existing: existingSavings,
  });

  const boostedMonths = monthsToGoal({
    monthly: boostedMonthly,
    goal: goalAmount,
    annualRate,
    existing: existingSavings,
  });

  const validOriginal = Number.isFinite(originalMonths) ? originalMonths : 120;
  const validBoosted = Number.isFinite(boostedMonths) ? boostedMonths : Math.max(12, Math.round(validOriginal * 0.6));
  const shaved = Math.max(0, validOriginal - validBoosted);

  const years = (shaved / 12).toFixed(1);

  return {
    baselineMonthlySavings: currentSafeMonthly,
    boostMonthlySavings: boostedMonthly,
    additionalMonthlyIncome,
    originalMonthsToGoal: validOriginal,
    boostedMonthsToGoal: validBoosted,
    shavedMonths: shaved,
    shavedYearsFormatted: `${years} years`,
  };
}

export interface EducationActionHubData {
  profile: EducationProfile;
  trackInfo: CareerTrackInfo;
  yearStageNote: string;
  tasks: CareerTaskTemplate[];
}

/**
 * Pure function: Returns personalized career actions and market connections
 * matching the user's educational profile.
 */
export function getEducationActionHub(edu?: EducationProfile): EducationActionHubData {
  const fallbackProfile: EducationProfile = {
    level: 'UNDERGRADUATE',
    field: 'Computer Science & Engineering',
    year: '2nd Year',
    careerTrack: 'TECH_SOFTWARE',
    targetRole: 'Software Engineering Intern',
  };

  const activeProfile = edu || fallbackProfile;
  const trackInfo = CAREER_TRACKS_CATALOG[activeProfile.careerTrack] || CAREER_TRACKS_CATALOG.TECH_SOFTWARE;

  let yearStageNote = 'Focus on building strong technical foundations and early exploratory projects.';
  const lowerYear = activeProfile.year.toLowerCase();

  if (lowerYear.includes('1st') || lowerYear.includes('first')) {
    yearStageNote = '1st Year Strategy: Build foundational knowledge, learn Git & tools, and participate in campus clubs and exploratory hackathons.';
  } else if (lowerYear.includes('2nd') || lowerYear.includes('second')) {
    yearStageNote = '2nd Year Strategy: High-leverage stage! Secure your first summer internship and launch a campus freelance gig to build real-world proof and early cash flow.';
  } else if (lowerYear.includes('3rd') || lowerYear.includes('third') || lowerYear.includes('pre-final')) {
    yearStageNote = '3rd Year Strategy: Prime placement window! Target competitive startup or corporate summer internships that offer Pre-Placement Offers (PPOs).';
  } else if (lowerYear.includes('final') || lowerYear.includes('4th') || lowerYear.includes('graduate')) {
    yearStageNote = 'Final Year / Graduate Strategy: Convert internship track records into full-time roles while scaling high-margin freelance and consulting retainers.';
  }

  return {
    profile: activeProfile,
    trackInfo,
    yearStageNote,
    tasks: trackInfo.suggestedTasks,
  };
}
