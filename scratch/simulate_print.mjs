import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function cleanCategoryName(name) {
  if (!name) return 'Operation';
  return name.replace(/^revolving\s*fund\s*-\s*/i, '').replace(/^stl\s*-\s*/i, '').replace(/^short\s*term\s*loan\s*-\s*/i, '').trim();
}

function formatCibAccountName(bankName) {
  const b = (bankName || '').trim().toUpperCase();
  if (!b) return 'CIB-MBTC';
  if (b.includes('METRO') || b.includes('MBTC')) return 'CIB-MBTC';
  if (b.includes('BDO')) return 'CIB-BDO';
  if (b.includes('LAND') || b.includes('LBP')) return 'CIB-LBP';
  if (b.includes('PNB')) return 'CIB-PNB';
  if (b.includes('DBP')) return 'CIB-DBP';
  if (b.includes('BPI')) return 'CIB-BPI';
  if (b.startsWith('CIB-')) return b;
  if (b.startsWith('CIB - ')) return `CIB-${b.slice(6)}`;
  if (b.startsWith('CIB ')) return `CIB-${b.slice(4)}`;
  return `CIB-${b.replace(/\s*BANK\b/i, '').trim()}`;
}

async function run() {
  try {
    const cvRes = await pool.query("SELECT * FROM check_vouchers WHERE voucher_no = '26-274'");
    const cv = cvRes.rows[0];
    const rfRes = await pool.query("SELECT * FROM revolving_fund_liquidations WHERE check_voucher_id = $1", [cv.id]);
    const rf = rfRes.rows[0];
    const itemsRes = await pool.query("SELECT * FROM rf_liquidation_items WHERE liquidation_id = $1 ORDER BY sort_order ASC", [rf.id]);
    const lfItems = itemsRes.rows;

    let details = cv.details;
    if (typeof details === 'string') details = JSON.parse(details);

    // Let's run getBalancedCvRows from UnifiedCvLfPrintModal.tsx
    const activeItems = (lfItems || []).filter(it => !it.is_cancelled);
    const rows = [];
    let debitTotal = 0;
    let creditTotal = 0;

    const isBroadCategoryDesc = (desc) => {
      const d = (desc || '').trim().toLowerCase();
      return ['operation', 'service', 'services', 'merchandise', 'stl', 'short term loan', 'revolving fund', 'loan', 'petty cash'].includes(d) ||
             /^(revolving\s*fund|stl|short\s*term\s*loan)\s*-\s*(operation|service|services|stl)$/i.test(d);
    };

    const debitDetails = details.filter(d => {
      const val = typeof d.amount === 'number' ? d.amount : parseFloat(d.amount || d.debit || 0);
      const desc = d.book_of_account || d.description || '';
      const isCredit = d.is_credit === true || /^(cib\b|cash\s*in\s*bank)/i.test(desc) || val < 0;
      return !isCredit && val > 0;
    });

    const detailsAreOnlyCategories = debitDetails.length > 0 && debitDetails.every(d => isBroadCategoryDesc(d.book_of_account || d.description || ''));
    const shouldUseActiveItems = activeItems.length > 0 && (debitDetails.length === 0 || detailsAreOnlyCategories);
    console.log("shouldUseActiveItems:", shouldUseActiveItems, "debitDetails.length:", debitDetails.length, "detailsAreOnlyCategories:", detailsAreOnlyCategories);

    if (shouldUseActiveItems) {
      // ...
    } else if (details.length > 0) {
      for (const item of details) {
        const desc = item.book_of_account || item.description || '';
        const rawVal = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
        const isCreditItem = item.is_credit === true ||
                             item.isAutoCredit === true ||
                             /^(cib\b|cash\s*in\s*bank|revolving\s*fund|rf\s*[-#]|petty\s*cash\s*fund)/i.test(desc.trim()) ||
                             rawVal < 0 ||
                             (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);
        if (isCreditItem) {
          const creditVal = rawVal < 0 ? Math.abs(rawVal) : (item.credit !== null && item.credit !== undefined && item.credit !== '' ? Number(item.credit) : (item.debit ? Number(item.debit) : (rawVal > 0 ? rawVal : null)));
          rows.push({ description: desc, debit: null, credit: creditVal, item });
          if (creditVal) creditTotal += creditVal;
        } else if (rawVal > 0) {
          rows.push({ description: desc, debit: rawVal, credit: null, item });
          debitTotal += rawVal;
        }
      }
    }

    console.log("Result rows count:", rows.length);
    console.log("debitTotal:", debitTotal, "creditTotal:", creditTotal);
    rows.forEach((r, i) => {
      if (r.credit !== null) {
        console.log(`Credit row ${i}:`, r.description, "credit:", r.credit, "rawItem:", JSON.stringify(r.item));
      }
    });

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
