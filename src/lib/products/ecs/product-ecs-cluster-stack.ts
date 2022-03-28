//import * as ec2 from '@aws-cdk/aws-ec2';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { ProductEcsClusterConstruct } from './product-ecs-cluster-construct';

export interface ProductEcsClusterProps extends cdk.StackProps {

}

export class ProductEcsCluster extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductEcsClusterProps) {
    super( scope, id );

    console.log(props);

    const Environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    //const vpc = ec2.Vpc.fromLookup(this, 'DevVpc', { vpcId: 'vpc-03cda715311273495', region: 'ap-northeast-2' });

    /*  new ecs.Cluster(this, 'Cluster', {
      clusterName: 'ecs-dev-cluster',
      //vpc: vpc,
      containerInsights: true,
    });
    */
    new ProductEcsClusterConstruct(this, id, { environment: Environment.valueAsString, vpcId: vpcId.valueAsString });

  }

}