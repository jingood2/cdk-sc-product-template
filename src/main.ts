import * as cdk from '@aws-cdk/core';
import { envVars } from './lib/env-vars';
import { PortfolioStack } from './lib/portfolio-stack';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEPLOY_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION,
};

const app = new cdk.App();

new PortfolioStack(app, `${envVars.COMPANY_NAME}-Portfolio`, {
  env: devEnv,
});
app.synth();