import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';

export interface ProductEcsClusterConstructProps extends cdk.StackProps {
  environment: string;
  vpcId: string;
}

export class ProductEcsClusterConstruct extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: ProductEcsClusterConstructProps) {
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

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Lazy.string( { produce: () => props.vpcId }),
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    });

    const ecsCluster = new ecs.Cluster(this, 'ECSCluster', {
      clusterName: `${props.environment}-cluster`,
      vpc: vpc,
    });

    // Create ContainerSecurityGroup and Role
    const containerSecurityGroup = new ec2.CfnSecurityGroup(this, 'ContainerSecurityGroup', {
      vpcId: props.vpcId,
      groupDescription: 'Access to the Fargate containers',
      groupName: `${props.environment}-container-sg`,
    });

    // A role used to allow AWS Autoscaling to inspect stats and adjust scaleable targets
    // on your AWS account
    const autoscalingRole = new iam.Role(this, 'AutoscalingRole', {
      assumedBy: new iam.ServicePrincipal('application-autoscaling.amazonaws.com'),
    });

    autoscalingRole.addToPolicy(new PolicyStatement({
      sid: 'serviceautoscaling',
      resources: ['*'],
      actions: [
        'application-autoscaling:*',
        'cloudwatch:DescribeAlarms',
        'cloudwatch:PutMetricAlarm',
        'ecs:DescribeServices',
        'ecs:UpdateService',
      ],
    }));

    // This is an IAM role which authorizes ECS to manage resources on your
    // account on your behalf, such as updating your load balancer with the
    // details of where your containers are, so that traffic can reach your
    // containers.
    const ecsRole = new iam.Role(this, 'ECSRole', {
      assumedBy: new iam.ServicePrincipal('ecs.amazonaws.com'),
    });

    ecsRole.addToPolicy(new PolicyStatement({
      sid: 'ecsservice',
      resources: ['*'],
      actions: [
        'ec2:AttachNetworkInterface',
        'ec2:CreateNetworkInterface',
        'ec2:CreateNetworkInterfacePermission',
        'ec2:DeleteNetworkInterface',
        'ec2:DeleteNetworkInterfacePermission',
        'ec2:Describe*',
        'ec2:DetachNetworkInterface',
        'elasticloadbalancing:DeregisterInstancesFromLoadBalancer',
        'elasticloadbalancing:DeregisterTargets',
        'elasticloadbalancing:Describe*',
        'elasticloadbalancing:RegisterInstancesWithLoadBalancer',
        'elasticloadbalancing:RegisterTargets',
      ],
    }));


    const ecsTaskExecutionRole = new iam.Role(this, 'ECSTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    ecsTaskExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],

    }));

    new cdk.CfnOutput(this, 'ClusterName', {
      description: 'The name of the ECS cluster',
      value: ecsCluster.clusterArn,
      exportName: `${id}:${props.environment}:ClusterName`,
    });

    new cdk.CfnOutput(this, 'ContainerSecurityGroupOutput', {
      value: containerSecurityGroup.ref,
      description: 'A security group used to allow Fargate containers to receive traffic',
      exportName: `${id}:${props.environment}:ContainerSecurityGroup`,
    });

    new cdk.CfnOutput(this, 'AutoscalingRoleOutput', {
      value: autoscalingRole.roleArn,
      description: 'The ARN of the role used for autoscaling',
      exportName: `${id}:${props.environment}:AutoscalingRole`,
    });

    new cdk.CfnOutput(this, 'ECSRoleOutput', {
      value: ecsRole.roleArn,
      description: 'The ARN of the role used for ECS',
      exportName: `${id}:${props.environment}:ECSRole`,
    });

    new cdk.CfnOutput(this, 'ECSTaskExecutionRoleOutput', {
      value: ecsTaskExecutionRole.roleArn,
      description: 'The ARN of the role used for ECS Task Role',
      exportName: `${id}:${props.environment}:ECSTaskExecutionRole`,
    });

  }

}