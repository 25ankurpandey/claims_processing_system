import { Sequelize } from 'sequelize';
import { Logger } from '../utils/logging/Logger';
import { models } from '../models';

let sequelize: Sequelize;

export function getSequelize(): Sequelize {
  return sequelize;
}

export async function createDBConn(): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const dbLogging = process.env.DB_LOGGING === 'true';

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    Logger.info(`Connecting to PostgreSQL via DATABASE_URL...`);

    sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: dbLogging ? (msg: string) => Logger.debug(msg) : false,
      dialectOptions: {
        ...(databaseUrl.includes('sslmode=require') ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
      },
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
    });

    await sequelize.authenticate();
    Logger.info('PostgreSQL connection established successfully.');

    // Initialize all models
    for (const model of Object.values(models)) {
      (model as any).initModel(sequelize);
    }
    Logger.info('Models initialized.');

    // Set up associations
    for (const model of Object.values(models)) {
      if (typeof (model as any).associate === 'function') {
        (model as any).associate(models);
      }
    }
    Logger.info('Associations established.');

    // Sync database — alter:true in dev to auto-apply schema changes
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    Logger.info('Database synchronized.');
  } catch (error) {
    Logger.error(error, 'DB_INIT', 'PostgreSQL connection failed');
    process.exit(1);
  }
}
