'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import type { CollectionItem } from '@/app/dashboard/collection/page';

interface Props {
  item: CollectionItem | null;
}

const GREEN = '#064e3b';

// Convert a peso amount into words, e.g. 13750.5 -> "THIRTEEN THOUSAND SEVEN HUNDRED FIFTY PESOS AND 50/100 ONLY"
export const amountToWords = (amount: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const chunk = (n: number): string => {
    let out = '';
    if (n >= 100) {
      out += `${ones[Math.floor(n / 100)]} HUNDRED `;
      n %= 100;
    }
    if (n >= 20) {
      out += `${tens[Math.floor(n / 10)]} `;
      n %= 10;
    }
    if (n > 0) out += `${ones[n]} `;
    return out;
  };

  const toWords = (n: number): string => {
    if (n === 0) return 'ZERO';
    const scales = [
      { value: 1_000_000_000, label: 'BILLION' },
      { value: 1_000_000, label: 'MILLION' },
      { value: 1_000, label: 'THOUSAND' },
    ];
    let out = '';
    for (const s of scales) {
      if (n >= s.value) {
        out += `${chunk(Math.floor(n / s.value))}${s.label} `;
        n %= s.value;
      }
    }
    out += chunk(n);
    return out.replace(/\s+/g, ' ').trim();
  };

  const safe = Math.max(0, Number(amount) || 0);
  const pesos = Math.floor(safe);
  const centavos = Math.round((safe - pesos) * 100);
  const unit = pesos === 1 ? 'PESO' : 'PESOS';
  return centavos > 0
    ? `${toWords(pesos)} ${unit} AND ${String(centavos).padStart(2, '0')}/100 ONLY`
    : `${toWords(pesos)} ${unit} ONLY`;
};

