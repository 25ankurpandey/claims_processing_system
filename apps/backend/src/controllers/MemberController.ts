import { Request, Response } from 'express';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import { inject } from 'inversify';
import { Constants } from '../constants/Constants';
import { BaseController } from './Base';
import { MemberService } from '../services/MemberService';
import { TYPES } from '../ioc/types';
import { createMemberSchema } from '../validators';
import { AppError } from '../utils/ErrUtils';

@controller(`${Constants.API_PREFIX}/members`)
export class MemberController extends BaseController {
  constructor(@inject(TYPES.MemberService) private memberService: MemberService) {
    super();
  }

  @httpPost('/')
  public async create(req: Request, res: Response): Promise<void> {
    const { error, value } = createMemberSchema.validate(req.body, { abortEarly: false });
    if (error) throw AppError.badRequest('Validation failed', error.details.map((d) => d.message));
    const member = await this.memberService.createMember(value);
    res.status(201).json({ status: 'success', data: member });
  }

  @httpGet('/')
  public async getAll(_req: Request, res: Response): Promise<void> {
    const members = await this.memberService.getAllMembers();
    res.status(200).json({ status: 'success', data: members });
  }

  @httpGet('/:id')
  public async getById(req: Request, res: Response): Promise<void> {
    const member = await this.memberService.getMember(parseInt(req.params.id));
    res.status(200).json({ status: 'success', data: member });
  }
}
