import * as ec2 from '@aws-cdk/aws-ec2';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as ssm from '@aws-cdk/aws-ssm';
import * as wafv2 from '@aws-cdk/aws-wafv2';
import * as cdk from '@aws-cdk/core';

export interface ProductEProps extends cdk.StackProps {

}

export class ProductAlbStack extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductEProps) {
    super(scope, id );

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

    const useCertificate = new cdk.CfnParameter(this, 'UseCertificate', {
      description: 'use certificate',
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
    });

    const enableWAF = new cdk.CfnParameter(this, 'EnableWAF', {
      description: 'enable AWS WAF',
      type: 'String',
      default: 'false',
      allowedValues: ['true', 'false'],
    });

    /* const internetFacingCondition = new cdk.CfnCondition(this, 'IsInternetFacingCondition', {
      expression: cdk.Fn.conditionEquals('internet-facing', scheme.valueAsString),
    });
 */
    const useCertiCondition = new cdk.CfnCondition(this, 'UseCertificateCondition', {
      expression: cdk.Fn.conditionEquals('true', useCertificate.valueAsString),
    });

    const certiArn = new cdk.CfnParameter(this, 'TLSCertificateArn', {
      type: 'String',
      description: 'TLS certificate ARN for HTTPS ingress',
      default: 'input certiArn',
    });

    // Resources
    const albSg = new ec2.CfnSecurityGroup(this, 'AlbSG', {
      vpcId: vpcId.valueAsString,
      groupName: `${environment.valueAsString}-${scheme.valueAsString}-alb-sg`,
      groupDescription: `Access to the ${environment.valueAsString} ${scheme.valueAsString} load balancer`,
      securityGroupIngress: [{
        ipProtocol: '-1',
        cidrIp: '0.0.0.0/0',
        fromPort: 443,
      },
      {
        ipProtocol: '-1',
        cidrIp: '0.0.0.0/0',
        fromPort: 80,
      }],
    });

    new ec2.CfnSecurityGroupIngress(this, 'ECSSecurityGroupIngressFromALB', {
      ipProtocol: '-1',
      description: 'Ingress from the ALB',
      groupId: targetSgId.valueAsString,
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
      name: `${environment.valueAsString}-${scheme.valueAsString}-alb-dummy-tg`,
      unhealthyThresholdCount: 2,
      vpcId: vpcId.valueAsString,
    });

    const alb = new elbv2.CfnLoadBalancer(this, 'ApplicationLoadBalancer', /* all optional props */ {
      ipAddressType: 'ipv4',
      loadBalancerAttributes: [{
        key: 'idle_timeout.timeout_seconds',
        value: '30',
      }],
      scheme: scheme.valueAsString,
      securityGroups: [albSg.ref],
      subnets: targetSubnet.valueAsList,
    });

    const httpsListener = new elbv2.CfnListener(this, 'HTTPSListener', {
      defaultActions: [{ targetGroupArn: dummyTg.ref, type: 'forward' }],
      loadBalancerArn: alb.ref,
      certificates: [{ certificateArn: certiArn.valueAsString }],
      port: 443,
      protocol: 'HTTPS',
    });
    httpsListener.cfnOptions.condition = useCertiCondition;

    const httpListener = new elbv2.CfnListener(this, 'HTTPListener', {
      defaultActions: [{ targetGroupArn: dummyTg.ref, type: 'forward' }],
      loadBalancerArn: alb.ref,
      port: 80,
      protocol: 'HTTP',
    });

    // associate ACM
    this.createWebAcl(environment.valueAsString, enableWAF.valueAsString, alb.ref );


    // SSM parameter store
    new ssm.StringParameter(this, 'AlbDnsName', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/dnsname`,
      stringValue: alb.attrDnsName,
      simpleName: false,
    });

    new ssm.StringParameter(this, 'ALBArn', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/arn`,
      stringValue: alb.ref,
      simpleName: false,
    });

    new ssm.StringParameter(this, 'ALBSecurityGroupId', {
      parameterName: `/${environment.valueAsString}/alb/${scheme.valueAsString}/sgId`,
      stringValue: albSg.ref,
      simpleName: false,
    });

    const ssmHttpListener = new ssm.CfnParameter(this, 'HTTPSListenerArn', {
      type: 'String',
      name: `/${environment.valueAsString}/alb/${scheme.valueAsString}/httpsListener/arn`,
      value: httpsListener.attrListenerArn,
    });
    ssmHttpListener.cfnOptions.condition = useCertiCondition;

    new ssm.CfnParameter(this, 'HTTPListenerArn', {
      type: 'String',
      name: `/${environment.valueAsString}/alb/${scheme.valueAsString}/httpListener/arn`,
      value: httpListener.attrListenerArn,
    });


    // Cloudformation Output
    new cdk.CfnOutput(this, 'ALBDNSName', {
      description: 'DNS name of the ALB',
      value: alb.attrDnsName,
      exportName: `${id}:${environment.valueAsString}:DNSName`,
    });

    new cdk.CfnOutput(this, 'HTTPSListenerOutput', {
      description: 'The ARN of the Application Load Balancer HTTPS listener',
      value: httpsListener.ref,
      exportName: `${id}:${environment.valueAsString}:HTTPSListener`,
      condition: useCertiCondition,
    });

    new cdk.CfnOutput(this, 'HTTPListenerOutput', {
      description: 'The ARN of the Application Load Balancer HTTP listener',
      value: httpListener.ref,
      exportName: `${id}:${environment.valueAsString}:HTTPListener`,
    });

    new cdk.CfnOutput(this, 'ALBHostedZoneID', {
      description: 'Hosted Zone ID for the ALB',
      value: alb.attrCanonicalHostedZoneId,
    });

  }

  private createWebAcl(env: string, enableWAF:string, albArn: string) {

    if (enableWAF === 'false') {
      return;
    }

    const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      defaultAction: { allow: {} },
      name: `${env}-waf-web-acl`,
      rules: [
        {
          priority: 1,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesCommonRuleSet',
          },
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
        },
        {
          priority: 2,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesSQLiRuleSet',
          },
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
        },
        {
          priority: 3,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          },
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
        },
        {
          priority: 4,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesLinuxRuleSet',
          },
          name: 'AWS-AWSManagedRulesLinuxRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesLinuxRuleSet',
            },
          },
        },
        {
          priority: 5,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesAmazonIpReputationList',
          },
          name: 'AWS-AWSManagedRulesAmazonIpReputationList',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
        },
        {
          priority: 6,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesAnonymousIpList',
          },
          name: 'AWS-AWSManagedRulesAnonymousIpList',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAnonymousIpList',
            },
          },
        },
        {
          // eslint-disable-next-line quote-props
          'priority': 7,
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesBotControlRuleSet',
          },
          name: 'AWS-AWSManagedRulesBotControlRuleSet',
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesBotControlRuleSet',
            },
          },
        },
      ],
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${env}-waf-web-acl`,
        sampledRequestsEnabled: true,
      },
    });

    const webAclAssoc = new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: albArn,
      webAclArn: webAcl.attrArn,
    });
    webAclAssoc.addDependsOn(webAcl);
  }
}