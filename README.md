# Corridor

> **A realistic investing plan for a first-time investor, built to survive bad years.**

Corridor is a front-end-only financial advisory web application tailored for Aarav, a 19-year-old college student with ₹8,000/month from pocket money and part-time gigs who wants to build wealth over time.

Instead of asking *"what is your risk appetite?"*, Corridor introduces core innovations:
1. **The Panic Budget:** Aarav states in exact rupees how far below his capital he could watch his money sit in a bad year without selling, and commits to a one-line written promise. All asset allocations and stress tests are anchored to this number, and the promise is shown back to him during market drawdowns.
2. **The Corridor:** Rather than displaying a single fake-precise projection, Corridor illustrates a shaded range of likely, low, and high outcomes modeled with conservative compounding assumptions and historical noise keyframes.
3. **Education-Matched Career & Income Booster:** Aarav specifies his degree level, field of study, college year, and target career track. Corridor analyzes real market recruitment conditions (Wellfound, Internshala, NISM certifications, freelance platforms) and assigns actionable to-dos directly into his Calendar—covering technical interview preparation, summer internship applications, and campus freelance gigs, showing the exact months shaved off his financial goal!

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended, tested on v20 and v24)
- npm (v9+)

### Installation & Run

```bash
# Navigate to the project directory
cd c:\Users\Yathaarth\.gemini\antigravity\scratch\corridor

# Install pinned dependencies
npm install

# Start local development server
npm run dev

# Run engine test suite (53 unit tests verifying financial vectors & education impact)
npm run test

# Run strict ESLint checks (0 warnings, 0 errors)
npm run lint

# Build production bundle
npm run build
```

Once running, navigate to `http://localhost:5173` (or the local port Vite prints).
- To test the full onboarding flow from scratch: visit `http://localhost:5173/#/welcome`.
- To jump straight into Aarav's pre-seeded 7-month track record: click **"Try demo account (10s tour)"** or visit `http://localhost:5173/#/welcome?demo=1`.

---

## 🏛 Architecture & Rule Implementation Map

Corridor strictly follows the core architectural guidelines outlined in the master specification:

| Guideline | Implementation Details & File Location |
|---|---|
| **1. No Backend & Safe Storage** | All state resides in browser `localStorage` with Zustand `persist` (`corridor.v1`) in [`src/store/useStore.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/store/useStore.ts). Every write and read is wrapped in a `try/catch` guard. If storage is disabled or quota is exceeded, an in-memory fallback maintains state and renders a persistent storage warning notice. |
| **2. Pure Engine** | All money math is isolated in pure functions inside [`src/engine/`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/). No engine file imports React or calls `Date.now()`. Time-dependent functions accept `asOf: Date`. UI components never store derived state; all roadmaps, projections, breakdowns, and statuses are computed reactively using pure selectors in [`src/store/selectors.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/store/selectors.ts). |
| **3. One Source of Truth** | A single store coordinates profile, income, plan versions, holdings, ledger entries, calendar items, milestones, and calamity state. Modifications in Admin, Calamity Lab, or Monthly Updates propagate immediately to the Dashboard, Roadmap, and Calendar without page refreshes. |
| **4. Rupee Formatting** | Money is represented as integers. Rendered using Indian numbering format (`en-IN`) via [`src/engine/format.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/format.ts) (`inr(1000000)` -> `₹10,00,000`, `inrCompact(1000000)` -> `₹10 L`). Every division is guarded against zero and invalid numbers (`NaN`, `Infinity`, `-0` are never displayed). |
| **5. Timezone-Safe Dates** | Handled using `date-fns` and local time in [`src/engine/dates.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/dates.ts). Day keys are formatted as `yyyy-MM-dd` and month keys as `yyyy-MM` using local components (never `toISOString()`, which causes day-shift bugs in India Standard Time UTC+5:30). |
| **6. Data Honesty** | No invented statistics, fake stock tickers, or simulated fund names. The app only references Indian regulatory instrument categories (e.g., *Savings account*, *Liquid fund*, *1-3 Year Fixed Deposit*, *Broad Market Index Fund*). All demo market and news data are curated in [`src/data/`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/data/) and explicitly labelled with **"Demo data"** chips. |
| **7. Not Advice Disclaimer** | A non-negotiable footer appears on every app page and onboarding step: *"Educational demo with simulated numbers. Not investment advice."* implemented in [`src/components/ui/DisclaimerFooter.tsx`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/components/ui/DisclaimerFooter.tsx). |
| **8. Accessible & Polish Baseline** | Full keyboard navigation, visible focus rings, AA contrast ratios, Radix dialogs with focus trap and Escape to close ([`src/components/ui/Dialog.tsx`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/components/ui/Dialog.tsx)), Radix tooltips ([`src/components/ui/Tooltip.tsx`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/components/ui/Tooltip.tsx)), and complete empty states. |

