const { awscdk } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '1.151.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-sc-product-template',

  deps: [
    '@aws-cdk/core',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/pipelines',
    '@aws-cdk/aws-codecommit',
    '@aws-cdk/aws-codebuild',
    '@aws-cdk/aws-codedeploy',
    '@aws-cdk/aws-codepipeline',
    '@aws-cdk/aws-codepipeline-actions',
    '@aws-cdk/aws-servicecatalog',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-sns',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-s3',
    '@aws-cdk/cloudformation-include',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-ssm',
    '@aws-cdk/aws-elasticloadbalancingv2',
    '@aws-cdk/aws-elasticloadbalancingv2-targets',
    '@aws-cdk/aws-autoscaling',
    '@aws-cdk/aws-certificatemanager',
    '@aws-cdk/aws-route53',
    '@aws-cdk/aws-route53-targets',
    '@aws-cdk/aws-cloudfront',
    '@aws-cdk/aws-cloudwatch',
    '@aws-cdk/aws-s3-deployment',
    '@aws-cdk/aws-s3-assets',
    '@aws-cdk/cloudformation-include',
    '@aws-cdk/aws-ecs-patterns',
    '@aws-cdk/aws-wafv2',
    'chalk',
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();