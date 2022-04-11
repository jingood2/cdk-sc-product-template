import * as ec2 from '@aws-cdk/aws-ec2';
import * as route53resolver from '@aws-cdk/aws-route53resolver';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';

export interface Route53ResolverProps extends cdk.StackProps {

}

export class Route53Resolver extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: Route53ResolverProps) {
    super(scope, id );

    console.log(props);

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID that hosts resolver endpoints',
    });

    const endpointSubnetA = new cdk.CfnParameter(this, 'EndpointSubnetA', {
      type: 'AWS::EC2::VPC::Id',
      description: 'Chose the private subnet for route53 resolver endpoint',
    });

    const endpointSubnetB = new cdk.CfnParameter(this, 'EndpointSubnetB', {
      type: 'AWS::EC2::VPC::Id',
      description: 'Chose the private subnet for route53 resolver endpoint',
    });

    const endpointCidr = new cdk.CfnParameter(this, 'EndpointSubnetId', {
      type: 'String',
      description: 'Provide the CIDRs of resources in on-prem that will be accessed from AWS via outbound endpoint or CIDR of resources in on-prem accessing AWS Private Hosted Zones via inbound endpoints',
    });

    const endpointType = new cdk.CfnParameter(this, 'EndpointType', {
      type: 'String',
      description: 'Endpoint Type - Inbound or Outbound',
      default: 'INBOUND',
      allowedValues: ['INBOUND', 'OUTBUILD'],
    });

    new cdk.CfnCondition(this, 'CreateOutboundEndpoint', {
      expression: cdk.Fn.conditionEquals(endpointType, 'OUTBOUND'),
    });
    new cdk.CfnCondition(this, 'CreateInboundEndpoint', {
      expression: cdk.Fn.conditionEquals(endpointType, 'INBOUND'),
    });

    const resolverSgName = cdk.Fn.conditionIf('CreateOutboundEndpoint', 'outbound-resolver-endpoint-sg', 'inbound-resolver-endpoint-sg');

    const resolverSecurityGroup = new ec2.CfnSecurityGroup(this, 'ResolverSecurityGroup', {
      vpcId: vpcId.valueAsString,
      groupDescription: 'Security group controlling Route53 Endpoint access',
      groupName: resolverSgName.toString(),
      securityGroupIngress: cdk.Fn.conditionIf('CreateInboundEndpoint', [{
        ipProtocol: 'tcp',
        cidrIp: endpointCidr.valueAsString,
        fromPort: 53,
        toPort: 53,
      },
      {
        ipProtocol: 'udp',
        cidrIp: endpointCidr.valueAsString,
        fromPort: 53,
        toPort: 53,
      }], cdk.Aws.NO_VALUE ),
      securityGroupEgress: cdk.Fn.conditionIf('CreateOutboundEndpoint', [{
        ipProtocol: 'tcp',
        cidrIp: endpointCidr.valueAsString,
        fromPort: 53,
        toPort: 53,
      },
      {
        ipProtocol: 'udp',
        cidrIp: endpointCidr.valueAsString,
        fromPort: 53,
        toPort: 53,
      }], cdk.Aws.NO_VALUE ),
    });

    const resolverEndpoint = new route53resolver.CfnResolverEndpoint(this, 'MyCfnResolverEndpoint', {
      direction: endpointType.valueAsString,
      ipAddresses: [{ subnetId: endpointSubnetA.valueAsString }, { subnetId: endpointSubnetB.valueAsString }],
      securityGroupIds: [resolverSecurityGroup.attrGroupId],
      name: 'name',
    });

    new cdk.CfnOutput(this, 'ResolverEndpointId', {
      value: resolverEndpoint.attrArn,
      description: 'Route53 Resolver Endpoint ID',
    });

  }
}