/**
 * libs/shared/types/src/index.ts
 *
 * Shared type definitions for domain entities.
 * These interfaces are the contract between the backend data layer and
 * the frontend — used for typed API responses.
 *
 * Used by:
 *   - Backend:  @claims/shared/types (via tsconfig path alias)
 *   - Frontend: @/lib/types (copied inline for Next.js compatibility)
 */
import { ClaimStatus, LineItemStatus, ServiceType, LimitPeriod, DenialReason } from '@claims/shared/enums';

// ─── Member ──────────────────────────────────────────────────
export interface IMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string | Date;
  policy?: IPolicy;
  created_at?: string;
  updated_at?: string;
}

// ─── Coverage Rule ────────────────────────────────────────────
export interface ICoverageRule {
  id: number;
  policy_id: number;
  service_type: ServiceType;
  is_covered: boolean;
  coverage_percentage: number;
  max_amount: number;
  limit_period: LimitPeriod;
  requires_pre_auth: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── Policy ───────────────────────────────────────────────────
export interface IPolicy {
  id: number;
  policy_number: string;
  member_id: number;
  member?: IMember;
  effective_date: string | Date;
  expiration_date: string | Date;
  is_active: boolean;
  annual_deductible: number;
  annual_max_benefit: number;
  coverageRules?: ICoverageRule[];
  created_at?: string;
  updated_at?: string;
}

// ─── Line Item ────────────────────────────────────────────────
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
  created_at?: string;
  updated_at?: string;
}

// ─── Claim ────────────────────────────────────────────────────
export interface IClaim {
  id: number;
  claim_number: string;
  member_id: number;
  policy_id: number;
  member?: IMember;
  policy?: IPolicy;
  lineItems?: ILineItem[];
  provider_name: string;
  provider_npi?: string;
  diagnosis_code: string;
  date_of_service: string | Date;
  status: ClaimStatus;
  total_amount: number;
  approved_amount: number;
  paid_amount: number;
  submitted_at: string;
  adjudicated_at?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── API Response ─────────────────────────────────────────────
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

// ─── Adjudication Result ──────────────────────────────────────
export interface ILineItemAdjudicationResult {
  lineItemId: number;
  status: LineItemStatus;
  approvedAmount: number;
  denialReason?: DenialReason;
  explanation: string;
}

export interface IClaimAdjudicationResult {
  claimStatus: ClaimStatus;
  totalApproved: number;
  lineItemResults: ILineItemAdjudicationResult[];
}

// ─── Submit Claim Input ───────────────────────────────────────
export interface ISubmitClaimInput {
  member_id: number;
  policy_id: number;
  provider_name: string;
  provider_npi?: string;
  diagnosis_code: string;
  date_of_service: string;
  line_items: Array<{
    service_type: ServiceType;
    description: string;
    billed_amount: number;
  }>;
}
