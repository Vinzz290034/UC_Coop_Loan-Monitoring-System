/**
 * High-Precision Mathematical Computation Core for Loan Amortization Schedules.
 * Enforces strict financial rounding (2 decimal places) and balances final pennies
 * in the last installment to ensure cumulative principal matches original debt.
 */

/**
 * Adds a specific number of months to a base date.
 * @param {string|Date} baseDate 
 * @param {number} months 
 * @returns {string} ISO Date string (YYYY-MM-DD)
 */
export const addMonths = (baseDate, months) => {
  const d = new Date(baseDate);
  // Save day of month to avoid issues with shorter months
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0); // Rollback to last day of previous month
  }
  return d.toISOString().split('T')[0];
};

/**
 * Calculates Flat-Rate (Static) Monthly Amortization Schedule.
 * Formula:
 *   Total Interest = Principal * Annual Rate * (Term / 12)
 *   Monthly Interest = Total Interest / Term
 *   Monthly Principal = Principal / Term
 *   Monthly Total = Monthly Principal + Monthly Interest
 * 
 * @param {number} principal 
 * @param {number} annualRate - Decimal (e.g. 0.05 for 5%)
 * @param {number} termMonths 
 * @param {string|Date} startDate - Disbursement date
 * @returns {Array} List of schedule installments
 */
export const calculateFlatRate = (principal, annualRate, termMonths, startDate) => {
  const term = parseInt(termMonths, 10);
  const p = parseFloat(principal);
  const rate = parseFloat(annualRate);

  const totalInterest = p * rate * (term / 12);
  const monthlyInterest = Math.round((totalInterest / term) * 100) / 100;
  const monthlyPrincipal = Math.round((p / term) * 100) / 100;
  const monthlyTotal = monthlyPrincipal + monthlyInterest;

  const schedule = [];
  let principalPaidAccumulator = 0;
  let interestPaidAccumulator = 0;

  for (let i = 1; i <= term; i++) {
    const dueDate = addMonths(startDate, i);
    let principalDue = monthlyPrincipal;
    let interestDue = monthlyInterest;

    // Adjust final installment for rounding differences
    if (i === term) {
      principalDue = Math.round((p - principalPaidAccumulator) * 100) / 100;
      interestDue = Math.round((totalInterest - interestPaidAccumulator) * 100) / 100;
    }

    principalPaidAccumulator += principalDue;
    interestPaidAccumulator += interestDue;

    schedule.push({
      installment_number: i,
      due_date: dueDate,
      principal_due: principalDue,
      interest_due: interestDue,
      total_due: Math.round((principalDue + interestDue) * 100) / 100
    });
  }

  return schedule;
};

/**
 * Calculates Diminishing Balance (Reducing Principal) Amortization Schedule.
 * Formula:
 *   PMT = (Principal * r) / (1 - (1 + r)^(-n))
 *   where r = Monthly Interest Rate (Annual Rate / 12)
 *   where n = Term in months
 * 
 *   For each installment:
 *     Interest Due = Remaining Principal * r
 *     Principal Due = PMT - Interest Due
 *     Remaining Principal = Remaining Principal - Principal Due
 * 
 * @param {number} principal 
 * @param {number} annualRate - Decimal (e.g. 0.08 for 8%)
 * @param {number} termMonths 
 * @param {string|Date} startDate 
 * @returns {Array} List of schedule installments
 */
export const calculateDiminishingBalance = (principal, annualRate, termMonths, startDate) => {
  const term = parseInt(termMonths, 10);
  const p = parseFloat(principal);
  const r = parseFloat(annualRate) / 12; // Monthly rate

  const schedule = [];
  
  if (r === 0) {
    // If interest rate is zero, behaves like flat rate flat principal
    return calculateFlatRate(principal, 0, termMonths, startDate);
  }

  // Calculate fixed monthly installment (PMT)
  const pmt = (p * r) / (1 - Math.pow(1 + r, -term));
  const roundedPmt = Math.round(pmt * 100) / 100;

  let remainingPrincipal = p;
  let principalPaidAccumulator = 0;

  for (let i = 1; i <= term; i++) {
    const dueDate = addMonths(startDate, i);
    
    // Interest is calculated on the outstanding balance
    const interestDue = Math.round((remainingPrincipal * r) * 100) / 100;
    let principalDue = Math.round((roundedPmt - interestDue) * 100) / 100;

    // Adjust final installment
    if (i === term) {
      principalDue = Math.round((p - principalPaidAccumulator) * 100) / 100;
    }

    remainingPrincipal -= principalDue;
    principalPaidAccumulator += principalDue;

    schedule.push({
      installment_number: i,
      due_date: dueDate,
      principal_due: principalDue,
      interest_due: interestDue,
      total_due: Math.round((principalDue + interestDue) * 100) / 100
    });
  }

  return schedule;
};