const peso = (n?: number) =>
  `₱${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const categoryLabel = (tab: CollectionItem['tab']) => {
  switch (tab) {
    case 'credit': return 'Credit';
    case 'sales': return 'Sales';
    case 'services': return 'Services';
    default: return 'Collection';
  }
};

// Build itemized particulars lines for the receipt body
const buildLines = (item: CollectionItem): { description: string; detail?: string; amount: number }[] => {
  if (item.tab === 'credit') {
    const lines: { description: string; detail?: string; amount: number }[] = [];

    if (item.loans && item.loans.length > 0) {
      for (const loan of item.loans) {
        if (loan.principal_amount && loan.principal_amount > 0) {
          lines.push({ description: loan.loan_account || 'Loans Payable', amount: loan.principal_amount });
        }
        if (loan.interest_amount && loan.interest_amount > 0) {
          lines.push({ description: loan.interest_account || 'Interest Received', amount: loan.interest_amount });
        }
        if (loan.fines_amount && loan.fines_amount > 0) {
          lines.push({ description: loan.fines_account || 'Fines & Penalties', amount: loan.fines_amount });
        }
      }
    } else {
      const account = item.loan_account || item.particulars || 'Loans Payable';
      const principal = item.principal_amount || 0;
      const interest = item.interest_amount || 0;
      const fines = item.fines_amount || 0;

      if (principal > 0) {
        lines.push({ description: account, amount: principal });
      }
      if (interest > 0) {
        lines.push({ description: item.interest_account || 'Interest Received', amount: interest });
      }
      if (fines > 0) {
        lines.push({ description: item.fines_account || 'Fines & Penalties', amount: fines });
      }
    }

    if (item.common_share_amount && item.common_share_amount > 0) {
      lines.push({ description: 'Common Share', amount: item.common_share_amount });
    }

    if (lines.length > 0) return lines;
    return [{ description: item.loan_account || item.particulars || 'Loans Payable', amount: item.amount }];
  }
  if (item.tab === 'sales') {
    const qty = item.quantity || 1;
    return [{
      description: item.item_name || 'Store Item',
      detail: `${qty} pc${qty > 1 ? 's' : ''} @ ${peso(item.unit_price || item.amount / qty)}`,
      amount: item.amount,
    }];
  }
  if (item.tab === 'services') {
    const qty = item.service_copies || 1;
    return [{
      description: item.service_type || 'Service',
      detail: `${qty} unit${qty > 1 ? 's' : ''} @ ${peso(item.service_rate || item.amount / qty)}`,
      amount: item.amount,
    }];
  }
  return [{ description: item.particulars || 'Collection', amount: item.amount }];
};

const PAYMENT_METHODS: CollectionItem['payment_method'][] = ['Cash', 'GCash', 'Bank Transfer', 'Cheque', 'Cash in Vault'];

function ReceiptCopy({ item, copyLabel }: { item: CollectionItem; copyLabel?: string }) {
  const lines = buildLines(item);
  const cell: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #d1d5db', fontSize: '11px' };

  return (
    <div style={{ border: `1.5px solid ${GREEN}`, borderRadius: '6px', padding: '18px 22px', boxSizing: 'border-box', breakInside: 'avoid' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${GREEN}`, paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/Coop.jpeg" alt="UC-METC MPC Logo" style={{ height: '44px', width: '44px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              University of Cebu METC Multipurpose Cooperative
            </div>
            <div style={{ fontSize: '9.5px', color: '#4b5563', marginTop: '2px' }}>
              Alumnos, Mambaling, Cebu City • CDA Reg. No. 9520-1070000000029729
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {copyLabel && (
            <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{copyLabel}</div>
          )}
          <div style={{ fontSize: '9px', color: '#6b7280', marginTop: copyLabel ? '4px' : '0' }}>Receipt No.</div>
          <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'monospace', color: '#b91c1c' }}>{item.or_no}</div>
        </div>
      </div>

      {/* Title + Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '12px 0 10px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.12em', color: '#111827' }}>ACKNOWLEDGEMENT RECEIPT</div>
        <div style={{ fontSize: '11px' }}>
          <span style={{ color: '#6b7280' }}>Date: </span>
          <span style={{ fontWeight: 700, borderBottom: '1px solid #111827', padding: '0 6px' }}>{formatDate(item.date)}</span>
        </div>
      </div>

      {/* Received from */}
      <div style={{ fontSize: '11px', lineHeight: 1.9 }}>
        <div>
          <span style={{ color: '#374151' }}>RECEIVED from </span>
          <span style={{ fontWeight: 700, borderBottom: '1px solid #111827', padding: '0 6px', textTransform: 'uppercase' }}>{item.payor_name}</span>
          {item.member_id && (
            <span style={{ color: '#6b7280' }}> (Member ID: <span style={{ fontFamily: 'monospace' }}>{item.member_id}</span>)</span>
          )}
        </div>
        <div>
          <span style={{ color: '#374151' }}>the sum of </span>
          <span style={{ fontWeight: 700, borderBottom: '1px solid #111827', padding: '0 6px' }}>{amountToWords(item.amount)}</span>
          <span style={{ fontWeight: 800 }}> ({peso(item.amount)})</span>
        </div>
        <div style={{ color: '#374151' }}>
          in payment for the following <span style={{ fontWeight: 700 }}>({categoryLabel(item.tab)})</span>:
        </div>
      </div>

      {/* Particulars */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
        <thead>
          <tr style={{ backgroundColor: GREEN, color: '#ffffff' }}>
            <th style={{ ...cell, textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: 'none' }}>Particulars</th>
            <th style={{ ...cell, textAlign: 'right', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: 'none', width: '140px' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td style={cell}>
                <span style={{ fontWeight: 600 }}>{l.description}</span>
                {l.detail && <span style={{ color: '#6b7280' }}> — {l.detail}</span>}
              </td>
              <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>{peso(l.amount)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, textAlign: 'right', fontWeight: 800, borderBottom: `2px solid ${GREEN}`, textTransform: 'uppercase' }}>Total Amount Received</td>
            <td style={{ ...cell, textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', fontSize: '12.5px', color: GREEN, borderBottom: `2px solid ${GREEN}` }}>{peso(item.amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Payment method + remarks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '12px', fontSize: '10.5px' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: '4px' }}>Mode of Payment:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {PAYMENT_METHODS.map(m => {
              const isSelected = item.payment_method === m || (m === 'Cheque' && item.payment_method === 'Check');
              const showRef = isSelected && item.reference_no && (m === 'GCash' || m === 'Bank Transfer');
              const showCheque = isSelected && m === 'Cheque' && (item.reference_no || item.bank_name);
              return (
                <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    width: '11px', height: '11px', border: '1px solid #111827', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, lineHeight: 1,
                  }}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span>
                    {m}
                    {showRef ? ` (${m === 'GCash' ? `Ref: ****${item.reference_no}` : `Ref: ${item.reference_no}`})` : ''}
                    {showCheque ? ` (${item.bank_name ? `${item.bank_name} ` : ''}Chk #: ${item.reference_no})` : ''}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        {item.remarks && (
          <div style={{ maxWidth: '45%', textAlign: 'right' }}>
            <span style={{ fontWeight: 700, color: '#374151' }}>Remarks: </span>
            <span style={{ fontStyle: 'italic', color: '#4b5563' }}>{item.remarks}</span>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', marginTop: '32px', fontSize: '10.5px', textAlign: 'center' }}>
        <div>
          <div style={{ borderBottom: '1px solid #111827', paddingBottom: '2px', fontWeight: 700, textTransform: 'uppercase', minHeight: '14px' }}>
            {item.payor_name}
          </div>
          <div style={{ color: '#6b7280', marginTop: '3px' }}>Member / Payor&apos;s Signature</div>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid #111827', paddingBottom: '2px', fontWeight: 700, textTransform: 'uppercase', minHeight: '14px' }}>
            {item.collected_by}
          </div>
          <div style={{ color: '#6b7280', marginTop: '3px' }}>Received by (Cashier / Collector)</div>
        </div>
      </div>

      <div style={{ marginTop: '14px', fontSize: '8.5px', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>
        This acknowledgement receipt is system-generated by the UC-METC MPC Loan Monitoring System. Please keep this copy for your records.
      </div>
    </div>
  );
}

export default function CollectionReceiptPrint({ item }: Props) {
  if (!item || typeof document === 'undefined') return null;

  return createPortal(
    <div id="collection-receipt-print-section" className="hidden print:block" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111827', background: '#ffffff' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 10mm 12mm; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          body > *:not(#collection-receipt-print-section) { display: none !important; }
          #collection-receipt-print-section { display: block !important; width: 100% !important; }
        }
      `}} />
      <ReceiptCopy item={item} />
    </div>,
    document.body
  );
}
