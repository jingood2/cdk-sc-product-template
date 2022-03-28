import * as iam from '@aws-cdk/aws-iam';
//import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { SagemakerStudioDomainProduct } from './sagemaker-studio-domain-product';
import { SagemakerStudioUserProduct } from './sagemaker-studio-user-product';

export interface ISagemakerStackProps extends cdk.StackProps {
}

export class SagemakerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ISagemakerStackProps) {
    super(scope, id );

    console.log(props);

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'Select Vpc Id',
    });

    const subnets = new cdk.CfnParameter(this, 'SageMakerStudioSubnets', {
      type: 'List<AWS::EC2::Subnet::Id>',
      description: 'Select VPC Subnet to deploy SageMaker Studio',
    });

    const roleSagemakerStudtioDomain = new iam.Role(this, 'RoleForSagemakerStudioUsers', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      roleName: 'RoleSagemakerStudioUsers',
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, 'SagemakerReadAccess', 'arn:aws:iam::aws:policy/AmazonSageMakerFullAccess')],
    });

    const sagemakerDomainName = 'DomainForSagemakerStudio';

    /*  const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: 'vpc-0482fb87f861f62c5',
      region: 'ap-northeast-2',
    }); */

    const sagemakerDomain = new SagemakerStudioDomainProduct(this, 'sagemakerStudioDomain', {
      sagemaker_domain_name: sagemakerDomainName,
      vpc_id: vpcId.valueAsString,
      subnet_ids: subnets.valueAsList,
      role_sagemaker_studio_users: roleSagemakerStudtioDomain,
    });

    const datascientist = new SagemakerStudioUserProduct(this, '_team', {
      sagemaker_domain_id: sagemakerDomain.sagemakerDomainId,
      user_profile_name: 'marketcaster-team',
    });

    new cdk.CfnOutput(this, 'marketcaster-team-A1', {
      value: datascientist.userProfileArn,
      description: 'The User Arn TeamA domain ID',
      exportName: cdk.Fn.getAtt('userProfileArn', 'marketcaster-team').toString(),
    });

    new cdk.CfnOutput(this, 'DomainIdSagemaker', {
      value: sagemakerDomain.sagemakerDomainId,
      description: 'The sagemaker domain ID',
      exportName: 'DomainIdSagemaker',
    });
  }
}