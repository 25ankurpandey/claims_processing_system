import 'reflect-metadata';
import { Logger } from './utils/logging/Logger';

async function init() {
  require('dotenv').config();
  Logger.init('claims-processing-system');
  Logger.info('Starting Claims Processing System...');
  require('./bootstrap').init();
}

init();
