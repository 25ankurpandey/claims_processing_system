/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildProviderModule } from 'inversify-binding-decorators';
import { container } from './ioc';

// Import ALL modules to trigger @provideSingleton registration BEFORE buildProviderModule()
import '../repositories';
import '../services';
import '../controllers';

container.load(buildProviderModule());
