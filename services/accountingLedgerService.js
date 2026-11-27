import pool from '../config/db.js';

/**
 * Audited Opening Balances as of January 01, 2026 (and Jan 01, 2025)
 * Shared single source of truth for General Ledger, Trial Balance, and Balance Sheet.
 */
export const OPENING_BASELINE = {
  cash_in_vault: { label: 'Cash in Vault', type: 'Asset', normal: 'debit', cur: 323314.63, prev: 2045.00 },
  cib_bdo: { label: 'Cash in Bank - BDO', type: 'Asset', normal: 'debit', cur: 2031307.38, prev: 35526.34 },
  cib_metrobank: { label: 'Cash in Bank - MBTC', type: 'Asset', normal: 'debit', cur: 632451.36, prev: 50015.68 },
  victo: { label: 'Cash in Coop Federation - Victo', type: 'Asset', normal: 'debit', cur: 43287.77, prev: 110000.00 },
  climbs_federation: { label: 'Cash in Coop Federation - CLIMBS', type: 'Asset', normal: 'debit', cur: 105076.43, prev: 100000.00 },
  other_funds: { label: 'Cash in Coop Federation - Other Funds', type: 'Asset', normal: 'debit', cur: 71695.35, prev: 0.00 },
  nafe: { label: 'Cash in Coop Federation - NAFE', type: 'Asset', normal: 'debit', cur: 10000.00, prev: 0.00 },
  rf_stl: { label: 'Revolving Fund - STL', type: 'Asset', normal: 'debit', cur: 43900.00, prev: 43900.00 },
  rf_haw: { label: 'Revolving Fund - HAW', type: 'Asset', normal: 'debit', cur: 56100.00, prev: 56100.00 },
  rf_operation: { label: 'Revolving Fund - Operation', type: 'Asset', normal: 'debit', cur: 100000.00, prev: 40000.00 },
  rf_rice: { label: 'Revolving Fund - Rice', type: 'Asset', normal: 'debit', cur: 50000.00, prev: 0.00 },
  petty_cash: { label: 'Petty Cash Fund', type: 'Asset', normal: 'debit', cur: 3000.00, prev: 10000.00 },
  reg_loans: { label: 'Loans Receivable - Regular', type: 'Asset', normal: 'debit', cur: 3021041.35, prev: 2723224.50 },
  cash_express: { label: 'Loans Receivable - Cash Express', type: 'Asset', normal: 'debit', cur: 61088.93, prev: 57250.00 },
  special_loans: { label: 'Loans Receivable - Special Occasion', type: 'Asset', normal: 'debit', cur: 126799.00, prev: 119046.00 },
  emergency_loans: { label: 'Loans Receivable - Emergency', type: 'Asset', normal: 'debit', cur: 32500.00, prev: 83750.00 },
  calamity_loans: { label: 'Loans Receivable - Calamity', type: 'Asset', normal: 'debit', cur: 650625.03, prev: 0.00 },
  unearned_interest: { label: 'Unearned Interest & Discounts', type: 'Asset', normal: 'credit', cur: 0.00, prev: -172315.00 },
  ar_insurance: { label: 'Accounts Receivable - Insurance', type: 'Asset', normal: 'debit', cur: 3300.00, prev: 0.00 },
  ar_uc: { label: 'Accounts Receivable - UC', type: 'Asset', normal: 'debit', cur: 0.00, prev: 134781.00 },
  rec_members: { label: 'Accounts Receivable - Members', type: 'Asset', normal: 'debit', cur: 12124.50, prev: 0.00 },
  inv_type_c: { label: 'Merchandise Inventory - Type C', type: 'Asset', normal: 'debit', cur: 805739.00, prev: 0.00 },
  inv_rice: { label: 'Merchandise Inventory - Rice', type: 'Asset', normal: 'debit', cur: 27735.50, prev: 3101.00 },
  inv_pe: { label: 'Merchandise Inventory - PE Uniform', type: 'Asset', normal: 'debit', cur: 58762.60, prev: 0.00 },
  inv_ppe: { label: 'Merchandise Inventory - PPE', type: 'Asset', normal: 'debit', cur: 109590.36, prev: 0.00 },
  inv_accessories: { label: 'Merchandise Inventory - Accessories', type: 'Asset', normal: 'debit', cur: 53305.30, prev: 0.00 },
  inv_soap: { label: 'Merchandise Inventory - Laundry Soap', type: 'Asset', normal: 'debit', cur: 2700.00, prev: 0.00 },
  inv_type_ab: { label: 'Merchandise Inventory - Type A&B', type: 'Asset', normal: 'debit', cur: 2750.00, prev: 0.00 },
  inv_rotc: { label: 'Merchandise Inventory - ROTC Manual', type: 'Asset', normal: 'debit', cur: 60880.00, prev: 0.00 },
  inv_gala: { label: 'Merchandise Inventory - GALA', type: 'Asset', normal: 'debit', cur: 90920.00, prev: 0.00 },
  inv_hardbound: { label: 'Merchandise Inventory - Hardbound', type: 'Asset', normal: 'debit', cur: 1750.00, prev: 0.00 },
  inv_plotting: { label: 'Merchandise Inventory - Plotting Sheet', type: 'Asset', normal: 'debit', cur: 5500.00, prev: 0.00 },
  inv_bsname: { label: 'Merchandise Inventory - BSNAME', type: 'Asset', normal: 'debit', cur: 133300.00, prev: 0.00 },
  unused_supplies: { label: 'Unused Office Supplies', type: 'Asset', normal: 'debit', cur: 20754.84, prev: 27500.00 },
  prepaid_expenses: { label: 'Prepaid Expenses', type: 'Asset', normal: 'debit', cur: 0.00, prev: 437933.40 },
  office_equipment: { label: 'Office Equipment', type: 'Asset', normal: 'debit', cur: 61669.60, prev: 42979.00 },
  depr_office_equipment: { label: 'Accumulated Depreciation - Office Equipment', type: 'Asset', normal: 'credit', cur: -28230.40, prev: -1797.00 },
  furnitures_fixtures: { label: 'Furnitures & Fixtures', type: 'Asset', normal: 'debit', cur: 326177.20, prev: 52744.00 },
  depr_furnitures_fixtures: { label: 'Accumulated Depreciation - Furnitures & Fixtures', type: 'Asset', normal: 'credit', cur: -56574.13, prev: -18261.04 },
  deposit_container: { label: 'Returnable Container Deposit', type: 'Asset', normal: 'debit', cur: 7500.00, prev: 0.00 },
  ap_trade: { label: 'Accounts Payable - Trade', type: 'Liabilities', normal: 'credit', cur: 291050.00, prev: 0.00 },
  ap_others: { label: 'Accounts Payable - Others', type: 'Liabilities', normal: 'credit', cur: 39965.00, prev: 0.00 },
  loans_payable: { label: 'Loans Payable', type: 'Liabilities', normal: 'credit', cur: 1860000.00, prev: 0.00 },
  accrued_expenses: { label: 'Accrued Expenses', type: 'Liabilities', normal: 'credit', cur: 1780.00, prev: 0.00 },
  due_cetf_apex: { label: 'Due to CETF - Apex Organization', type: 'Liabilities', normal: 'credit', cur: 0.00, prev: 20699.35 },
  clpp_premium: { label: 'CLPP Premium Payable', type: 'Liabilities', normal: 'credit', cur: 581.40, prev: 0.00 },
  insurance_payable: { label: 'Insurance Payable', type: 'Liabilities', normal: 'credit', cur: 2423.35, prev: 0.00 },
  other_payables: { label: 'Other Payables', type: 'Liabilities', normal: 'credit', cur: 0.00, prev: 991.40 },
  dividend_payable: { label: 'Interest & Patronage Refund Payable', type: 'Liabilities', normal: 'credit', cur: 0.00, prev: 289790.90 },
  other_noncurrent_liabs: { label: 'Other Non-Current Liabilities', type: 'Liabilities', normal: 'credit', cur: 0.00, prev: 188225.63 },
  common_shares: { label: 'Common Shares - Subscribed & Paid-Up', type: 'Equity', normal: 'credit', cur: 5676500.19, prev: 3247030.24 },
  undivided_surplus: { label: 'Undivided Net Surplus', type: 'Equity', normal: 'credit', cur: 1040024.48, prev: 14570.15 },
  donations_grants: { label: 'Donations & Grants', type: 'Equity', normal: 'credit', cur: 4303.00, prev: 0.00 },
  reserve_fund: { label: 'Reserve Fund', type: 'Equity', normal: 'credit', cur: 102714.76, prev: 102714.76 },
  cetf_fund: { label: 'Education & Training Fund (CETF)', type: 'Equity', normal: 'credit', cur: 15001.12, prev: 21570.11 },
  optional_fund: { label: 'Optional Fund', type: 'Equity', normal: 'credit', cur: 13962.52, prev: 38971.52 },
  community_dev_fund: { label: 'Community Development Fund', type: 'Equity', normal: 'credit', cur: 13535.78, prev: 12958.82 },
};

