import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { Policy, PolicyInput } from '../models/Policy';
import { CoverageRule, CoverageRuleInput } from '../models/CoverageRule';
import { Member } from '../models/Member';

@provideSingleton(TYPES.PolicyDal)
export class PolicyDal {
  async create(payload: PolicyInput): Promise<Policy> {
    return await Policy.create(payload);
  }

  async findById(id: number): Promise<Policy | null> {
    return await Policy.findByPk(id, {
      include: [
        { model: CoverageRule, as: 'coverageRules' },
        { model: Member, as: 'member' },
      ],
    });
  }

  async findAll(): Promise<Policy[]> {
    return await Policy.findAll({
      include: [
        { model: CoverageRule, as: 'coverageRules' },
        { model: Member, as: 'member' },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  async findByMemberId(memberId: number): Promise<Policy | null> {
    return await Policy.findOne({
      where: { member_id: memberId },
      include: [{ model: CoverageRule, as: 'coverageRules' }],
    });
  }

  async createCoverageRule(payload: CoverageRuleInput): Promise<CoverageRule> {
    return await CoverageRule.create(payload);
  }

  async createCoverageRules(rules: CoverageRuleInput[]): Promise<CoverageRule[]> {
    return await CoverageRule.bulkCreate(rules);
  }
}
