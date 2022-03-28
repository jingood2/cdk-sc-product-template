import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';
import * as cfn_inc from '@aws-cdk/cloudformation-include';
import * as cdk from '@aws-cdk/core';

export interface ISagemakerStudioDomainProductProps {
  sagemaker_domain_name: string;
  vpc_id: string;
  subnet_ids: string[];
  role_sagemaker_studio_users: iam.IRole;
}

export class SagemakerStudioDomainProduct extends cdk.Construct {
  public readonly sagemakerDomainId: string;
  constructor(scope: cdk.Construct, id: string, props: ISagemakerStudioDomainProductProps) {
    super(scope, id);

    const sagemakerDomain = new cfn_inc.CfnInclude(this, 'Template', {
      templateFile: path.join(__dirname, 'cfn-template/sagemaker-domain-template.json'),
      parameters: {
        authMode: 'IAM',
        domainName: props.sagemaker_domain_name,
        vpcId: props.vpc_id,
        subnetIds: props.subnet_ids,
        defaultExecutionRoleUser: props.role_sagemaker_studio_users.roleArn,
      },
    });

    this.sagemakerDomainId = sagemakerDomain.getResource('SagemakerDomainCDK').ref;

  }
}