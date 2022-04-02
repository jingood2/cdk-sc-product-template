//import * as ec2 from '@aws-cdk/aws-ec2';
//import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
//import * as ssm from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';
//import { StackName } from './product-ecs-fargate-stack';

export interface ProductEcsFargateServiceProps extends cdk.StackProps {

}

export class ProductEcsFargateServiceStack extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductEcsFargateServiceProps) {
    super( scope, id );

    console.log(props);


    //const vpc = ec2.Vpc.fromLookup(this, 'DevVpc', { vpcId: 'vpc-03cda715311273495', region: 'ap-northeast-2' });

    /*  new ecs.Cluster(this, 'Cluster', {
      clusterName: 'ecs-dev-cluster',
      //vpc: vpc,
      containerInsights: true,
    });
    */
    //new ProductEcsClusterConstruct(this, id, { environment: Environment.valueAsString, vpcId: vpcId.valueAsString });
    //new StackName(this, 'MyStack', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }, scheme: scheme.valueAsString) } );
    //new StackName(this, 'MyStack', { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION } } );

    /* const albArn = ssm.StringParameter.valueFromLookup(this, '/dev/alb/internal/arn');
    const albSgId = ssm.StringParameter.valueFromLookup(this, '/dev/alb/internal/sgId');

    elbv2.ApplicationLoadBalancer.fromApplicationLoadBalancerAttributes(this, 'Alb', {
      loadBalancerArn: cdk.Lazy.string({ produce: () => albArn }),
      securityGroupId: cdk.Lazy.string( { produce: () => albSgId } ),
    });
 */

  }

}