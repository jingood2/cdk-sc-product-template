import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { StaticSiteCicdConstruct } from './product-static-site-cicd-construct';

export interface StackNameProps extends cdk.StackProps {

}

export class StaticSiteCicd extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: StackNameProps ) {
    super(scope, id );

    console.log(props);

    const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    });

    const distributionId = new cdk.CfnParameter(this, 'distributionId', {
      type: 'String',
      description: 'CloudFront Distribution ID',
    });

    const bucket = new cdk.CfnParameter(this, 'Origin Bucket', {
      type: 'String',
      description: 'S3 Origin Bucket Name',
    });

    const repo = new cdk.CfnParameter(this, 'Source Repository Name', {
      type: 'String',
      description: 'Git or S3 Repository Name',
    });

    const repoOwner = new cdk.CfnParameter(this, 'Git Repo Owner', {
      type: 'String',
      description: 'Git Repository Owner',
    });

    const repoBranch = new cdk.CfnParameter(this, 'Git Branch Name', {
      type: 'String',
      description: 'Git Branch Name',
      default: 'main',
    });

    const githubTokenSecretId = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: 'Github Secret Token Id',
    });

    const buildAlertEmail = new cdk.CfnParameter(this, 'buildAelrtEmail', {
      type: 'String',
      description: 'Build Alert Email',
    });

    new StaticSiteCicdConstruct(this, 'StaticSiteCicd', {
      provider: provider.valueAsString,
      distributionId: distributionId.valueAsString,
      bucket: bucket.valueAsString,
      repo: repo.valueAsString,
      repoOwner: repoOwner.valueAsString,
      repoBranch: repoBranch.valueAsString,
      githubTokenSecretId: githubTokenSecretId.valueAsString,
      buildAlertEmail: buildAlertEmail.valueAsString,
    });


  }
}