/**
 * Unified Account Categories & Classification Helpers
 * Single source of truth for Disbursement Book of Accounts & Reports Category Breakdown
 */

export const PETTY_CASH_ACCOUNT_OPTIONS = [
  'Communication',
  'COS -water',
  'COS - Water Vendo',
  'Freight in',
  'Hygiene expense',
  'key locker duplicate',
  'Meeting meals',
  'Miscellaneous',
  'Office supplies',
  'Office Use',
  'Petty Cash Replenishment',
  'Porterage',
  'Repair & Maintenance',
  'Transportation',
  'Travel & Transportation'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const MERCHANDISE_ACCOUNT_OPTIONS = [
  'black shoes',
  'CE - Gala',
  'COGS - FREIGHT IN - Pershing Cap',
  'COGS-handbag',
  'COGS-Pershing cap',
  'Commission- Participation Card',
  'Commission- ROTC Manual',
  'Freight in',
  'Inventory-handbag',
  'Inventory-hardhat',
  'Inventory-Pershing cap',
  'Inventory-safety goggles',
  'Merchandise Inventory - Gala',
  'Merchandise Inventory - Lanyard',
  'Merchandise Inventory - Pershing Cap',
  'Merchandise Inventory - Type A & B',
  'Porterage',
  'Uniform items'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const OPERATION_EXPENSE_ACCOUNT_OPTIONS = [
  'Account Payable',
  'Advances to employee',
  'Allowances',
  'Audit Professional Expense',
  'Communication',
  'Credit Payable to Baterna',
  'Donation Expense',
  'Due to CETF - Apex Organization',
  'Fixture & Furniture',
  'Honorarium',
  'Incentive',
  'Insurance Payable',
  'Insurance Payable- 1CISP',
  'Insurance payable- Climbs',
  'Licenses & Taxes',
  'Meeting & conferences',
  'Miscellaneous',
  'Office supplies',
  'Office Supplies Expenses',
  'Office Use',
  'Pag-ibig premium ER share',
  'Pag-ibig premium- EE share',
  'Philhealth -EE share',
  'Philhealth-ER share',
  'Professional and Consultancy Fee',
  'Professional Fee',
  'Repair & Maintenance',
  'Representation',
  'Salary',
  'Seminar & Training',
  'SSS premium-EE Share',
  'SSS premium-ER share',
  'Wages'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const SERVICES_EXPENSE_ACCOUNT_OPTIONS = [
  'COS - Scoresheet',
  'COS -water',
  'COS - Water Vendo',
  'COS- hardbound',
  'COS- Insurance',
  'COS- printing',
  'COS-Wifi',
  'labor',
  'Repair & Maintenance',
  'Repair & Maintenance - Equipment',
  'Service Supplies',
  'Toga Rental Labor Expense',
  'Toga Rental Revenue'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const REVOLVING_FUND_ACCOUNT_OPTIONS = [
  'Advances to employee',
  'Allowances',
  'Honorarium',
  'Office supplies',
  'Petty Cash Replenishment',
  'Revolving Fund - Honorarium & Wages',
  'Revolving Fund - Manager',
  'Revolving Fund - Petty Cash',
  'Revolving Fund - Rice',
  'Salary',
  'Transportation',
  'Wages'
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const REPLENISHMENT_ACCOUNT_OPTIONS = Array.from(new Set([
  ...PETTY_CASH_ACCOUNT_OPTIONS,
  ...MERCHANDISE_ACCOUNT_OPTIONS,
  ...OPERATION_EXPENSE_ACCOUNT_OPTIONS,
  ...SERVICES_EXPENSE_ACCOUNT_OPTIONS,
  ...REVOLVING_FUND_ACCOUNT_OPTIONS,
  'Short Term Loan'
])).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export interface AccountCategoryOption {
  value: string;
  label: string;
  color: string;
  description: string;
}

export const ACCOUNT_CATEGORIES: readonly AccountCategoryOption[] = [
  { value: 'Operation', label: 'Operation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700', description: 'General operations, utilities, rent, licenses & office expenses' },
  { value: 'Merchandise', label: 'Merchandise', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700', description: 'Inventory stock, COGS, uniform items, pershing caps & resale merchandise' },
  { value: 'Service', label: 'Service', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700', description: 'Printing, WiFi, photocopier toner, ID supplies, service maintenance' },
  { value: 'Petty Cash', label: 'Petty Cash', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', description: 'Small daily office expenses, meeting meals, hygiene & local travel' },
  { value: 'Revolving Fund', label: 'Revolving Fund', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border-teal-300 dark:border-teal-700', description: 'Branch and custodial revolving funds, manager funds & cash replenishment' },
  { value: 'CETF', label: 'CETF', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-700', description: 'Cooperative Education & Training Fund allocations & seminars' },
  { value: 'CDF', label: 'CDF', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', description: 'Community Development Fund initiatives & outreach programs' },
  { value: 'Honorarium', label: 'Honorarium', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 border-teal-300 dark:border-teal-700', description: 'Honoraria disbursements to cooperative officers, directors & committees' },
  { value: 'Allowances', label: 'Allowances', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', description: 'Transportation, per diems, representation and staff stipends' },
  { value: 'Wages', label: 'Wages', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', description: 'Regular staff compensation, payroll, employee wages & labor' }
] as const;

export const CATEGORY_THEMES: Record<string, { bg: string; text: string; border: string; badge: string; iconBg: string }> = {
  'Operation': {
    bg: 'bg-blue-50/70 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
    iconBg: 'bg-blue-600 text-white'
  },
  'Merchandise': {
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-700',
    iconBg: 'bg-amber-600 text-white'
  },
  'Service': {
    bg: 'bg-purple-50/70 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-700',
    iconBg: 'bg-purple-600 text-white'
  },
  'Petty Cash': {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
    iconBg: 'bg-emerald-600 text-white'
  },
  'Revolving Fund': {
    bg: 'bg-teal-50/70 dark:bg-teal-950/20',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-700',
    iconBg: 'bg-teal-600 text-white'
  },
  'CETF': {
    bg: 'bg-rose-50/70 dark:bg-rose-950/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-700',
    iconBg: 'bg-rose-600 text-white'
  },
  'CDF': {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700',
    iconBg: 'bg-emerald-700 text-white'
  },
  'Honorarium': {
    bg: 'bg-teal-50/70 dark:bg-teal-950/20',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-700',
    iconBg: 'bg-teal-700 text-white'
  },
  'Allowances': {
    bg: 'bg-cyan-50/70 dark:bg-cyan-950/20',
    text: 'text-cyan-800 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/60',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700',
    iconBg: 'bg-cyan-600 text-white'
  },
  'Wages': {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    text: 'text-indigo-800 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700',
    iconBg: 'bg-indigo-600 text-white'
  }
};

export const getCategoryForAccount = (acct: string, categoryMap?: Record<string, string>): string => {
  const trimmed = (acct || '').trim();
  if (!trimmed) return 'Operation';
  const lower = trimmed.toLowerCase();

  // 1. Check explicitly passed category map
  if (categoryMap && categoryMap[lower]) {
    return categoryMap[lower];
  }

  // 2. Check localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('rf_account_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[lower]) return parsed[lower];
      }
    } catch {
      // ignore
    }
  }

  // 3. Petty Cash accounts heuristic
  if (
    lower === 'petty cash replenishment' ||
    lower === 'hygiene expense' ||
    lower === 'key locker duplicate' ||
    lower === 'meeting meals' ||
    (lower.includes('petty') && !lower.includes('revolving'))
  ) {
    return 'Petty Cash';
  }

  // 4. Honorarium & Wages accounts
  if (lower === 'honorarium' || (lower.includes('honorarium') && !lower.includes('allowance'))) {
    return 'Honorarium';
  }
  if (lower === 'allowances' || lower === 'allowance' || (lower.includes('allowance') && !lower.includes('honorarium'))) {
    return 'Allowances';
  }
  if (lower === 'honorarium and allowances') {
    return 'Honorarium';
  }
  if (lower.includes('wage')) {
    return 'Wages';
  }

  // 5. Revolving Fund classifications
  if (lower.startsWith('revolving fund')) {
    return 'Revolving Fund';
  }

  // 6. Service accounts
  if (
    lower.includes('wifi') ||
    lower.includes('scoresheet') ||
    lower.includes('score sheet') ||
    lower.includes('toga rental') ||
    lower.includes('printing') ||
    lower.includes('hardbound') ||
    lower.includes('photocopy') ||
    lower.includes('service supplies') ||
    lower.includes('service')
  ) {
    return 'Service';
  }

  // 7. Merchandise accounts
  if (
    lower.includes('merchandise') ||
    lower.includes('inventory') ||
    lower.includes('cogs') ||
    lower.includes('pershing') ||
    lower.includes('lanyard') ||
    lower.includes('handbag') ||
    lower.includes('hardhat') ||
    lower.includes('goggles') ||
    lower.includes('black shoes') ||
    lower.includes('shoes') ||
    lower.includes('uniform') ||
    lower.includes('gala')
  ) {
    return 'Merchandise';
  }

  if (lower.includes('water')) {
    return 'Petty Cash';
  }
  if (lower.includes('transportation') || lower.includes('travel')) {
    return 'Petty Cash';
  }
  if (lower.includes('freight') || lower.includes('porterage')) {
    return 'Merchandise';
  }
  if (lower.includes('cetf') || lower.includes('apex')) {
    return 'CETF';
  }
  if (lower.includes('cdf')) {
    return 'CDF';
  }
  return 'Operation';
};

export const getRfDeletedAccountsSet = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem('rf_deleted_accounts');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        return new Set(arr.map((s: string) => String(s).trim().toLowerCase()));
      }
    }
  } catch {}
  return new Set();
};

export const saveRfDeletedAccount = (name: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getRfDeletedAccountsSet();
    set.add(name.trim().toLowerCase());
    localStorage.setItem('rf_deleted_accounts', JSON.stringify(Array.from(set)));
  } catch {}
};

export const restoreRfDeletedAccount = (name: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getRfDeletedAccountsSet();
    set.delete(name.trim().toLowerCase());
    localStorage.setItem('rf_deleted_accounts', JSON.stringify(Array.from(set)));
  } catch {}
};

