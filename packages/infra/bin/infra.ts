#!/usr/bin/env node
import 'source-map-support/register';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { InfraStage } from '../lib/infra-stage';
import {App} from 'aws-cdk-lib';

const REGION = process.env.REGION || 'us-east-1'; // North Virginia is for now the only region available for Amazon GameSparks preview
const PROJECT_NAME = 'AmazonGamesparksIntegrationWithGamelift';

const configFilePath = resolve(__dirname, '../config/infra-config.json');
const config = JSON.parse(readFileSync(configFilePath).toString());

const app = new App();

// Implement Infra Stage for developer environment
new InfraStage(app, `${PROJECT_NAME}-Dev`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: REGION,
  },
  ...config,
});

app.synth();
