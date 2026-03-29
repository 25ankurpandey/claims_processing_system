import { Op } from 'sequelize';
import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { Claim, ClaimInput } from '../models/Claim';
import { LineItem, LineItemInput } from '../models/LineItem';
import { Member } from '../models/Member';
import { Policy } from '../models/Policy';
import { CoverageRule } from '../models/CoverageRule';
import { ClaimStatus, LineItemStatus, ServiceType } from '@claims/shared/enums';

@provideSingleton(TYPES.ClaimDal)
export class ClaimDal {
  async create(payload: ClaimInput): Promise<Claim> {
    return await Claim.create(payload);
  }

  async findById(id: number): Promise<Claim | null> {
    return await Claim.findByPk(id, {
      include: [
        { model: LineItem, as: 'lineItems' },
        { model: Member, as: 'member' },
        {
          model: Policy,
          as: 'policy',
          include: [{ model: CoverageRule, as: 'coverageRules' }],
        },
      ],
    });
  }

  async findAll(filters?: { status?: ClaimStatus; member_id?: number }): Promise<Claim[]> {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.member_id) where.member_id = filters.member_id;

    return await Claim.findAll({
      where,
      include: [
        { model: LineItem, as: 'lineItems' },
        { model: Member, as: 'member' },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async update(id: number, payload: Partial<ClaimInput>): Promise<Claim | null> {
    await Claim.update(payload, { where: { id } });
    return this.findById(id);
  }

  async createLineItem(payload: LineItemInput): Promise<LineItem> {
    return await LineItem.create(payload);
  }

  async createLineItems(items: LineItemInput[]): Promise<LineItem[]> {
    return await LineItem.bulkCreate(items);
  }

  async updateLineItem(id: number, payload: Partial<LineItemInput>): Promise<void> {
    await LineItem.update(payload, { where: { id } });
  }

  /**
   * Get total approved amount for a service type within a date range (for limit tracking)
   */
  async getApprovedAmountForServiceType(
    policyId: number,
    serviceType: ServiceType,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const lineItems = await LineItem.findAll({
      where: {
        service_type: serviceType,
        status: LineItemStatus.APPROVED,
      },
      include: [
        {
          model: Claim,
          as: 'claim',
          where: {
            policy_id: policyId,
            date_of_service: { [Op.between]: [startDate, endDate] },
            status: { [Op.notIn]: [ClaimStatus.DENIED, ClaimStatus.DISPUTED] },
          },
          attributes: [],
        },
      ],
      attributes: ['approved_amount'],
    });
    return lineItems.reduce((sum, li) => sum + Number(li.approved_amount), 0);
  }

  /**
   * Get total approved amount for deductible tracking within a year
   */
  async getTotalApprovedForYear(policyId: number, year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const result = await Claim.sum('approved_amount', {
      where: {
        policy_id: policyId,
        date_of_service: { [Op.between]: [startDate, endDate] },
        status: { [Op.notIn]: [ClaimStatus.DENIED, ClaimStatus.DISPUTED] },
      },
    });
    return result || 0;
  }
}