export async function ensureManualJournalTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_journal_entries (
      id SERIAL PRIMARY KEY,
      jev_no VARCHAR(64) NOT NULL,
      entry_date DATE NOT NULL,
      description TEXT DEFAULT '',
      created_by VARCHAR(150) DEFAULT 'Admin',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS manual_journal_lines (
      id SERIAL PRIMARY KEY,
      entry_id INTEGER NOT NULL REFERENCES manual_journal_entries(id) ON DELETE CASCADE,
      account_name VARCHAR(255) NOT NULL,
      account_type VARCHAR(64) NOT NULL DEFAULT 'Expense',
      debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
      credit NUMERIC(15, 2) NOT NULL DEFAULT 0
    );
  `);
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Infer standard Account Type & Normal Balance from Chart of Accounts or account name.
 */
export function inferAccountClassification(accountName, coaTypeMap = new Map()) {
  const name = String(accountName || '').trim();
  const lower = name.toLowerCase();
  if (coaTypeMap.has(lower)) {
    const t = coaTypeMap.get(lower);
    const tl = t.toLowerCase();
    if (tl.includes('asset')) return { type: 'Asset', normal: 'debit' };
    if (tl.includes('liab')) return { type: 'Liabilities', normal: 'credit' };
    if (tl.includes('equit')) return { type: 'Equity', normal: 'credit' };
    if (tl.includes('rev') || tl.includes('income')) return { type: 'Revenue', normal: 'credit' };
    return { type: 'Expense', normal: 'debit' };
  }

  if (
    /cash|cib|bank|vault|petty\s*cash|revolving\s*fund|\brf\s*-|receivable|loans?\s*receivable|inventory|equipment|furniture|fixture|prepaid|unused\s*supplies|deposit\s*container|federation|victo/i.test(lower) &&
    !/interest|income|expense|repay/i.test(lower)
  ) {
    return { type: 'Asset', normal: /accumulated\s*depr|unearned/i.test(lower) ? 'credit' : 'debit' };
  }
  if (/payable|accrued|due\s*to|locker\s*deposit|withholding|sss.*ee|pag-ibig.*ee|philhealth.*ee/i.test(lower)) {
    return { type: 'Liabilities', normal: 'credit' };
  }
  if (/common\s*share|share\s*capital|reserve\s*fund|cetf|optional\s*fund|community\s*dev|undivided\s*surplus|donation|grant/i.test(lower)) {
    return { type: 'Equity', normal: 'credit' };
  }
  if (/interest\s*(income|received)|fines|penalt|service\s*(fee|charge)|membership\s*fee|sales|income|revenue|raffle|withdrawal\s*fee|water\s*vendo|photocopy|2x2|hardbound|gnomonic|locker\s*rent|key\s*duplicate|ctpl/i.test(lower)) {
    return { type: 'Revenue', normal: 'credit' };
  }
  return { type: 'Expense', normal: 'debit' };
}

const normalizeDateStr = (val) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const resolveBankCashAccount = (voucher) => {
  const text = `${voucher.folder_name || ''} ${voucher.bank_name || ''} ${voucher.particulars || ''}`.toLowerCase();
  if (text.includes('mbtc') || text.includes('metrobank')) return 'Cash in Bank - MBTC';
  if (text.includes('vault') || text.includes('cash on hand')) return 'Cash in Vault';
  return 'Cash in Bank - BDO';
};

const resolveCollectionCashAccount = (col) => {
  const s = `${col.status || ''} ${col.bank_name || ''}`.toLowerCase();
  if (s.includes('mbtc') || s.includes('metrobank')) return 'Cash in Bank - MBTC';
  if (s.includes('bdo')) return 'Cash in Bank - BDO';
  return 'Cash in Vault';
};

/**
 * Build balanced General Journal entries, T-Accounts (General Ledger), and Trial Balance
 * for the requested year (and optional month 1..12).
 */
export async function buildAccountingLedger({ year, month = null } = {}) {
  await ensureManualJournalTables();
  const targetYear = Number(year) || new Date().getFullYear();
  const targetMonth = month ? Number(month) : null;

  const [coaRes, cvRes, colRes, rfRes, scRes, manualRes, manualLinesRes] = await Promise.all([
    pool.query('SELECT account_type, account_title FROM chart_of_accounts').catch(() => ({ rows: [] })),
    pool.query(`
      SELECT id, voucher_no, voucher_date, payee, particulars, folder_name, details, amount, status
      FROM check_vouchers
      WHERE status != 'cancelled'
      ORDER BY voucher_date ASC, id ASC
    `),
    pool.query(`
      SELECT id, date, or_no, payor_name, tab, items, item_name, service_type, particulars, other_category, remarks, amount,
             loans, loan_account, principal_amount, interest_account, interest_amount, fines_account, fines_amount,
             common_share_amount, membership_fee, billing_amount, particulars_amount, status, bank_name, created_at
      FROM collections
      WHERE COALESCE(status, 'completed') != 'cancelled'
      ORDER BY date ASC, id ASC
    `),
    pool.query(`
      SELECT rfe.id, rfe.entry_date, rfe.voucher_no, rfe.account_name, rfe.particulars, rfe.recipient, rfe.amount,
             rf.fund_name
      FROM revolving_fund_entries rfe
      LEFT JOIN revolving_funds rf ON rf.id = rfe.fund_id
      WHERE COALESCE(rfe.is_cancelled, false) = false
      ORDER BY rfe.entry_date ASC, rfe.id ASC
    `).catch(() => ({ rows: [] })),
    pool.query(`
      SELECT sct.id, sct.member_id, sct.amount, sct.transaction_type, sct.transaction_date, sct.remarks, sct.invoice_no,
             m.first_name, m.middle_name, m.last_name
      FROM share_capital_transactions sct
      LEFT JOIN members m ON m.id = sct.member_id
      WHERE COALESCE(sct.status, 'completed') = 'completed'
        AND sct.collection_id IS NULL
      ORDER BY sct.transaction_date ASC, sct.id ASC
    `).catch(() => ({ rows: [] })),
    pool.query(`
      SELECT id, jev_no, entry_date, description, created_by, created_at
      FROM manual_journal_entries
      ORDER BY entry_date ASC, id ASC
    `),
    pool.query(`
      SELECT id, entry_id, account_name, account_type, debit, credit
      FROM manual_journal_lines
      ORDER BY id ASC
    `),
  ]);

  const coaTypeMap = new Map();
  for (const row of coaRes.rows) {
    if (row.account_title && row.account_type) {
      coaTypeMap.set(String(row.account_title).trim().toLowerCase(), String(row.account_type).trim());
    }
  }

  const journalEntries = [];
  const matchesPeriod = (dateStr) => {
    if (!dateStr) return false;
    const y = Number(dateStr.slice(0, 4));
    if (y !== targetYear) return false;
    if (targetMonth) {
      const m = Number(dateStr.slice(5, 7));
      if (m > targetMonth) return false; // YTD up to targetMonth
    }
    return true;
  };

  const pushBalancedEntry = (entry) => {
    const lines = (entry.lines || [])
      .map((l) => {
        const cls = inferAccountClassification(l.account_name, coaTypeMap);
        return {
          account_name: String(l.account_name).trim(),
          account_type: l.account_type || cls.type,
          normal: l.normal || cls.normal,
          debit: round2(l.debit),
          credit: round2(l.credit),
        };
      })
      .filter((l) => l.account_name && (l.debit > 0 || l.credit > 0));

    if (lines.length === 0) return;
    const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
    const diff = round2(totalDebit - totalCredit);
    if (Math.abs(diff) >= 0.01) {
      // Auto-balance tiny rounding or unclassified single-sided entries to Rounding / Suspense Clearing
      lines.push({
        account_name: 'Unclassified / Clearing Adjustment',
        account_type: 'Expense',
        normal: 'debit',
        debit: diff < 0 ? Math.abs(diff) : 0,
        credit: diff > 0 ? diff : 0,
      });
    }
    const finalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
    const finalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));
    journalEntries.push({
      ...entry,
      lines,
      total_debit: finalDebit,
      total_credit: finalCredit,
      is_balanced: Math.abs(finalDebit - finalCredit) < 0.01,
    });
  };

  // 1. Check Vouchers -> Balanced JEVs
  for (const cv of cvRes.rows) {
    const dateStr = normalizeDateStr(cv.voucher_date);
    if (!matchesPeriod(dateStr)) continue;
    const bankAcc = resolveBankCashAccount(cv);
    const lines = [];
    let netBankCredit = 0;

    if (Array.isArray(cv.details) && cv.details.length > 0) {
      for (const d of cv.details) {
        const boa = String(d.book_of_account || '').trim();
        const rawAmt = parseFloat(d.amount) || 0;
        const absAmt = Math.abs(rawAmt);
        if (!boa || absAmt <= 0) continue;
        const isCreditLine = Boolean(d.is_credit) || rawAmt < 0;
        if (isCreditLine) {
          lines.push({ account_name: boa, debit: 0, credit: absAmt });
          netBankCredit -= absAmt;
        } else {
          lines.push({ account_name: boa, debit: absAmt, credit: 0 });
          netBankCredit += absAmt;
        }
      }
    } else {
      const amt = Math.abs(parseFloat(cv.amount) || 0);
      if (amt > 0) {
        lines.push({ account_name: cv.particulars || 'General Disbursement', debit: amt, credit: 0 });
        netBankCredit = amt;
      }
    }

    const cashAmt = round2(netBankCredit);
    if (cashAmt > 0) {
      lines.push({ account_name: bankAcc, account_type: 'Asset', normal: 'debit', debit: 0, credit: cashAmt });
    } else if (cashAmt < 0) {
      lines.push({ account_name: bankAcc, account_type: 'Asset', normal: 'debit', debit: Math.abs(cashAmt), credit: 0 });
    }

    pushBalancedEntry({
      entry_id: `cv-${cv.id}`,
      date: dateStr,
      jev_no: cv.voucher_no ? `CV #${cv.voucher_no}` : `CV-${cv.id}`,
      source_type: 'check_voucher',
      source_label: 'Check Voucher',
      payee: cv.payee || 'Payee',
      description: cv.particulars || 'Check Voucher Disbursement',
      lines,
    });
  }

  // 2. Collections -> Balanced JEVs
  for (const col of colRes.rows) {
    const dateStr = normalizeDateStr(col.date || col.created_at);
    if (!matchesPeriod(dateStr)) continue;
    const totalAmt = round2(col.amount);
    if (totalAmt <= 0) continue;

    const cashAcc = resolveCollectionCashAccount(col);
    const lines = [{ account_name: cashAcc, account_type: 'Asset', normal: 'debit', debit: totalAmt, credit: 0 }];
    let credited = 0;

    if (Array.isArray(col.loans) && col.loans.length > 0) {
      for (const l of col.loans) {
        const p = round2(l.principal_amount);
        const i = round2(l.interest_amount);
        const f = round2(l.fines_amount);
        if (p > 0) { lines.push({ account_name: l.loan_account || 'Loans Receivable - Salary', debit: 0, credit: p }); credited += p; }
        if (i > 0) { lines.push({ account_name: l.interest_account || 'Interest Received', debit: 0, credit: i }); credited += i; }
        if (f > 0) { lines.push({ account_name: l.fines_account || 'Fines & Penalties', debit: 0, credit: f }); credited += f; }
      }
    } else {
      const p = round2(col.principal_amount);
      const i = round2(col.interest_amount);
      const f = round2(col.fines_amount);
      if (p > 0) { lines.push({ account_name: col.loan_account || 'Loans Receivable - Salary', debit: 0, credit: p }); credited += p; }
      if (i > 0) { lines.push({ account_name: col.interest_account || 'Interest Received', debit: 0, credit: i }); credited += i; }
      if (f > 0) { lines.push({ account_name: col.fines_account || 'Fines & Penalties', debit: 0, credit: f }); credited += f; }
    }

    const cs = round2(col.common_share_amount);
    if (cs > 0) {
      lines.push({ account_name: 'Common Shares - Subscribed & Paid-Up', account_type: 'Equity', normal: 'credit', debit: 0, credit: cs });
      credited += cs;
    }
    const mf = round2(col.membership_fee);
    if (mf > 0) {
      lines.push({ account_name: 'Membership Fees', account_type: 'Revenue', normal: 'credit', debit: 0, credit: mf });
      credited += mf;
    }
    const pa = round2(col.particulars_amount);
    if (pa > 0 && col.other_category) {
      lines.push({ account_name: col.other_category, debit: 0, credit: pa });
      credited += pa;
    }
    if (Array.isArray(col.items) && col.items.length > 0) {
      for (const it of col.items) {
        const rev = round2(parseFloat(String(it.revenue)) || ((parseFloat(String(it.quantity)) || 1) * (parseFloat(String(it.selling_price || 0)) || 0)));
        if (rev > 0) {
          lines.push({ account_name: it.item || it.item_name || 'Merchandise Sales', account_type: 'Revenue', normal: 'credit', debit: 0, credit: rev });
          credited += rev;
        }
      }
    }

    const rem = round2(totalAmt - credited);
    if (rem > 0.01) {
      const fallbackAcc = col.service_type || col.item_name || col.other_category || col.particulars || 'Collection Revenue';
      lines.push({ account_name: fallbackAcc, debit: 0, credit: rem });
    }

    pushBalancedEntry({
      entry_id: `col-${col.id}`,
      date: dateStr,
      jev_no: col.or_no ? `OR #${col.or_no}` : `OR-${col.id}`,
      source_type: 'collection',
      source_label: 'Collection Receipt',
      payee: col.payor_name || 'Member',
      description: col.particulars || col.remarks || 'Official Receipt Collection',
      lines,
    });
  }

  // 3. Revolving Fund Liquidations -> Balanced JEVs
  for (const rfe of rfRes.rows) {
    const dateStr = normalizeDateStr(rfe.entry_date);
    if (!matchesPeriod(dateStr)) continue;
    const amt = round2(rfe.amount);
    if (amt <= 0) continue;
    const expAcc = rfe.account_name || 'Operation Expense';
    const rfName = rfe.fund_name ? `Revolving Fund - ${rfe.fund_name}` : 'Revolving Fund - Operation';
    pushBalancedEntry({
      entry_id: `rf-${rfe.id}`,
      date: dateStr,
      jev_no: rfe.voucher_no ? `LF #${rfe.voucher_no}` : `LF-${rfe.id}`,
      source_type: 'revolving_fund',
      source_label: 'RF Liquidation',
      payee: rfe.recipient || 'Staff / Supplier',
      description: rfe.particulars || expAcc,
      lines: [
        { account_name: expAcc, debit: amt, credit: 0 },
        { account_name: rfName, account_type: 'Asset', normal: 'debit', debit: 0, credit: amt },
      ],
    });
  }

  // 4. Manual Share Capital entries (not linked to collections)
  for (const sc of scRes.rows) {
    const dateStr = normalizeDateStr(sc.transaction_date);
    if (!matchesPeriod(dateStr)) continue;
    const amt = round2(sc.amount);
    if (amt <= 0) continue;
    const memberName = [sc.first_name, sc.middle_name, sc.last_name].filter(Boolean).join(' ').trim() || 'Member';
    const isDebit = sc.transaction_type === 'debit';
    pushBalancedEntry({
      entry_id: `sc-${sc.id}`,
      date: dateStr,
      jev_no: sc.invoice_no ? `SC #${sc.invoice_no}` : `SC-${sc.id}`,
      source_type: 'share_capital',
      source_label: 'Share Capital (Manual)',
      payee: memberName,
      description: sc.remarks || 'Manual Share Capital Entry',
      lines: isDebit
        ? [
            { account_name: 'Common Shares - Subscribed & Paid-Up', account_type: 'Equity', normal: 'credit', debit: amt, credit: 0 },
            { account_name: 'Share Capital Equity Adjustment', account_type: 'Equity', normal: 'credit', debit: 0, credit: amt },
          ]
        : [
            { account_name: 'Share Capital Equity Adjustment', account_type: 'Equity', normal: 'credit', debit: amt, credit: 0 },
            { account_name: 'Common Shares - Subscribed & Paid-Up', account_type: 'Equity', normal: 'credit', debit: 0, credit: amt },
          ],
    });
  }

  // 5. Persisted Manual Adjusting Journal Entries (JEV)
  const linesByEntry = new Map();
  for (const line of manualLinesRes.rows) {
    if (!linesByEntry.has(line.entry_id)) linesByEntry.set(line.entry_id, []);
    linesByEntry.get(line.entry_id).push(line);
  }
  for (const jev of manualRes.rows) {
    const dateStr = normalizeDateStr(jev.entry_date);
    if (!matchesPeriod(dateStr)) continue;
    const jLines = linesByEntry.get(jev.id) || [];
    if (jLines.length === 0) continue;
    pushBalancedEntry({
      entry_id: `jev-${jev.id}`,
      manual_id: jev.id,
      date: dateStr,
      jev_no: jev.jev_no,
      source_type: 'manual_jev',
      source_label: 'Manual JEV',
      payee: jev.created_by || 'Accountant',
      description: jev.description || 'Adjusting Journal Entry',
      lines: jLines.map((l) => ({
        account_name: l.account_name,
        account_type: l.account_type,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      })),
    });
  }

  // Sort General Journal chronologically (newest first for display, or keep date ascending)
  journalEntries.sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.entry_id).localeCompare(String(b.entry_id)));

  // Build T-Accounts & General Ledger from Opening Baseline + General Journal lines
  const accountMap = new Map();
  const ensureAccount = (name, typeHint, normalHint) => {
    const key = String(name || '').trim().toLowerCase();
    if (!accountMap.has(key)) {
      const cls = inferAccountClassification(name, coaTypeMap);
      accountMap.set(key, {
        account_name: String(name).trim(),
        account_type: typeHint || cls.type,
        normal: normalHint || cls.normal,
        opening_balance: 0,
        debit_total: 0,
        credit_total: 0,
        ending_balance: 0,
        debits: [],
        credits: [],
      });
    }
    return accountMap.get(key);
  };

  if (targetYear === 2026 || targetYear === 2025) {
    const field = targetYear === 2026 ? 'cur' : 'prev';
    for (const cfg of Object.values(OPENING_BASELINE)) {
      const val = round2(cfg[field]);
      if (val === 0) continue;
      const acc = ensureAccount(cfg.label, cfg.type, cfg.normal);
      acc.opening_balance = val;
      if (cfg.normal === 'debit') {
        if (val >= 0) {
          acc.debit_total += val;
          acc.debits.push({ date: `${targetYear}-01-01`, jev_no: 'OPENING', description: 'Audited Opening Balance', amount: val, source_type: 'opening' });
        } else {
          acc.credit_total += Math.abs(val);
          acc.credits.push({ date: `${targetYear}-01-01`, jev_no: 'OPENING', description: 'Audited Opening Balance (Contra)', amount: Math.abs(val), source_type: 'opening' });
        }
      } else {
        if (val >= 0) {
          acc.credit_total += val;
          acc.credits.push({ date: `${targetYear}-01-01`, jev_no: 'OPENING', description: 'Audited Opening Balance', amount: val, source_type: 'opening' });
        } else {
          acc.debit_total += Math.abs(val);
          acc.debits.push({ date: `${targetYear}-01-01`, jev_no: 'OPENING', description: 'Audited Opening Balance', amount: Math.abs(val), source_type: 'opening' });
        }
      }
    }
  }

  for (const je of journalEntries) {
    for (const line of je.lines) {
      const acc = ensureAccount(line.account_name, line.account_type, line.normal);
      if (line.debit > 0) {
        acc.debit_total = round2(acc.debit_total + line.debit);
        acc.debits.push({
          date: je.date,
          jev_no: je.jev_no,
          payee: je.payee,
          description: je.description,
          amount: line.debit,
          source_type: je.source_type,
        });
      }
      if (line.credit > 0) {
        acc.credit_total = round2(acc.credit_total + line.credit);
        acc.credits.push({
          date: je.date,
          jev_no: je.jev_no,
          payee: je.payee,
          description: je.description,
          amount: line.credit,
          source_type: je.source_type,
        });
      }
    }
  }

  // Finalize T-Account ending balances & Trial Balance rows
  const TYPE_ORDER = { Asset: 1, Liabilities: 2, Equity: 3, Revenue: 4, Expense: 5 };
  const accounts = Array.from(accountMap.values())
    .map((acc) => {
      const net = acc.normal === 'debit'
        ? round2(acc.debit_total - acc.credit_total)
        : round2(acc.credit_total - acc.debit_total);
      acc.ending_balance = net;
      const tbDebit = acc.debit_total > acc.credit_total ? round2(acc.debit_total - acc.credit_total) : 0;
      const tbCredit = acc.credit_total > acc.debit_total ? round2(acc.credit_total - acc.debit_total) : 0;
      return {
        ...acc,
        trial_debit: tbDebit,
        trial_credit: tbCredit,
      };
    })
    .filter((a) => a.debit_total > 0 || a.credit_total > 0)
    .sort((a, b) => (TYPE_ORDER[a.account_type] || 99) - (TYPE_ORDER[b.account_type] || 99) || a.account_name.localeCompare(b.account_name));

  const trialBalanceTotalDebit = round2(accounts.reduce((s, a) => s + a.trial_debit, 0));
  const trialBalanceTotalCredit = round2(accounts.reduce((s, a) => s + a.trial_credit, 0));

  const journalTotalDebit = round2(journalEntries.reduce((s, j) => s + j.total_debit, 0));
  const journalTotalCredit = round2(journalEntries.reduce((s, j) => s + j.total_credit, 0));

  const manualEntriesByAccount = {};
  for (const je of journalEntries) {
    if (je.source_type !== 'manual_jev') continue;
    const mIdx = Number(je.date.slice(5, 7)) - 1;
    if (mIdx < 0 || mIdx > 11) continue;
    for (const l of je.lines) {
      const key = l.account_name.toLowerCase();
      if (!manualEntriesByAccount[key]) {
        manualEntriesByAccount[key] = {
          account_name: l.account_name,
          account_type: l.account_type,
          months: Array(12).fill(0),
          transactions: [],
        };
      }
      const signed = l.account_type === 'Revenue' || l.account_type === 'Liabilities' || l.account_type === 'Equity'
        ? round2(l.credit - l.debit)
        : round2(l.debit - l.credit);
      manualEntriesByAccount[key].months[mIdx] = round2(manualEntriesByAccount[key].months[mIdx] + signed);
      manualEntriesByAccount[key].transactions.push({
        date: je.date,
        month: mIdx + 1,
        year: targetYear,
        payee: je.payee,
        particulars: je.description,
        voucher_no: je.jev_no,
        source: 'manual_jev',
        amount: signed,
      });
    }
  }

  return {
    year: targetYear,
    month: targetMonth,
    general_journal: [...journalEntries].reverse(), // Newest first for UI
    journal_summary: {
      entry_count: journalEntries.length,
      total_debit: journalTotalDebit,
      total_credit: journalTotalCredit,
      is_balanced: Math.abs(journalTotalDebit - journalTotalCredit) < 0.01,
    },
    t_accounts: accounts,
    trial_balance: {
      rows: accounts.map((a) => ({
        account_name: a.account_name,
        account_type: a.account_type,
        debit_total: a.debit_total,
        credit_total: a.credit_total,
        trial_debit: a.trial_debit,
        trial_credit: a.trial_credit,
      })),
      total_debit: trialBalanceTotalDebit,
      total_credit: trialBalanceTotalCredit,
      variance: round2(trialBalanceTotalDebit - trialBalanceTotalCredit),
      is_balanced: Math.abs(trialBalanceTotalDebit - trialBalanceTotalCredit) < 0.01,
    },
    manual_adjustments: Object.values(manualEntriesByAccount),
  };
}
