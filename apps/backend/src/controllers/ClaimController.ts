import { Request, Response } from 'express';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { inject } from 'inversify';
import { Constants } from '../constants/Constants';
import { BaseController } from './Base';
import { ClaimService } from '../services/ClaimService';
import { TYPES } from '../ioc/types';
import { submitClaimSchema, transitionStateSchema } from '../validators';
import { AppError } from '../utils/ErrUtils';
import { ClaimStatus } from '@claims/shared/enums';

@controller(`${Constants.API_PREFIX}/claims`)
export class ClaimController extends BaseController {
  constructor(@inject(TYPES.ClaimService) private claimService: ClaimService) {
    super();
  }

  @httpPost('/')
  public async submit(req: Request, res: Response): Promise<void> {
    const { error, value } = submitClaimSchema.validate(req.body, { abortEarly: false });
    if (error) throw AppError.badRequest('Validation failed', error.details.map((d) => d.message));
    const result = await this.claimService.submitClaim(value);
    res.status(201).json({ status: 'success', data: result });
  }

  @httpGet('/')
  public async getAll(req: Request, res: Response): Promise<void> {
    const filters: { status?: ClaimStatus; member_id?: number } = {};
    if (req.query.status) filters.status = req.query.status as ClaimStatus;
    if (req.query.member_id) filters.member_id = parseInt(req.query.member_id as string);
    const claims = await this.claimService.getAllClaims(filters);
    res.status(200).json({ status: 'success', data: claims });
  }

  @httpGet('/:id')
  public async getById(req: Request, res: Response): Promise<void> {
    const claim = await this.claimService.getClaim(parseInt(req.params.id));
    res.status(200).json({ status: 'success', data: claim });
  }

  @httpPost('/:id/adjudicate')
  public async adjudicate(req: Request, res: Response): Promise<void> {
    const result = await this.claimService.adjudicate(parseInt(req.params.id));
    res.status(200).json({ status: 'success', data: result });
  }

  @httpPost('/:id/transition')
  public async transition(req: Request, res: Response): Promise<void> {
    const { error, value } = transitionStateSchema.validate(req.body, { abortEarly: false });
    if (error) throw AppError.badRequest('Validation failed', error.details.map((d) => d.message));
    const claim = await this.claimService.transitionState(parseInt(req.params.id), value.status);
    res.status(200).json({ status: 'success', data: claim });
  }

  @httpPost('/:id/dispute')
  public async dispute(req: Request, res: Response): Promise<void> {
    const claim = await this.claimService.disputeClaim(parseInt(req.params.id));
    res.status(200).json({ status: 'success', data: claim });
  }
}
