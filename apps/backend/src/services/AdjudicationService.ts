import { inject } from 'inversify';
import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { ClaimDal } from '../repositories/ClaimDal';
import { PolicyDal } from '../repositories/PolicyDal';
import { CoverageRule } from '../models/CoverageRule';
import { LineItem } from '../models/LineItem';
import { ClaimStatus, LineItemStatus, DenialReason, ServiceType, LimitPeriod } from '@claims/shared/enums';
import { ILineItemAdjudicationResult, IClaimAdjudicationResult } from '@claims/shared/interfaces';
import { Logger } from '../utils/logging/Logger';

@provideSingleton(TYPES.AdjudicationService)
export class AdjudicationService {
  constructor(
    @inject(TYPES.ClaimDal) private claimDal: ClaimDal,
    @inject(TYPES.PolicyDal) private policyDal: PolicyDal,
  ) {}

  async adjudicate(claimId: number): Promise<IClaimAdjudicationResult> {
    const claim = await this.claimDal.findById(claimId);
    if (!claim) throw new Error(`Claim ${claimId} not found`);

    const policy = await this.policyDal.findById(claim.policy_id);
    if (!policy) throw new Error(`Policy ${claim.policy_id} not found`);

    const coverageRules: CoverageRule[] = (policy as any).coverageRules || [];
    const lineItems: LineItem[] = (claim as any).lineItems || [];

    // Step 1: Policy validation
    const policyValidation = this.validatePolicy(policy, claim.date_of_service);
    if (!policyValidation.valid) {
      const results = lineItems.map((li) => ({
        lineItemId: li.id,
        status: LineItemStatus.DENIED as LineItemStatus,
        approvedAmount: 0,
        denialReason: DenialReason.POLICY_INACTIVE,
        explanation: policyValidation.reason!,
      }));
      await this.applyResults(claimId, results);
      return { claimStatus: ClaimStatus.DENIED, totalApproved: 0, lineItemResults: results };
    }

    // Step 2: Get annual deductible usage
    const year = new Date(claim.date_of_service).getFullYear();
    const totalApprovedThisYear = await this.claimDal.getTotalApprovedForYear(policy.id, year);
    let remainingDeductible = Math.max(0, Number(policy.annual_deductible) - totalApprovedThisYear);

    // Step 3: Evaluate each line item
    const results: ILineItemAdjudicationResult[] = [];
    let totalApproved = 0;

    for (const lineItem of lineItems) {
      const result = await this.evaluateLineItem(lineItem, coverageRules, policy, remainingDeductible);
      results.push(result);

      if (result.status === LineItemStatus.APPROVED) {
        totalApproved += result.approvedAmount;
        if (remainingDeductible > 0) {
          remainingDeductible = Math.max(0, remainingDeductible - result.approvedAmount);
        }
      }
    }

    // Step 4: Apply results
    await this.applyResults(claimId, results);

    // Step 5: Determine overall claim status
    const claimStatus = this.resolveClaimStatus(results);

    // Step 6: Update claim
    await this.claimDal.update(claimId, {
      status: claimStatus,
      approved_amount: totalApproved,
      adjudicated_at: new Date(),
    });

    Logger.info(`Claim ${(claim as any).claim_number} adjudicated: ${claimStatus}, approved $${totalApproved.toFixed(2)}`);
    return { claimStatus, totalApproved, lineItemResults: results };
  }

  private validatePolicy(policy: any, dateOfService: Date): { valid: boolean; reason?: string } {
    if (!policy.is_active) {
      return { valid: false, reason: 'Policy is not active. Claims cannot be processed against an inactive policy.' };
    }
    const serviceDate = new Date(dateOfService);
    const effectiveDate = new Date(policy.effective_date);
    const expirationDate = new Date(policy.expiration_date);
    if (serviceDate < effectiveDate || serviceDate > expirationDate) {
      return {
        valid: false,
        reason: `Date of service (${serviceDate.toISOString().split('T')[0]}) falls outside policy coverage period (${effectiveDate.toISOString().split('T')[0]} to ${expirationDate.toISOString().split('T')[0]}).`,
      };
    }
    return { valid: true };
  }

