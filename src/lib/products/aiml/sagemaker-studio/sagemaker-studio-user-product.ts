import * as path from 'path';
import * as cfn_inc from '@aws-cdk/cloudformation-include';
import * as cdk from '@aws-cdk/core';

export interface ISSagemakerStudioUserProductProps {
  sagemaker_domain_id: string;
  user_profile_name: string;
}

export class SagemakerStudioUserProduct extends cdk.Construct {
  public readonly userProfileArn: string;

  constructor(scope: cdk.Construct, id: string, props: ISSagemakerStudioUserProductProps) {
    super(scope, id);

    const sagemakerUserTemplate = new cfn_inc.CfnInclude(this, id, {
      templateFile: path.join(__dirname, 'cfn-template/sagemaker-user-template.yaml'),
      parameters: {
        sagemakerDomainId: props.sagemaker_domain_id,
        userProfileName: props.user_profile_name,
      },
    });

    this.userProfileArn = sagemakerUserTemplate.getResource('SagemakerUser').getAtt('UserProfileArn').toString();

  }
}