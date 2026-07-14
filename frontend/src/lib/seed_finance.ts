export interface OpexExpense {
  id: string;
  category: string;
  amountINR: number;
  percentageOfRev: number;
  vsLastMonthStr: string;
  isReimbursable?: boolean;
}

export interface SaaSMetrics {
  currentMRR: number;
  targetMRR: number;
  clientsByPlan: {
    plan: string;
    price: number;
    count: number;
  }[];
  monthlyHistory: { month: string; mrr: number }[];
}

export interface ProjectionMonth {
  month: string;
  revenue: number;
  payroll: number;
  opex: number;
  pnl: number;
  cumulativePnl: number;
  isHistorical: boolean;
}

export const MOCK_OPEX: OpexExpense[] = [
  { id: '1', category: 'Tools & SaaS', amountINR: 18000, percentageOfRev: 5.8, vsLastMonthStr: '— same' },
  { id: '2', category: 'Office / Misc', amountINR: 12000, percentageOfRev: 3.9, vsLastMonthStr: '— same' },
  { id: '3', category: 'Ad spend (unpaid)', amountINR: 30000, percentageOfRev: 9.7, vsLastMonthStr: '[Client reimburses]', isReimbursable: true },
];

export const MOCK_SAAS_METRICS: SaaSMetrics = {
  currentMRR: 25000,
  targetMRR: 100000,
  clientsByPlan: [
    { plan: 'Starter', price: 2499, count: 7 },
    { plan: 'Growth', price: 5999, count: 2 },
    { plan: 'Pro', price: 8999, count: 0 },
    { plan: 'Enterprise', price: 0, count: 1 }, // Pilot
  ],
  monthlyHistory: [
    { month: 'Jan', mrr: 0 },
    { month: 'Feb', mrr: 0 },
    { month: 'Mar', mrr: 0 },
    { month: 'Apr', mrr: 0 },
    { month: 'May', mrr: 5000 },
    { month: 'Jun', mrr: 10000 },
    { month: 'Jul', mrr: 25000 },
    { month: 'Aug', mrr: 40000 },
    { month: 'Sep', mrr: 55000 },
    { month: 'Oct', mrr: 70000 },
    { month: 'Nov', mrr: 85000 },
    { month: 'Dec', mrr: 100000 },
  ],
};

// Base case projections (Jan - Dec)
export const MOCK_PROJECTIONS: ProjectionMonth[] = [
  { month: 'Jan', revenue: 200000, payroll: 280000, opex: 40000, pnl: -120000, cumulativePnl: -120000, isHistorical: true },
  { month: 'Feb', revenue: 220000, payroll: 280000, opex: 45000, pnl: -105000, cumulativePnl: -225000, isHistorical: true },
  { month: 'Mar', revenue: 250000, payroll: 290000, opex: 50000, pnl: -90000,  cumulativePnl: -315000, isHistorical: true },
  { month: 'Apr', revenue: 270000, payroll: 300000, opex: 55000, pnl: -85000,  cumulativePnl: -400000, isHistorical: true },
  { month: 'May', revenue: 290000, payroll: 300000, opex: 55000, pnl: -65000,  cumulativePnl: -465000, isHistorical: true },
  { month: 'Jun', revenue: 300000, payroll: 310000, opex: 60000, pnl: -70000,  cumulativePnl: -535000, isHistorical: true },
  // Future projections from user spec
  { month: 'Jul', revenue: 310000, payroll: 313000, opex: 60000, pnl: -63000,  cumulativePnl: -63000, isHistorical: true }, // Current month deficit
  { month: 'Aug', revenue: 435000, payroll: 313000, opex: 60000, pnl: 62000,   cumulativePnl: -1000, isHistorical: false },
  { month: 'Sep', revenue: 528000, payroll: 313000, opex: 60000, pnl: 155000,  cumulativePnl: 154000, isHistorical: false },
  { month: 'Oct', revenue: 593000, payroll: 313000, opex: 85000, pnl: 195000,  cumulativePnl: 349000, isHistorical: false },
  { month: 'Nov', revenue: 658000, payroll: 313000, opex: 85000, pnl: 260000,  cumulativePnl: 609000, isHistorical: false },
  { month: 'Dec', revenue: 723000, payroll: 313000, opex: 85000, pnl: 325000,  cumulativePnl: 934000, isHistorical: false },
];
