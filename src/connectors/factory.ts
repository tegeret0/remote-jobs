import type { BaseConnector } from './base.ts';
import type { JobSourceConfig } from '../types/job.ts';
import { GreenhouseConnector } from './greenhouse.ts';
import { LeverConnector } from './lever.ts';
import { AshbyConnector } from './ashby.ts';
import { RemotiveConnector } from './remotive.ts';
import { CustomApiConnector } from './custom_api.ts';

export function createConnector(config: JobSourceConfig): BaseConnector {
  switch (config.type) {
    case 'greenhouse':
      return new GreenhouseConnector(config);
    case 'lever':
      return new LeverConnector(config);
    case 'ashby':
      return new AshbyConnector(config);
    case 'remotive':
      return new RemotiveConnector(config);
    case 'custom_api':
      return new CustomApiConnector(config);
    default:
      return new CustomApiConnector(config);
  }
}