---

## 📊 Financial Assumptions & Mathematical Engine

The calculations in [`src/engine/finance.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/finance.ts) and [`src/engine/plan.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/plan.ts) model compounding wealth under three distinct investment horizons:

1. **Horizon Asset Allocations & Nominal Rates:**
   - **Short (<3 years):** 60% Safe (6.0% p.a.), 30% Mid (7.0% p.a.), 10% Long (10.0% p.a.) $\rightarrow$ Weighted base rate: **6.70% p.a.**
   - **Medium (3–7 years):** 30% Safe (6.0% p.a.), 40% Mid (7.0% p.a.), 30% Long (10.0% p.a.) $\rightarrow$ Weighted base rate: **7.60% p.a.**
   - **Long (>7 years):** 10% Safe (6.0% p.a.), 20% Mid (7.0% p.a.), 70% Long (10.0% p.a.) $\rightarrow$ Weighted base rate: **9.00% p.a.**
2. **Corridor Shaded Range:**
   - Low case: `baseRate - 1.5%`
   - Likely case: `baseRate`
   - High case: `baseRate + 1.5%`
3. **Compounding Formulation:**
   - Monthly periodic rate: $r_m = (1 + r_{\text{annual}})^{1/12} - 1$
   - Future value of existing lump sum with monthly SIP contributions:
     $$\text{FV} = \text{PV} \cdot (1 + r_m)^n + \text{PMT} \cdot \frac{(1 + r_m)^n - 1}{r_m}$$
   - When annual step-up $g$ is active, contributions increase by $(1 + g)$ every 12 months.
4. **Historical Replay & Noise Model:**
   - Calamity Lab stress tests equity drawdowns from 5% to 50% across 4 distinct phases (Initial slide, Deep drawdown, Base building, Recovery).
   - Replay projections use a deterministic pseudo-random noise generator (`mulberry32(2026)`) smoothly interpolated between keyframes in log space.
