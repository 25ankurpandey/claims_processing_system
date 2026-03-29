import { Request, Response } from 'express';
import { controller, httpGet } from 'inversify-express-utils';
import { Constants } from '../constants/Constants';
import { BaseController } from './Base';
import * as os from 'os';

@controller(`${Constants.API_PREFIX}/health`)
export class HealthCheckController extends BaseController {
  constructor() {
    super();
  }

  @httpGet('/')
  public async checkHealth(_req: Request, res: Response): Promise<void> {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    res.status(200).json({
      status: 'up',
      uptime: `${Math.floor(uptime)}s`,
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        nodeVersion: process.version,
      },
    });
  }
}
