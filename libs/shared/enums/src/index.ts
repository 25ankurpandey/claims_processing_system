/**
 * Claim-level lifecycle states
 */
export enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  DENIED = 'DENIED',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  CLOSED = 'CLOSED',
}

/**
 * Individual line-item states within a claim
 */
export enum LineItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

/**
 * Types of medical/insurance services
 */
export enum ServiceType {
  CONSULTATION = 'CONSULTATION',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PROCEDURE = 'PROCEDURE',
  PRESCRIPTION = 'PRESCRIPTION',
  THERAPY = 'THERAPY',
  EMERGENCY = 'EMERGENCY',
  PREVENTIVE = 'PREVENTIVE',
  MENTAL_HEALTH = 'MENTAL_HEALTH',
  DENTAL = 'DENTAL',
  VISION = 'VISION',
}

/**
 * Coverage rule limit period
 */
export enum LimitPeriod {
  PER_VISIT = 'PER_VISIT',
  ANNUAL = 'ANNUAL',
  LIFETIME = 'LIFETIME',
}

/**
 * Denial reason codes for explanation capability
 */
export enum DenialReason {
  NOT_COVERED = 'NOT_COVERED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  DEDUCTIBLE_NOT_MET = 'DEDUCTIBLE_NOT_MET',
  PRE_AUTH_REQUIRED = 'PRE_AUTH_REQUIRED',
  OUT_OF_NETWORK = 'OUT_OF_NETWORK',
  DUPLICATE_CLAIM = 'DUPLICATE_CLAIM',
  INVALID_DIAGNOSIS = 'INVALID_DIAGNOSIS',
  POLICY_INACTIVE = 'POLICY_INACTIVE',
}
