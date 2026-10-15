// Section 11.5 glossary: exactly two plain sentences each

export interface Term {
  term: string;
  body: string;
}

export const GLOSSARY: Term[] = [
  {
    term: 'SIP',
    body: 'A systematic investment plan is an automatic instruction to invest a fixed amount of rupees into a mutual fund every month. It builds a quiet habit and buys more fund units when prices are down and fewer when prices are up.',
  },
  {
    term: 'NAV',
    body: 'Net Asset Value is the market price of a single unit of a mutual fund on any given business day. When your fund grows in total worth, its NAV rises, increasing the value of every unit you already hold.',
  },
  {
    term: 'Expense ratio',
    body: 'The annual percentage fee that an asset management company deducts from fund assets to manage the scheme. A low expense ratio in an index fund ensures that more of the market return stays in your pocket over decades.',
  },
  {
    term: 'Index fund',
    body: 'A mutual fund that mirrors a market basket like the Nifty 50 or Sensex rather than attempting to pick individual winners. Because nobody tries to outsmart the market, costs remain tiny and performance tracks broad economic progress.',
  },
  {
    term: 'Drawdown',
    body: 'The temporary decline in portfolio value from its peak to its lowest point during a market drop. Experiencing drawdowns is an expected price of growth, and long-term plans are designed to withstand them without panic selling.',
  },
  {
    term: 'Inflation',
    body: 'The steady general rise in the prices of goods and everyday essentials that gradually reduces what a rupee can purchase. Investing in assets that outpace inflation protects your future purchasing power over long time horizons.',
  },
  {
    term: 'Liquidity',
    body: 'The speed and ease with which you can convert an investment back into bank cash without suffering a meaningful penalty. Savings accounts and liquid funds have very high liquidity, while fixed deposits and closed schemes carry restrictions.',
  },
  {
    term: 'Compounding',
    body: 'The mathematical effect where your accumulated investment returns begin generating their own returns over time. As the years multiply, the growth on past gains often outstrips the fresh money you deposit each month.',
  },
  {
    term: 'Emergency fund',
    body: 'A readily accessible pool of safe cash kept in a savings account or liquid fund to handle unexpected personal emergencies. Having this buffer prevents you from being forced to liquidate your long-term growth investments at a bad time.',
  },
];
