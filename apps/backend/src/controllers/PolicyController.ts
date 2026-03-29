import { Request, Response } from 'express';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { inject } from 'inversify';
import { Constants } from '../constants/Constants';
import { BaseController } from './Base';
import { PolicyService } from '../services/PolicyService';
import { TYPES } from '../ioc/types';
import { createPolicySchema } from '../validators';
import { AppError } from '../utils/ErrUtils';

@controller(`${Constants.API_PREFIX}/policies`)
export class PolicyController extends BaseController {
  constructor(@inject(TYPES.PolicyService) private policyService: PolicyService) {
    super();
  }

  @httpPost('/')
  public async create(req: Request, res: Response): Promise<void> {
    const { error, value } = createPolicySchema.validate(req.body, { abortEarly: false });
    if (error) throw AppError.badRequest('Validation failed', error.details.map((d) => d.message));
    const { coverage_rules, ...policyData } = value;
    const policy = await this.policyService.createPolicy(policyData, coverage_rules);
    res.status(201).json({ status: 'success', data: policy });
  }

  @httpGet('/')
  public async getAll(_req: Request, res: Response): Promise<void> {
    const policies = await this.policyService.getAllPolicies();
    res.status(200).json({ status: 'success', data: policies });
  }

  @httpGet('/:id')
  public async getById(req: Request, res: Response): Promise<void> {
    const policy = await this.policyService.getPolicy(parseInt(req.params.id));
    res.status(200).json({ status: 'success', data: policy });
  }
}
