import * as cdk from '@aws-cdk/core';
import { envVars } from './lib/env-vars';
import { PortfolioStack } from './lib/portfolio-stack';
//import { Ec2AsgCiCdStack } from './lib/products/cicd/ec2/product-ec2-asg-cicd-stack';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

new PortfolioStack(app, `${envVars.COMPANY_NAME}-Portfolio`, {
  env: devEnv,
});

/* new Ec2AsgCiCdStack(app, 'ec2AsgCiCd', {
  env: devEnv,
}); */

/* new SagemakerStack(app, 'SageMakerStudio', {
  env: devEnv,
}); */

app.synth();