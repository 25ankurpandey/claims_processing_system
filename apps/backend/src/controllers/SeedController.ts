import { Request, Response } from 'express';
import { controller, httpPost } from 'inversify-express-utils';
import { Constants } from '../constants/Constants';
import { BaseController } from './Base';
import { seedDatabase } from '../seed/seed';
import { Logger } from '../utils/logging/Logger';

@controller(`${Constants.API_PREFIX}/seed`)
export class SeedController extends BaseController {
  @httpPost('/')
  public async seed(_req: Request, res: Response): Promise<void> {
    try {
      await seedDatabase();
      res.status(200).json({ status: 'success', message: 'Database seeded successfully' });
    } catch (err: any) {
      Logger.error(err, 'SEED', 'Seed failed');
      res.status(500).json({ status: 'error', message: err.message || 'Seed failed' });
    }
  }
}