5. **Harm Checking (Assessing Unrealistic Plans):**
   - The engine flags four dangerous conditions in [`src/engine/assess.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/assess.ts):
     - *Exceeds Capacity:* Monthly commitment exceeds 80% of net income.
     - *Timeline Too Aggressive:* Goal requires monthly savings greater than 100% of income.
     - *Panic Budget Breach:* Projected 1-year drawdown exceeds stated tolerance.
     - *Premature Long Allocation:* Allocating heavily to volatile assets on an ultra-short horizon (<2 years).

---

## 📰 Honest Data & Live Rotation Mechanism

In accordance with Section 4, Corridor guarantees zero invented news or fake prices:
- **Provider Pattern:** Defined via `MarketProvider` and `NewsProvider` in [`src/data/providers/`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/data/providers/).
- **Deterministic Day Rotation:** Today's research snapshot rotates based on `seed = hash(dayKey)` where `dayKey` is `yyyy-MM-dd`. The dataset changes cleanly every local midnight, remains stable throughout the day, and automatically refreshes when the browser tab regains focus (`visibilitychange`).
- **Live Impact Sentences:** News items are evergreen market mechanics explainers. Each story includes an `ImpactRule` that is dynamically evaluated against Aarav's real portfolio numbers via [`src/engine/impact.ts`](file:///c:/Users/Yathaarth/.gemini/antigravity/scratch/corridor/src/engine/impact.ts) (e.g. *"If FD and debt-fund returns fall by 1 point, your Mid bucket grows to ₹34,200 instead of ₹36,500 over 12 months"*).

---

## 🎬 90-Second Demo Script (Hackathon Walkthrough)

Follow this exact sequence for a judge or investor demo:

1. **Load Demo Account:**
   - Navigate to `http://localhost:5173/#/welcome`.
   - Click the secondary button: **"Try demo account (10s tour)"**.
   - Aarav's 7-month simulated history is loaded with 100% consistency.
2. **Dashboard Overview (`#/app/dashboard`):**
   - Point out the **Quote of the Day** (Charlie Munger / Warren Buffett) and the active countdown (*"9 years, 5 months to go"*).
   - Review the **Corridor Chart**: showcase the solid "Likely" green line encased within the 15% shaded range band.
   - Walk through the 5 summary tiles: Net Worth, Monthly SIP, Savings So Far, Panic Budget, and Next Milestone.
3. **Stress Testing in the Calamity Lab (`#/app/fallback`):**
   - Click **Calamity Lab** in the sidebar.
   - Drag the Market Drop slider to **25%**: note the green badge indicating the drop is within Aarav's ₹15,000 Panic Budget.
   - Drag the slider up to **35%**: watch the amber alert fire, notifying Aarav that this fall breaks his budget.
   - The **Promise Banner** appears displaying his original written commitment: *"If my investments drop 30%, I will keep my SIP running and do nothing else"*.
   - Review the two recovery proposals: **Option A** (*"Keep the date, step up monthly savings"*) and **Option B** (*"Keep the monthly amount, extend timeline by 6 months"*).
   - Click **"Apply Option A"** $\rightarrow$ review the Risk Confirmation modal $\rightarrow$ confirm and observe the plan update instantly across the entire app.
4. **To-Do Calendar, Milestones & Career Booster (`#/app/calendar`):**
   - Switch to **Calendar**: note the Monday-first month grid and quarterly milestone banner.
   - Point out the **Education & Career Booster Hub**: notice how it automatically pulled Aarav's education details (*"2nd Year · Computer Science & Engineering"*).
   - Filter by **"💼 Internships"** or **"⚡ Freelance & Gigs"**; point out the financial timeline impact (*"Income boost: +₹20,000/mo. Shaves off 2.8 years from your ₹10 L goal!"*).
   - Click **"Assign to To-Do"** on a task (e.g. *Apply for 10 Summer Software Internships on Wellfound*): watch it schedule directly into that calendar day with a success toast.
   - Click the scheduled date in the calendar grid to open the Notion-style 3-column day modal with the action checklist ready to tick off.
5. **Live News & Personalized Plan Impacts (`#/app/news`):**
   - Switch to **News & Themes**: point out the "Demo data" source badge.
   - Read the bold green sentence under a rate or market story: notice how it uses Aarav's actual portfolio balances to explain real impact.
   - Browse the curated Indian beginner book recommendations and video topics.
6. **Admin, Education Edit & Harm Prevention (`#/app/admin`):**
   - Navigate to **Admin**: view the **Profile** tab showing the editable degree level, college year, and career track.
   - Switch to the **Goals & Duration** tab: try to set a **₹1 Crore** goal in **3 years** with an ₹8,000 income.
   - Show the **Harm Check Dialog** trigger, warning Aarav that this plan would require ₹2,45,000/month (3,000% of income), refusing to set a young student up for failure.
7. **Compliance & Trust:**
   - Scroll to the bottom of any screen to highlight the persistent disclaimer footer: *"Educational demo with simulated numbers. Not investment advice."*

---

## 🛠 Technology Stack

- **Framework:** React 18, Vite, TypeScript (strict mode)
- **Styling & Tokens:** Tailwind CSS v3 with CSS custom properties for Light & Dark mode
- **State Management:** Zustand with versioned `persist` (`corridor.v1`) and safe JSON parse fallbacks
- **Routing:** React Router (`HashRouter` for zero-configuration static hosting)
- **Charts:** Recharts (custom corridor band, tooltips, responsive container)
- **Animation:** `framer-motion` (200ms–400ms subtle transitions, respects `prefers-reduced-motion`)
- **Icons & UI:** Lucide React (stroke 1.75), Radix UI Dialog, Radix UI Tooltip
- **Typography:** Bricolage Grotesque (display) & Hanken Grotesk (body) via Fontsource
- **Testing:** Vitest (53 pure engine unit tests verifying compounding, rounding, fallbacks, harm assessment, and education career impact)
