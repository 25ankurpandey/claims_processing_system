/* eslint-disable @typescript-eslint/no-explicit-any */
import * as bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import * as express from 'express';
import 'reflect-metadata';
import { Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { Logger } from './utils/logging/Logger';
import { Constants } from './constants/Constants';
import { container } from './ioc/ioc';
import './ioc/loader';
import { createDBConn } from './db-initialization/initialize-postgres';

async function init() {
  initializeServer();
  await createDBConn();
}

function initializeServer() {
  const server = new InversifyExpressServer(container);

  server.setConfig((app: express.Application) => {
    app.use(compression());
    app.disable('etag');
    app.disable('x-powered-by');
    app.use(cors());
    app.set('trust proxy', 'loopback');

    app.use(
      bodyParser.urlencoded({
        extended: true,
        limit: '15mb',
      }),
    );

    app.use(bodyParser.json({ limit: '15mb' }));

    // Request logging middleware
    app.use((req: Request, _res: Response, next: express.NextFunction) => {
      Logger.info(`${req.method} ${req.path}`);
      next();
    });
  });

  server.setErrorConfig((app) => {
    app.use(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (err: any, _req: Request, res: Response, _next: express.NextFunction) => {
        Logger.error(err, err.errId || 'UNKNOWN', err.errType || 'UNKNOWN');

        const errRes = {
          errors: [
            {
              code: err.code || 'INTERNAL_ERROR',
              message: err.message || 'Something went wrong!',
              type: err.type || 'UNEXPECTED_ERROR',
              details: err.details || undefined,
            },
          ],
        };

        const statusCode = err.status ? parseInt(err.status) : 500;
        res.status(statusCode).json(errRes);
      },
    );
  });

  const port = parseInt(process.env.PORT || '4300');

  server.build().listen(port, () => {
    Logger.info(`Server listening on port ${port}`);
    Logger.info(`Health check: http://localhost:${port}${Constants.API_PREFIX}/health`);
  });
}

module.exports.init = init;
