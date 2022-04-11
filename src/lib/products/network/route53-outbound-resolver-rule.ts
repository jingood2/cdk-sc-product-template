import * as ram from '@aws-cdk/aws-ram';
import * as route53resolver from '@aws-cdk/aws-route53resolver';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';

export interface Route53OutboundResolverRuleProps extends cdk.StackProps {

}

export class Route53OutboundResolverRule extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: Route53OutboundResolverRuleProps) {
    super(scope, id );

    console.log(props);

    // resolver rule
    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID that hosts resolver endpoints',
    });
    const accountIds = new cdk.CfnParameter(this, 'AccountIds', {
      type: 'CommaDelimitedList',
      description: 'List of account ids with which this rule will be shared',
    });

    const resolverEndpointId = new cdk.CfnParameter(this, 'ResolverEndpointId', {
      type: 'String',
      description: 'Outbound Resolver Endpoint ID',
    });

    const domainFQDN = new cdk.CfnParameter(this, 'DomainFQDN', {
      type: 'String',
      description: 'Provide FQDN for domain',
    });

    const domainTargetCount = new cdk.CfnParameter(this, 'DomainTargetCount', {
      type: 'String',
      description: 'count for number targets ip for the resolver rule',
      allowedValues: ['1', '2'],
    });

    const domainTargets = new cdk.CfnParameter(this, 'DomainTarget', {
      type: 'CommaDelimitedList',
      description: 'A comma separated list of IP:port targets (two targets) for example1.com domain resolution. Please change the default IPs as per your environment',
      default: '192.168.1.13:53,192.168.2.14.53',
    });

    const isCountOne = new cdk.CfnCondition(this, 'IsCountOne', {
      expression: cdk.Fn.conditionEquals(domainTargetCount, '1'),
    });
    const isCountTwo = new cdk.CfnCondition(this, 'IsCountTwo', {
      expression: cdk.Fn.conditionEquals(domainTargetCount, '2'),
    });

    const domainRuleWithOneTargets = new route53resolver.CfnResolverRule(this, 'DomainRuleWithOneTarget', {
      domainName: domainFQDN.valueAsString,
      ruleType: 'FORWARD',
      // the properties below are optional
      name: domainFQDN.valueAsString,
      resolverEndpointId: resolverEndpointId.valueAsString,
      targetIps: [{
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
      }],
    });

    domainRuleWithOneTargets.cfnOptions.condition = isCountOne;

    const domainRuleWithTwoTargets = new route53resolver.CfnResolverRule(this, 'DomainRuleWithTwoTarget', {
      domainName: domainFQDN.valueAsString,
      ruleType: 'FORWARD',
      // the properties below are optional
      name: domainFQDN.valueAsString,
      resolverEndpointId: resolverEndpointId.valueAsString,
      targetIps: [{
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(0, domainTargets.valueAsList ))),
      }, {
        ip: cdk.Fn.select(0, cdk.Fn.split(':', cdk.Fn.select(1, domainTargets.valueAsList ))),
        port: cdk.Fn.select(1, cdk.Fn.split(':', cdk.Fn.select(1, domainTargets.valueAsList ))),
      }],
    });

    domainRuleWithTwoTargets.cfnOptions.condition = isCountTwo;

    /*  const codeOne = cdk.Fn.conditionIf('IsCountOne', domainRuleWithOneTargets.attrArn, cdk.Aws.NO_VALUE );
    const codeTwo = cdk.Fn.conditionIf('IsCountTwo', domainRuleWithTwoTargets.attrArn, cdk.Aws.NO_VALUE ); */

    // Outbound Rule share Accounts
    new ram.CfnResourceShare(this, 'MyCfnResourceShare', {
      name: domainFQDN.valueAsString,
      // the properties below are optional
      allowExternalPrincipals: false,
      //permissionArns: ['permissionArns'],
      principals: accountIds.valueAsList,
      resourceArns: [
        cdk.Fn.conditionIf('IsCountOne', domainRuleWithOneTargets.attrArn, cdk.Aws.NO_VALUE ).toString(),
        cdk.Fn.conditionIf('IsCountTwo', domainRuleWithOneTargets.attrArn, cdk.Aws.NO_VALUE ).toString(),
      ],
    });


    new route53resolver.CfnResolverRuleAssociation(this, 'MyCfnResolverRuleAssociation', {
      resolverRuleId: cdk.Fn.conditionIf('IsCountOne', domainRuleWithOneTargets.attrArn, domainRuleWithOneTargets.attrArn ).toString(),
      vpcId: vpcId.valueAsString,
      // the properties below are optional
      name: 'route53-outbound-resolover-rule-association',
    });
  }
}