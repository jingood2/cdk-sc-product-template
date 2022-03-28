import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as cdk from '@aws-cdk/core';

export interface ProductECSExternalALBConstructProps {
  environment: string;
  targetSgId : string;
  vpcId: string;
  targetSubnet: string[];
  scheme: string;
  certiArn: string;
}

export class ProductECSExternalALBConstruct extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ProductECSExternalALBConstructProps) {
    super(scope, id );

    /*  const vpcId = ssm.StringParameter.fromStringParameterName(this,
      'vpcid', `/network/${props.env}/vpcid` ); */

    /* ssm.StringParameter.fromStringParameterAttributes(this, 'vpcId', {
      simpleName: false,
      parameterName: '/network/dev/vpcid',
    }); */

    /* new ecs.Cluster(this, 'Cluster', {
      clusterName: `ecs-${props.environment}-cluster`,
      vpc: ec2.Vpc.fromLookup(this, 'DevVpc', { vpcId: props.vpcId }),
      containerInsights: true,
    }); */

    // Create ContainerSecurityGroup and Role
    const albSg = new ec2.CfnSecurityGroup(this, 'AlbSG', {
      vpcId: props.vpcId,
      groupName: `${props.scheme}-alb-sg`,
      groupDescription: 'Access to the load balancer',
      securityGroupIngress: [{
        ipProtocol: '-1',
        cidrIp: '0.0.0.0/0',
      }],
    });


    new ec2.CfnSecurityGroupIngress(this, 'ECSSecurityGroupIngressFromALB', {
      ipProtocol: '-1',
      description: 'Ingress from the ALB',
      groupId: props.targetSgId,
      sourceSecurityGroupId: albSg.ref,
    });

    const dummyTg = new elbv2.CfnTargetGroup(this, 'DummyTargetGroup', {
      healthCheckEnabled: true,
      healthCheckIntervalSeconds: 6,
      healthCheckPath: '/',
      healthCheckTimeoutSeconds: 5,
      healthyThresholdCount: 2,
      port: 80,
      protocol: 'HTTP',
      name: `${props.environment}-${props.scheme}-alb-dummy-tg`,
      unhealthyThresholdCount: 2,
      vpcId: props.vpcId,
    });


    const alb = new elbv2.CfnLoadBalancer(this, 'ApplicationLoadBalancer', /* all optional props */ {
      ipAddressType: '-1',
      loadBalancerAttributes: [{
        key: 'idle_timeout.timeout_seconds',
        value: '30',
      }],
      scheme: props.scheme,
      securityGroups: [albSg.ref],
      subnets: props.targetSubnet,
    });

    const httpListener = new elbv2.CfnListener(this, 'HTTPSListener', {
      defaultActions: [{ targetGroupArn: dummyTg.ref, type: 'forwarding' }],
      loadBalancerArn: alb.ref,
      certificates: [{ certificateArn: props.certiArn }],
      port: 443,
      protocol: 'HTTPS',
    });


    new cdk.CfnOutput(this, 'ALBDNSName', {
      description: 'DNS name of the ALB',
      value: alb.attrDnsName,
      exportName: `${id}:${props.environment}:DNSName`,
    });

    new cdk.CfnOutput(this, 'HTTPSListenerOutput', {
      description: 'The ARN of the Application Load Balancer listener',
      value: httpListener.ref,
      exportName: `${id}:${props.environment}:HTTPSListener`,
    });

    new cdk.CfnOutput(this, 'ALBHostedZoneID', {
      description: 'Hosted Zone ID for the ALB',
      value: alb.attrCanonicalHostedZoneId,
    });
  }
}