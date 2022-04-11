//import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
//import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
//import * as ssm from '@aws-cdk/aws-ssm';
import * as iam from '@aws-cdk/aws-iam';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { CDConstruct } from './cd-construct';
import { CIConstruct } from './ci-construct';

export interface StackNameProps extends cdk.StackProps {
}

export class StackName extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: StackNameProps) {
    super(scope, id );

    console.log(props);

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: [
          {
            Label: {
              default: 'VPC Configuration',
            },
            Parameters: [
              'Environment',
              'TargetSubnet1',
              'TargetSubnet2',
              'VpcId',
            ],
          },
          {
            Label: {
              default: 'ELB Configuration',
            },
            Parameters: [
              'ELBListenerArn',
              'ELBSecurityGroupId',
              'TGListenerPort',
              'TGHealthCheckPath',
              'TGHealthCheckPort',
              'PathPattern',
              'HostHeader',
            ],
          },
          {
            Label: {
              default: 'ECS Fargate Service Configuration',
            },
            Parameters: [
              'ServiceName',
              'ContainerSGId',
              'ECRRepoName',
              'ContainerSize',
              'ContainerPort',
              //'ContainerEnv',
              'Priority',
            ],
          },
        ],
      },
    };

    const Environment = new cdk.CfnParameter(this, 'Environment', {
      description: 'Environment',
      type: 'String',
      default: 'dev',
      allowedValues: ['dmz', 'dev', 'shared', 'prod'],
    });

    const listenerArn = new cdk.CfnParameter(this, 'ELBListenerArn', {
      description: 'the ARN of ELB Listner',
      type: 'String',
    });

    const elbSgId = new cdk.CfnParameter(this, 'ELBSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'SecurityGroupId of ELB',
    });

    const targetSubnet1 = new cdk.CfnParameter(this, 'TargetSubnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Launch application load balancer into these subnets',
    });

    const targetSubnet2 = new cdk.CfnParameter(this, 'TargetSubnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: 'Launch application load balancer into these subnets',
    });

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const tgListenerPort = new cdk.CfnParameter(this, 'TGListenerPort', {
      type: 'Number',
      description: 'The port on which the listener listens for requests',
      default: 80,
    });


    const tgHealthCheckPath = new cdk.CfnParameter(this, 'TGHealthCheckPath', {
      type: 'String',
      description: 'Health Check Path for ECS Container',
      default: '/',
    });
    const tgHealthCheckPort = new cdk.CfnParameter(this, 'TGHealthCheckPort', {
      type: 'Number',
      description: 'Health Check Path for ECS Container',
      default: 80,
    });

    const containerSGId = new cdk.CfnParameter(this, 'ContainerSGId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'Security Id for ECS Container',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'This will set the Container, Task Definition, and Service name in Fargate',
      default: 'amazon-ecs-sample',
    });

    const ECRRepoName = new cdk.CfnParameter(this, 'ECRRepoName', {
      type: 'String',
      description: 'Name of Amazon Elastic Container Registry',
      default: 'amazon/amazon-ecs-sample',
    });

    const containerSize = new cdk.CfnParameter(this, 'ContainerSize', {
      description: 'Size of container for Fargate task(MB)',
      type: 'Number',
      //default: 'small(1vCPU, 2GB)',
      default: '512',
      allowedValues: ['512', '1024', '2048', '4096', '8192'],
    });

    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'port number exposed from the container image',
      default: 80,
    });

    const priority = new cdk.CfnParameter(this, 'Priority', {
      type: 'Number',
      description: 'Priority of Listener Rule',
      default: 100,
    });

    const pathPattern = new cdk.CfnParameter(this, 'PathPattern', {
      type: 'CommaDelimitedList',
      description: 'ALB Path Pattern (/, /health)',
      default: '/',
    });

    const hostHeader = new cdk.CfnParameter(this, 'HostHeader', {
      type: 'CommaDelimitedList',
      description: 'ALB Host Header (test.example.com)',
      default: 'test.example.com',
    });

    /* const containerEnv = new cdk.CfnParameter(this, 'ContainerEnv', {
      type: '',
      description: 'Container Environment Variables( DB_USER=test, DB_PASSWORD=test1234',
      default: 'DB_USER=admin,DB_PASSWORD=admin1234',
    }); */

    /*  const regionTable = new cdk.CfnMapping(this, 'MapContainerSize', {
      mapping: {
        smallest: {
          mem: 512,
        },
        small: {
          mem: 1024,
        },
        medium: {
          mem: 2048,
        },
        large: {
          mem: 4096,
        },
        largest: {
          mem: 8192,
        },
      },
    }); */

    const albSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'ALBSG', elbSgId.valueAsString );

    const listener = elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'listener', {
      listenerArn: cdk.Lazy.string({ produce: () => listenerArn.valueAsString }),
      securityGroup: albSg,
    });


    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: cdk.Lazy.string( { produce: () => vpcId.valueAsString }),
      availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
      // eslint-disable-next-line max-len
      privateSubnetIds: [cdk.Lazy.string({ produce: () => targetSubnet1.valueAsString }), cdk.Lazy.string( { produce: () => targetSubnet2.valueAsString })],
    });

    const atg = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      targetGroupName: `${serviceName.valueAsString}-ecs-tg`,
      vpc: vpc,
      port: cdk.Lazy.number({ produce: () => tgListenerPort.valueAsNumber }),
      healthCheck: { path: tgHealthCheckPath.valueAsString, port: tgHealthCheckPort.valueAsString },
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    const taskExecutionRole = new iam.Role(this, 'ecs-task-execution-role', {
      roleName: `${serviceName.valueAsString}-ecs-task-execution-role`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    const executionRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ecr:GetAuthorizationToken',
        'ecr:BatchCheckLayerAvailability',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'elasticloadbalancing:*',
      ],
    });

    //taskExecutionRole.addToPolicy(executionRolePolicy);
    taskExecutionRole.addToPrincipalPolicy(executionRolePolicy);

    // Standard ECS service setup
    //const memsize = Number(regionTable.findInMap(cdk.Lazy.string({ produce: () => containerSize.valueAsString }), 'mem'));
    //const cpusize = Number(regionTable.findInMap(containerSize.valueAsString, 'cpu'));
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      executionRole: taskExecutionRole,
      //memoryLimitMiB: Number(regionTable.findInMap(containerSize.valueAsString, 'mem')),
      memoryLimitMiB: containerSize.valueAsNumber,
    });

    /* const volume = {
      // Use an Elastic FileSystem
      name: 'mydatavolume',
      efsVolumeConfiguration: {
        fileSystemId: 'EFS',
        // ... other options here ...
      },
    }; */
    //taskDefinition.addVolume(volume);

    //const containerEnvironments = cdk.Lazy.list({ produce: () => containerEnv.valueAsList }, { displayHint: 'DB_USER=admin', omitEmpty: false } );

    const container = taskDefinition.addContainer('app', {
      containerName: `${serviceName.valueAsString}`,
      //image: ecs.ContainerImage.fromEcrRepository(ecr.Repository.fromRepositoryName(this, 'ECRRepo', `${ECRRepoName.valueAsString}`), 'latest'),
      image: ecs.ContainerImage.fromRegistry(ECRRepoName.valueAsString),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ecs' }),
    });

    //const containerEnvironments = containerEnv.valueAsList;

    /*  const containerEnvironments = cdk.Lazy.list({ produce: () => containerEnv.valueAsList });

    for ( let env in containerEnvironments) {
      container.addEnvironment(env.split('=')[0], env.split('=')[1]);
    } */

    container.addPortMappings({
      containerPort: containerPort.valueAsNumber,
      protocol: ecs.Protocol.TCP,
    });

    //ec2.SecurityGroup.fromSecurityGroupId(this, 'SG', cdk.Lazy.string( { produce: () =>elbSgId.valueAsString } ) );
    const containerSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'ContainerSG', cdk.Lazy.string( { produce: () => containerSGId.valueAsString }));

    const cluster = ecs.Cluster.fromClusterAttributes(this, 'ECsCluster', {
      clusterName: `${Environment.valueAsString}-cluster`,
      clusterArn: `arn:aws:ecs:${process.env.CDK_DEFAULT_REGION}:${process.env.CDK_DEFAULT_ACCOUNT}:cluster/${Environment.valueAsString}-cluster`,
      vpc: vpc,
      securityGroups: [containerSg],
    });

    const svc = new ecs.FargateService(this, 'FargateService', {
      serviceName: serviceName.valueAsString,
      cluster: cluster,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
      desiredCount: 1,
      taskDefinition,
      securityGroups: [containerSg],
    });

    // ToDo: setting AutoScaling

    new elbv2.ApplicationListenerRule(this, 'MyApplicationListenerRule', {
      listener: listener,
      priority: priority.valueAsNumber,
      // the properties below are optional
      conditions: [
        elbv2.ListenerCondition.pathPatterns(pathPattern.valueAsList),
        elbv2.ListenerCondition.hostHeaders(hostHeader.valueAsList),
      ],
      //targetGroups: [props.targetGroup],
      targetGroups: [atg],
    });

    atg.addTarget(svc);

    const ci = new CIConstruct(this, 'CI', { containerName: serviceName.valueAsString });

    const deployAction = new codepipeline_actions.EcsDeployAction({
      actionName: 'ECSDeployAction',
      service: svc,
      // if your file is called imagedefinitions.json,
      // use the `input` property,
      // and leave out the `imageFile` property
      // if your file name is _not_ imagedefinitions.json,
      // use the `imageFile` property,
      // and leave out the `input` property
      imageFile: ci.buildOutput.atPath('Dockerrun.aws.json'),
      deploymentTimeout: cdk.Duration.minutes(60), // optional, default is 60 minutes
    });

    new CDConstruct(this, 'CD', { pipeline: ci.pipeline, deployAction: deployAction });
  }
}