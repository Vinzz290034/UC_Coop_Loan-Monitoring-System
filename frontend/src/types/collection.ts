export type CollectionTab = 'all' | 'credit' | 'sales_services' | 'sales_registry' | 'billing';

export interface TabConfig {
  id: CollectionTab;
  label: string;
  description: string;
}

export interface CollectionLoanPayment {
  loan_account: string;
  principal_amount?: number;
  interest_account: string;
  interest_amount?: number;
  fines_account: string;
  fines_amount?: number;
}

export interface FormLoanEntry {
  id: string;
  loan_account: string;
  principal_amount: string;
  interest_account: string;
  interest_amount: string;
  fines_account: string;
  fines_amount: string;
}

export interface CollectionMerchandiseItem {
  id: string;
  item: string;
  description: string;
  size: string;
  quantity: string | number;
  cost_price: string | number;
  selling_price: string | number;
  revenue?: number;
  gross_profit?: number;
}

export type PaymentMethod =
  | 'Hand in'
  | 'salary deduction'
  | 'Gcash'
  | 'Bank transfer'
  | 'cheque'
  | 'Cash'
  | 'Salary Deduction'
  | 'GCash'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Cash in Vault'
  | 'Check'
  | 'Payroll Deduction'
  | string;

export type CollectionStatus =
  | 'Cash in vault'
  | 'Cash in MBTC'
  | 'Cash in BDO'
  | 'completed'
  | 'on process'
  | 'filed'
  | string;

export type CollectionRemarks =
  | 'edit'
  | 'sealed'
  | string;

export interface CollectionItem {
  id: string;
  tab: 'credit' | 'sales' | 'services' | 'sales_services' | 'others';
  date: string;
  or_no: string;
  payor_name: string;
  member_id?: string;
  // Credit specific
  loans?: CollectionLoanPayment[];
  loan_account?: string;
  principal_amount?: number;
  interest_account?: string;
  interest_amount?: number;
  fines_account?: string;
  fines_amount?: number;
  common_share_amount?: number;
  membership_fee?: number;
  billing_amount?: number;
  particulars_amount?: number;
  // Sales specific (itemized & multi-item)
  items?: CollectionMerchandiseItem[];
  item_name?: string;
  item_category?: string;
  quantity?: number;
  unit_price?: number;
  size?: string;
  cost_price?: number;
  selling_price?: number;
  revenue?: number;
  gross_profit?: number;
  // Services specific
  service_type?: string;
  service_copies?: number;
  service_rate?: number;
  // Others specific
  particulars?: string;
  other_category?: string;
  // General
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  bank_name?: string;
  status?: CollectionStatus;
  remarks?: CollectionRemarks;
  collected_by: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface MemberOption {
  id: string;
  name: string;
  member_no: string;
}

