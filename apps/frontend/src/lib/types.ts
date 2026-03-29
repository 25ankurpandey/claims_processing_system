/**
 * Frontend shared types — mirrors libs/shared/types/src/frontend.ts
 * These are standalone const objects (no TypeScript enums) for safe use in Next.js.
 * Kept in sync with libs/shared/enums/src/index.ts and libs/shared/types/src/
 */

export const ServiceType = {
  CONSULTATION: 'CONSULTATION',
  DIAGNOSTIC: 'DIAGNOSTIC',
  PROCEDURE: 'PROCEDURE',
  PRESCRIPTION: 'PRESCRIPTION',
  THERAPY: 'THERAPY',
  EMERGENCY: 'EMERGENCY',
  PREVENTIVE: 'PREVENTIVE',
  MENTAL_HEALTH: 'MENTAL_HEALTH',
  DENTAL: 'DENTAL',
  VISION: 'VISION',
} as const;

export const ClaimStatus = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
  DENIED: 'DENIED',
  PAID: 'PAID',
  DISPUTED: 'DISPUTED',
  CLOSED: 'CLOSED',
} as const;

export const LineItemStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DENIED: 'DENIED',
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export const DenialReason = {
  NOT_COVERED: 'NOT_COVERED',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  DEDUCTIBLE_NOT_MET: 'DEDUCTIBLE_NOT_MET',
  PRE_AUTH_REQUIRED: 'PRE_AUTH_REQUIRED',
  OUT_OF_NETWORK: 'OUT_OF_NETWORK',
  DUPLICATE_CLAIM: 'DUPLICATE_CLAIM',
  INVALID_DIAGNOSIS: 'INVALID_DIAGNOSIS',
  POLICY_INACTIVE: 'POLICY_INACTIVE',
} as const;

export const LimitPeriod = {
  PER_VISIT: 'PER_VISIT',
  ANNUAL: 'ANNUAL',
  LIFETIME: 'LIFETIME',
} as const;

export type ServiceTypeValue = typeof ServiceType[keyof typeof ServiceType];
export type ClaimStatusValue = typeof ClaimStatus[keyof typeof ClaimStatus];
export type LineItemStatusValue = typeof LineItemStatus[keyof typeof LineItemStatus];
export type DenialReasonValue = typeof DenialReason[keyof typeof DenialReason];
export type LimitPeriodValue = typeof LimitPeriod[keyof typeof LimitPeriod];

export const ALL_SERVICE_TYPES = Object.values(ServiceType);
export const ALL_CLAIM_STATUSES = Object.values(ClaimStatus);
export const ALL_LIMIT_PERIODS = Object.values(LimitPeriod);

// Domain interfaces used for typed API responses
export interface IMember {
  id: number; first_name: string; last_name: string;
  email: string; date_of_birth: string; policy?: IPolicy;
}
export interface ICoverageRule {
  id: number; policy_id: number; service_type: ServiceTypeValue;
  is_covered: boolean; coverage_percentage: number; max_amount: number;
  limit_period: LimitPeriodValue; requires_pre_auth: boolean;
}
export interface IPolicy {
  id: number; policy_number: string; member_id: number;
  member?: IMember; effective_date: string; expiration_date: string;
  is_active: boolean; annual_deductible: number; annual_max_benefit: number;
  coverageRules?: ICoverageRule[];
}
export interface ILineItem {
  id: number; claim_id: number; service_type: ServiceTypeValue;
  description: string; billed_amount: number; approved_amount: number;
  status: LineItemStatusValue; denial_reason?: DenialReasonValue; explanation?: string;
}
export interface IClaim {
  id: number; claim_number: string; member_id: number; policy_id: number;
  member?: IMember; policy?: IPolicy; lineItems?: ILineItem[];
  provider_name: string; provider_npi?: string; diagnosis_code: string;
  date_of_service: string; status: ClaimStatusValue;
  total_amount: number; approved_amount: number; paid_amount: number;
  submitted_at: string; adjudicated_at?: string;
}
export interface IClaimAdjudicationResult {
  claimStatus: ClaimStatusValue;
  totalApproved: number;
  lineItemResults: Array<{
    lineItemId: number; status: LineItemStatusValue;
    approvedAmount: number; denialReason?: DenialReasonValue; explanation: string;
  }>;
}
