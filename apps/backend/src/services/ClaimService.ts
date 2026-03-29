import { inject } from 'inversify';
import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { ClaimDal } from '../repositories/ClaimDal';
import { AdjudicationService } from './AdjudicationService';
import { Claim, ClaimInput } from '../models/Claim';
import { LineItemInput } from '../models/LineItem';
import { ClaimStatus } from '@claims/shared/enums';
import { ISubmitClaimInput } from '@claims/shared/interfaces';
import { AppError } from '../utils/ErrUtils';
import { v4 as uuidv4 } from 'uuid';

const STATE_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  [ClaimStatus.SUBMITTED]: [ClaimStatus.UNDER_REVIEW],
  [ClaimStatus.UNDER_REVIEW]: [ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED, ClaimStatus.DENIED],
  [ClaimStatus.APPROVED]: [ClaimStatus.PAID, ClaimStatus.DISPUTED],
  [ClaimStatus.PARTIALLY_APPROVED]: [ClaimStatus.PAID, ClaimStatus.DISPUTED],
  [ClaimStatus.DENIED]: [ClaimStatus.DISPUTED],
  [ClaimStatus.DISPUTED]: [ClaimStatus.UNDER_REVIEW],
  [ClaimStatus.PAID]: [ClaimStatus.CLOSED],
  [ClaimStatus.CLOSED]: [],
};

@provideSingleton(TYPES.ClaimService)
export class ClaimService {
  constructor(
    @inject(TYPES.ClaimDal) private claimDal: ClaimDal,
    @inject(TYPES.AdjudicationService) private adjudicationService: AdjudicationService,
  ) {}

  async submitClaim(data: ISubmitClaimInput) {
    const claimNumber = `CLM-${uuidv4().slice(0, 8).toUpperCase()}`;
    const totalAmount = data.line_items.reduce((sum: number, li: { billed_amount: number }) => sum + li.billed_amount, 0);

    const claim = await this.claimDal.create({
      claim_number: claimNumber,
      member_id: data.member_id,
      policy_id: data.policy_id,
      provider_name: data.provider_name,
      provider_npi: data.provider_npi,
      diagnosis_code: data.diagnosis_code,
      date_of_service: data.date_of_service,
      status: ClaimStatus.SUBMITTED,
      total_amount: totalAmount,
    });

    const lineItemsData: LineItemInput[] = data.line_items.map((li: { service_type: string; description: string; billed_amount: number }) => ({
      claim_id: claim.id,
      service_type: li.service_type as any,
      description: li.description,
      billed_amount: li.billed_amount,
    }));

    await this.claimDal.createLineItems(lineItemsData);
    await this.claimDal.update(claim.id, { status: ClaimStatus.UNDER_REVIEW });
    const adjudicationResult = await this.adjudicationService.adjudicate(claim.id);
    const fullClaim = await this.claimDal.findById(claim.id);

    return { claim: fullClaim, adjudication: adjudicationResult };
  }

  async getClaim(id: number): Promise<Claim> {
    const claim = await this.claimDal.findById(id);
    if (!claim) throw AppError.notFound(`Claim ${id} not found`);
    return claim;
  }

  async getAllClaims(filters?: { status?: ClaimStatus; member_id?: number }): Promise<Claim[]> {
    return this.claimDal.findAll(filters);
  }

  async adjudicate(id: number) {
    const claim = await this.getClaim(id);
    if (claim.status !== ClaimStatus.UNDER_REVIEW && claim.status !== ClaimStatus.SUBMITTED) {
      throw AppError.unprocessable(`Cannot adjudicate claim in ${claim.status} state. Must be SUBMITTED or UNDER_REVIEW.`);
    }
    return this.adjudicationService.adjudicate(id);
  }

  async transitionState(id: number, newStatus: ClaimStatus): Promise<Claim> {
    const claim = await this.getClaim(id);
    const allowed = STATE_TRANSITIONS[claim.status] || [];

    if (!allowed.includes(newStatus)) {
      throw AppError.unprocessable(
        `Invalid state transition: ${claim.status} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
      );
    }

    const updateData: Partial<ClaimInput> = { status: newStatus };
    if (newStatus === ClaimStatus.PAID) updateData.paid_amount = claim.approved_amount;

    const updated = await this.claimDal.update(id, updateData);
    if (!updated) throw AppError.internal('Failed to update claim state');
    return updated;
  }

  async disputeClaim(id: number): Promise<Claim> {
    const claim = await this.getClaim(id);
    const disputable = [ClaimStatus.APPROVED, ClaimStatus.PARTIALLY_APPROVED, ClaimStatus.DENIED];

    if (!disputable.includes(claim.status)) {
      throw AppError.unprocessable(
        `Cannot dispute claim in ${claim.status} state. Only APPROVED, PARTIALLY_APPROVED, or DENIED claims can be disputed.`,
      );
    }

    const updated = await this.claimDal.update(id, { status: ClaimStatus.DISPUTED });
    if (!updated) throw AppError.internal('Failed to dispute claim');
    return updated;
  }
}
