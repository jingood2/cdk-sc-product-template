//import * as ec2 from '@aws-cdk/aws-ec2';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { ProductECSExternalALBConstruct } from './product-ecs-external-alb-construct';

export interface ProductECSExternalALBProps extends cdk.StackProps {

}

export class ProductECSExternalALB extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductECSExternalALBProps) {
    super( scope, id );

    console.log(props);

    const environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const targetSubnet = new cdk.CfnParameter(this, 'TargetSubnets', {
      type: 'List<AWS::EC2::Subnet::Id>',
      description: 'Launch application load balancer into these subnets',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const targetSgId = new cdk.CfnParameter(this, 'TargetSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'Target Security Group',
    });

    const scheme = new cdk.CfnParameter(this, 'AlbScheme', {
      type: 'String',
      description: 'select ALB Scheme',
      allowedValues: ['internal', 'internet-facing'],
      default: 'internal',
    });

    const certiArn = new cdk.CfnParameter(this, 'TLSCertificateArn', {
      type: 'String',
      description: 'TLS certificate ARN for HTTPS ingress',
    });

    new ProductECSExternalALBConstruct(this, id, {
      environment: environment.valueAsString,
      targetSubnet: targetSubnet.valueAsList,
      targetSgId: targetSgId.valueAsString,
      certiArn: certiArn.valueAsString,
      scheme: scheme.valueAsString,
      vpcId: vpcId.valueAsString,
    });

  }

}