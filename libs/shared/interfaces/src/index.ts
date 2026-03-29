import { ClaimStatus, LineItemStatus, ServiceType, LimitPeriod, DenialReason } from '@claims/shared/enums';

// ─── Member ─────────────────────────────────────────────────
export interface IMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: Date;
  policy_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

// ─── Policy ─────────────────────────────────────────────────
export interface IPolicy {
  id: number;
  policy_number: string;
  member_id: number;
  effective_date: Date;
  expiration_date: Date;
  is_active: boolean;
  annual_deductible: number;
  annual_max_benefit: number;
  coverageRules?: ICoverageRule[];
  created_at?: Date;
  updated_at?: Date;
}

// ─── Coverage Rule ──────────────────────────────────────────
export interface ICoverageRule {
  id: number;
  policy_id: number;
  service_type: ServiceType;
  is_covered: boolean;
  coverage_percentage: number;
  max_amount: number;
  limit_period: LimitPeriod;
  requires_pre_auth: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// ─── Claim ──────────────────────────────────────────────────
export interface IClaim {
  id: number;
  claim_number: string;
  member_id: number;
  policy_id: number;
  provider_name: string;
  provider_npi?: string;
  diagnosis_code: string;
  date_of_service: Date;
  status: ClaimStatus;
  total_amount: number;
  approved_amount: number;
  paid_amount: number;
  submitted_at: Date;
  adjudicated_at?: Date;
  lineItems?: ILineItem[];
  created_at?: Date;
  updated_at?: Date;
}

// ─── Line Item ──────────────────────────────────────────────
export interface ILineItem {
  id: number;
  claim_id: number;
  service_type: ServiceType;
  description: string;
  billed_amount: number;
  approved_amount: number;
  status: LineItemStatus;
  denial_reason?: DenialReason;
  explanation?: string;
  created_at?: Date;
  updated_at?: Date;
}

// ─── API Response Types ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  code: string;
  message: string;
  type: string;
  details?: unknown;
}

// ─── Adjudication: per-line-item result ─────────────────────
export interface ILineItemAdjudicationResult {
  lineItemId: number;
  status: LineItemStatus;
  approvedAmount: number;
  denialReason?: DenialReason;
  explanation: string;
}

// ─── Adjudication: full claim result ────────────────────────
export interface IClaimAdjudicationResult {
  claimStatus: ClaimStatus;
  totalApproved: number;
  lineItemResults: ILineItemAdjudicationResult[];
}

// ─── Submit Claim Input ──────────────────────────────────────
export interface ISubmitClaimLineItem {
  service_type: ServiceType;
  description: string;
  billed_amount: number;
}

export interface ISubmitClaimInput {
  member_id: number;
  policy_id: number;
  provider_name: string;
  provider_npi?: string;
  diagnosis_code: string;
  date_of_service: Date;
  line_items: ISubmitClaimLineItem[];
}

// ─── Legacy aliases (kept for backwards compatibility) ───────
/** @deprecated Use ILineItemAdjudicationResult */
export interface AdjudicationResult {
  line_item_id: number;
  status: LineItemStatus;
  approved_amount: number;
  denial_reason?: DenialReason;
  explanation: string;
}

/** @deprecated Use IClaimAdjudicationResult */
export interface ClaimAdjudicationResult {
  claim_id: number;
  claim_status: ClaimStatus;
  total_billed: number;
  total_approved: number;
  line_items: AdjudicationResult[];
}