  private async evaluateLineItem(
    lineItem: LineItem,
    coverageRules: CoverageRule[],
    policy: any,
    remainingDeductible: number,
  ): Promise<ILineItemAdjudicationResult> {
    const billedAmount = Number(lineItem.billed_amount);
    const rule = coverageRules.find((r) => r.service_type === lineItem.service_type);

    if (!rule) {
      return {
        lineItemId: lineItem.id,
        status: LineItemStatus.DENIED,
        approvedAmount: 0,
        denialReason: DenialReason.NOT_COVERED,
        explanation: `${lineItem.service_type.replace('_', ' ')} services are not covered under your policy. No matching coverage rule found for this service type.`,
      };
    }

    if (!rule.is_covered) {
      return {
        lineItemId: lineItem.id,
        status: LineItemStatus.DENIED,
        approvedAmount: 0,
        denialReason: DenialReason.NOT_COVERED,
        explanation: `${lineItem.service_type.replace('_', ' ')} services are explicitly excluded from coverage under your policy.`,
      };
    }

    if (rule.requires_pre_auth) {
      return {
        lineItemId: lineItem.id,
        status: LineItemStatus.UNDER_REVIEW,
        approvedAmount: 0,
        explanation: `${lineItem.service_type.replace('_', ' ')} services require pre-authorization. This line item has been flagged for manual review.`,
      };
    }

    const maxPayable = Math.min(billedAmount, Number(rule.max_amount));
    const coveragePercentage = Number(rule.coverage_percentage) / 100;
    let approvedAmount = maxPayable * coveragePercentage;
    const explanationParts: string[] = [];
    explanationParts.push(
      `${lineItem.service_type.replace('_', ' ')} covered at ${rule.coverage_percentage}% up to $${Number(rule.max_amount).toFixed(2)} per ${rule.limit_period.toLowerCase().replace('_', ' ')}.`,
    );

    // Limit tracking
    const limitUsage = await this.checkLimitUsage(lineItem.service_type, rule, policy);
    const remainingLimit = Math.max(0, Number(rule.max_amount) - limitUsage);

    if (remainingLimit <= 0) {
      return {
        lineItemId: lineItem.id,
        status: LineItemStatus.DENIED,
        approvedAmount: 0,
        denialReason: DenialReason.LIMIT_EXCEEDED,
        explanation: `${lineItem.service_type.replace('_', ' ')} ${rule.limit_period.toLowerCase().replace('_', ' ')} limit of $${Number(rule.max_amount).toFixed(2)} has been fully exhausted. $${limitUsage.toFixed(2)} already used.`,
      };
    }

    if (approvedAmount > remainingLimit) {
      explanationParts.push(
        `Remaining ${rule.limit_period.toLowerCase().replace('_', ' ')} limit: $${remainingLimit.toFixed(2)} ($${limitUsage.toFixed(2)} already used of $${Number(rule.max_amount).toFixed(2)}).`,
      );
      approvedAmount = remainingLimit;
    }

    // Apply deductible
    if (remainingDeductible > 0) {
      const deductibleApplied = Math.min(approvedAmount, remainingDeductible);
      approvedAmount -= deductibleApplied;
      explanationParts.push(
        `Deductible applied: $${deductibleApplied.toFixed(2)} (remaining annual deductible was $${remainingDeductible.toFixed(2)}).`,
      );
    }

    approvedAmount = Math.round(approvedAmount * 100) / 100;

    if (approvedAmount <= 0) {
      return {
        lineItemId: lineItem.id,
        status: LineItemStatus.DENIED,
        approvedAmount: 0,
        denialReason: DenialReason.DEDUCTIBLE_NOT_MET,
        explanation: `${explanationParts.join(' ')} After applying deductible, no amount is payable.`,
      };
    }

    explanationParts.push(`Approved: $${approvedAmount.toFixed(2)} of $${billedAmount.toFixed(2)} billed.`);
    return {
      lineItemId: lineItem.id,
      status: LineItemStatus.APPROVED,
      approvedAmount,
      explanation: explanationParts.join(' '),
    };
  }

  private async checkLimitUsage(serviceType: ServiceType, rule: CoverageRule, policy: any): Promise<number> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (rule.limit_period) {
      case LimitPeriod.PER_VISIT:
        return 0;
      case LimitPeriod.ANNUAL:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case LimitPeriod.LIFETIME:
        startDate = new Date(2000, 0, 1);
        endDate = new Date(2099, 11, 31);
        break;
      default:
        return 0;
    }

    return this.claimDal.getApprovedAmountForServiceType(policy.id, serviceType, startDate, endDate);
  }

  private resolveClaimStatus(results: ILineItemAdjudicationResult[]): ClaimStatus {
    const hasApproved = results.some((r) => r.status === LineItemStatus.APPROVED);
    const hasDenied = results.some((r) => r.status === LineItemStatus.DENIED);
    const hasUnderReview = results.some((r) => r.status === LineItemStatus.UNDER_REVIEW);

    if (hasUnderReview) return ClaimStatus.UNDER_REVIEW;
    if (hasApproved && hasDenied) return ClaimStatus.PARTIALLY_APPROVED;
    if (hasApproved) return ClaimStatus.APPROVED;
    return ClaimStatus.DENIED;
  }

  private async applyResults(claimId: number, results: ILineItemAdjudicationResult[]): Promise<void> {
    for (const result of results) {
      await this.claimDal.updateLineItem(result.lineItemId, {
        status: result.status,
        approved_amount: result.approvedAmount,
        denial_reason: result.denialReason,
        explanation: result.explanation,
      });
    }
  }
}
