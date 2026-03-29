import { inject } from 'inversify';
import { provideSingleton } from '../ioc/ioc';
import { TYPES } from '../ioc/types';
import { PolicyDal } from '../repositories/PolicyDal';
import { Policy, PolicyInput } from '../models/Policy';
import { CoverageRuleInput } from '../models/CoverageRule';
import { AppError } from '../utils/ErrUtils';
import { v4 as uuidv4 } from 'uuid';

@provideSingleton(TYPES.PolicyService)
export class PolicyService {
  constructor(@inject(TYPES.PolicyDal) private policyDal: PolicyDal) {}

  async createPolicy(data: PolicyInput, coverageRules?: CoverageRuleInput[]): Promise<Policy> {
    const policyNumber = `POL-${uuidv4().slice(0, 8).toUpperCase()}`;
    const policy = await this.policyDal.create({ ...data, policy_number: policyNumber });

    if (coverageRules && coverageRules.length > 0) {
      const rulesWithPolicyId = coverageRules.map((rule) => ({
        ...rule,
        policy_id: policy.id,
      }));
      await this.policyDal.createCoverageRules(rulesWithPolicyId);
    }

    return this.getPolicy(policy.id);
  }

  async getPolicy(id: number): Promise<Policy> {
    const policy = await this.policyDal.findById(id);
    if (!policy) throw AppError.notFound(`Policy ${id} not found`);
    return policy;
  }

  async getAllPolicies(): Promise<Policy[]> {
    return this.policyDal.findAll();
  }

  async getPolicyForMember(memberId: number): Promise<Policy> {
    const policy = await this.policyDal.findByMemberId(memberId);
    if (!policy) throw AppError.notFound(`No policy found for member ${memberId}`);
    return policy;
  }
}
