//import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as eb from '@aws-cdk/aws-elasticbeanstalk';
import * as iam from '@aws-cdk/aws-iam';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { CDEBConstruct } from './cd-eb-construct';
import { CIConstruct } from './ci-construct';

export interface ckProps extends cdk.StackProps {

}

export class SCProductBeanstalkDockerStack extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ckProps) {
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
              'TargetSubnets',
              'TargetSubnet1',
              'TargetSubnet2',
              'VpcId',
            ],
          },
          {
            Label: {
              default: 'ALB Configuration',
            },
            Parameters: [
              'ELBArn',
              'ELBSecurityGroupId',
              'PathPattern',
              'HostHeader',
            ],
          },
          {
            Label: {
              default: 'EB Environment Configuration',
            },
            Parameters: [
              'ServiceName',
              'E2InstanceType',
              'TGHealthCheckPath',
              'EBPlatformType',
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

    const vpcId = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'VPC ID for ECS Cluster',
    });

    const targetSubnet1 = new cdk.CfnParameter(this, 'TargetSubnet1', {
      type: 'AWS::EC2::Subnet::Id',
      description: ' target subnet for the elastic beanstalk',
    });

    const targetSubnet2 = new cdk.CfnParameter(this, 'TargetSubnet2', {
      type: 'AWS::EC2::Subnet::Id',
      description: ' target subnet for the elastic beanstalk',
    });

    const instanceType = new cdk.CfnParameter(this, 'E2InstanceType', {
      type: 'String',
      description: 'Instance Type of EB EC2',
      default: 't3.medium',
      allowedValues:
        //['t4g.micro', 't3a.micro', 't3a.small', 't3a.medium', 't3a.large', 'm5a.micro', 'm5a.small', 'm5a.medium', 'm5a.large'],
        ['t3.micro', 't3.small', 't3.medium', 't3.large', 't3.xlarge', 'm6i.large', 'm6i.xlarge', 'm5.large', 'm5.xlarge'],
    });

    const platformType = new cdk.CfnParameter(this, 'EBPlatformType', {
      type: 'String',
      description: 'Elastic Beanstalk supports the following Tomcat platform versions',
      default: '64bit Amazon Linux 2 v3.4.13 running Docker',
      allowedValues:
        ['64bit Amazon Linux 2 v4.2.13 running Tomcat 8.5 Corretto 11',
          '64bit Amazon Linux 2 v4.2.13 running Tomcat 8.5 Corretto 8',
          '64bit Amazon Linux 2 v3.4.13 running Docker',
          '64bit Windows Server Core 2012 R2 v2.3.0 running .NET Core',
          '64bit Windows Server 2012 R2 v2.9.0 running IIS 8.5',
          '64bit Windows Server 2016 v2.9.0 running IIS 10.0',
          '64bit Windows Server Core 2019 v2.9.0 running IIS 10.0',
          '64bit Windows Server 2019 v2.9.0 running IIS 10.0',
          '64bit Amazon Linux 2 v5.5.1 running Node.js 16',
          '64bit Amazon Linux 2 v5.5.1 running Node.js 14',
          '64bit Amazon Linux 2 v3.3.12 running PHP 8.0',
          '64bit Amazon Linux 2 v3.3.12 running Python 3.8',
          '64bit Amazon Linux 2 v3.3.12 running Python 3.7'],
    });

    /* const tgListenerPort = new cdk.CfnParameter(this, 'TGListenerPort', {
      type: 'Number',
      description: 'The port on which the listener listens for requests',
      default: 80,
    });
 */

    const tgHealthCheckPath = new cdk.CfnParameter(this, 'TGHealthCheckPath', {
      type: 'String',
      description: 'Health Check Path for EB Application',
      default: '/health',
    });
    /* const tgHealthCheckPort = new cdk.CfnParameter(this, 'TGHealthCheckPort', {
      type: 'Number',
      description: 'Health Check Path for ECS Container',
      default: 80,
    }); */

    const ElbArn = new cdk.CfnParameter(this, 'ELBArn', {
      description: 'the ARN of ELB ',
      type: 'String',
    });

    const elbSgId = new cdk.CfnParameter(this, 'ELBSecurityGroupId', {
      type: 'AWS::EC2::SecurityGroup::Id',
      description: 'SecurityGroupId of ELB',
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'This will set the Container, Task Definition, and Service name in Fargate',
      default: 'amazon-ecs-sample',
    });

    /* const ECRRepoName = new cdk.CfnParameter(this, 'ECRRepoName', {
      type: 'String',
      description: 'Name of Amazon Elastic Container Registry',
      default: 'amazon/amazon-ecs-sample',
    }); */

    const pathPattern = new cdk.CfnParameter(this, 'PathPattern', {
      type: 'String',
      description: 'ALB Path Pattern (/, /health)',
      default: '/',
    });

    const hostHeader = new cdk.CfnParameter(this, 'HostHeader', {
      type: 'String',
      description: 'ALB Host Header (test.example.com)',
      default: 'test.example.com',
    });

    const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    });

    // Create EB Application Security Group
    const ebSg = new ec2.CfnSecurityGroup(this, 'EBSecurityGroup', {
      vpcId: vpcId.valueAsString,
      groupDescription: `Access to the ElasticBeanstalk Application ${serviceName.valueAsString}`,
      groupName: `${Environment.valueAsString}-eb-${serviceName.valueAsString}-sg`,
    });

    new ec2.CfnSecurityGroupIngress(this, 'ECSSecurityGroupIngressFromALB', {
      ipProtocol: '-1',
      description: 'Ingress from the ALB',
      groupId: ebSg.attrGroupId,
      sourceSecurityGroupId: elbSgId.valueAsString,
    });

    // beanstalk project setup
    const ebApp = new eb.CfnApplication(this, 'EBApplication', {
      applicationName: `${serviceName.valueAsString}`,
      description: `${Environment.valueAsString} ${serviceName.valueAsString} EB Application`,
    });

    // Create EC2 Instance Role
    const ec2ProfileRole = new iam.Role(this, 'Ec2InstanceProfileRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: `${Environment.valueAsString}-${serviceName.valueAsString}-ec2-instance-profile`,
    });

    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkMulticontainerDocker'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWorkerTier'));
    ec2ProfileRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'));
    ec2ProfileRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        's3:Get*',
        's3:List*',
      ],
    }));

    const beanstalkEC2Instance = new iam.CfnInstanceProfile(this, 'InstanceProfile', {
      roles: [ec2ProfileRole.roleName],
      instanceProfileName: `${Environment.valueAsString}-${serviceName.valueAsString}-ec2-instance-profile`,
    });

    // Create Beanstalk Instance Role
    const ebServiceRole = new iam.Role(this, 'EBServiceRole', {
      assumedBy: new iam.ServicePrincipal('elasticbeanstalk.amazonaws.com'),
      //roleName: `${Environment.valueAsString}-${serviceName.valueAsString}-eb-service-role`,
    });

    ebServiceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSElasticBeanstalkEnhancedHealth'));
    //ebServiceRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('aws-service-role/AWSElasticBeanstalkServicePolicy'));
    ebServiceRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: [
        's3:Get*',
        's3:List*',
      ],
    }));

    // Option Setting for EB Enviornment
    const option_settings: eb.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: vpcId.valueAsString,
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        //value: targetSubnets.valueAsList.join(),
        value: cdk.Lazy.string({ produce: () => targetSubnet1.valueAsString + ',' + targetSubnet2.valueAsString }),
        //value: 'subnet-1234,subnet-34556',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'application',
      },

      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerIsShared',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'EnvironmentType',
        value: 'LoadBalanced',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'ServiceRole',
        value: ebServiceRole.roleName,
      },
      {
        namespace: 'aws:elbv2:loadbalancer',
        optionName: 'SharedLoadBalancer',
        value: ElbArn.valueAsString,
      },
      {
        namespace: 'aws:elbv2:loadbalancer',
        optionName: 'ManagedSecurityGroup',
        value: elbSgId.valueAsString,
      },

      {
        namespace: 'aws:elbv2:listener:443',
        optionName: 'Rules',
        value: 'hostheaders,pathpatterns',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'Port',
        value: '80',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'Protocol',
        value: 'HTTP',
      },
      {
        namespace: 'aws:elbv2:listenerrule:hostheaders',
        optionName: 'HostHeaders',
        value: hostHeader.valueAsString,
      },
      {
        namespace: 'aws:elbv2:listenerrule:hostheaders',
        optionName: 'priority',
        value: '100',
      },
      {
        namespace: 'aws:elbv2:listenerrule:pathpatterns',
        optionName: 'PathPatterns',
        value: pathPattern.valueAsString,
      },
      {
        namespace: 'aws:elbv2:listenerrule:pathpatterns',
        optionName: 'Priority',
        value: '200',
      },
      {
        namespace: 'aws:elasticbeanstalk:environment:process:default',
        optionName: 'HealthCheckPath',
        value: tgHealthCheckPath.valueAsString,
      },
      {
        namespace: 'aws:elasticbeanstalk:application',
        optionName: 'Application Healthcheck URL',
        value: tgHealthCheckPath.valueAsString,
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'MeasureName',
        value: 'CPUUtilization',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'Statistic',
        value: 'Average',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'Unit',
        value: 'Percent',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'LowerThreshold',
        value: '20',
      },
      {
        namespace: 'aws:autoscaling:trigger',
        optionName: 'UpperThreshold',
        value: '70',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '5',
      },
      {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
      },
      /* {
        namespace: 'aws:autoscaling:asg',
        optionName: 'Custom Availability Zones',
        value: 'ap-northeast-2a,ap-northeast-2c',
      }, */
      {
        namespace: 'aws:ec2:instances',
        optionName: 'InstanceTypes',
        value: instanceType.valueAsString,
      },
      /*   {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'ImageId',
        value: 'ami-08961f7fe5bf256de',
      }, */
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: beanstalkEC2Instance.instanceProfileName,
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'RootVolumeType',
        value: 'gp3',
      },
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'RootVolumeSize',
        value: '30',
      },
      /*
      {
        namespace: 'aws:elasticbeanstalk:container:tomcat:jvmoptions',
        optionName: 'Xms',
        value: '2048m',
      },
      {
        namespace: 'aws:elasticbeanstalk:container:tomcat:jvmoptions',
        optionName: 'Xmx',
        value: '2048m',
      },
      */
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'StreamLogs',
        value: 'true',
      },
      {
        namespace: 'aws:elasticbeanstalk:cloudwatch:logs',
        optionName: 'RetentionInDays',
        value: '7',
      },
    ];

    const ebEnv = new eb.CfnEnvironment(this, 'EBEnvironment', {
      // default environmentName is `develop`
      environmentName: `${Environment.valueAsString}-${serviceName.valueAsString}-env`,
      applicationName: `${serviceName.valueAsString}`,
      solutionStackName: platformType.valueAsString,
      optionSettings: option_settings,
      /* tags: [
        { key: 'cz-org', value: 'skmg' },
        { key: 'cz-stage', value: props.stage },
        { key: 'cz-project', value: 'magicmall' },
      ], */
    });
    ebEnv.addDependsOn(ebApp);

    const ci = new CIConstruct(this, 'CI', { serviceName: serviceName.valueAsString, sourceProvider: provider.valueAsString });

    /* const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './deploy-buildspec.yml'), 'utf8'));
    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        CONTAINER_NAME: { value: serviceName.valueAsString },
        //CONTAINER_PORT: { value: CONTAINER_PORT.valueAsNumber },
        DEPLOY_ENV_NAME: { value: ebEnv.environmentName },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        //TARGET_TYPE: { value: TARGET_TYPE.valueAsString },
        TARGET_TYPE: { value: 'BEANSTALK' },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
    });
    deployProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'ecs:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'logs:*',
        'cloudformation:*'],
    })); */

    /* const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: ci.buildOutput,
      project: deployProject,
    }); */

    new CDEBConstruct(this, 'CDEB', {
      pipeline: ci.pipeline,
      serviceName: `${serviceName.valueAsString}`,
      targetEnv: `${Environment.valueAsString}-${serviceName.valueAsString}-env`,
      targetType: 'BEANSTALK',
      imageTag: 'latest',
      buildOutput: ci.buildOutput,
    });


    // S3 SourceAction

    // Deploy to Dev

    // Approval

    // Deploy to Prod

    //const pipeline = new codepipeline.Pipeline(this, 'MyFirstPipeline');

    /**
     * 1.1 Add Source Stage to pipeline
     */
    /* const sourceStage = pipeline.addStage({
      stageName: 'Source',
    });

    const sourceOutput = new codepipeline.Artifact('Source');

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub-Source',
      owner: 'jingood2',
      repo: 'my-web-app',
      oauthToken: cdk.SecretValue.secretsManager('atcl/jingood2/github-token'),
      output: sourceOutput,
      branch: 'master', // default: 'master'
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK, // default: 'WEBHOOK', 'NONE' is also possible for no Source trigger
    }); */

    /**
     * 1.2 Add Source Action to Source Stage
     */
    /* sourceStage.addAction(sourceAction);

    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: `${envVars.APP_NAME}-build`,
      description: 'Build tomcat application',
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'echo Installing awscli',
              'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
              'unzip awscliv2.zip',
              './aws/install',
            ],
          },
          build: {
            commands: [
              'echo build started on `date +%s`',
              //`eb init ${envVars.APP_NAME} --region ${envVars.REGION} --platform tomcat-8-java-8`,
              //`eb deploy ${envVars.APP_STAGE_NAME}`,
              'mvn clean package',
              'export POM_VERSION=$(mvn -q -Dexec.executable=echo -Dexec.args=\'${project.version}\' --non-recursive exec:exec)',
              'export WAR_NAME=${EB_APP_NAME}-${POM_VERSION}.war',
              'export EB_VERSION=1.0-SNAPSHOT_`date +%s`',
              'aws s3 cp target/*.war s3://elasticbeanstalk-ap-northeast-2-955697143463/${WAR_NAME}',
              'env',
              'aws elasticbeanstalk create-application-version --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --source-bundle S3Bucket=elasticbeanstalk-ap-northeast-2-955697143463,S3Key=${WAR_NAME}',
              'aws elasticbeanstalk update-environment --application-name ${EB_APP_NAME} --version-label ${EB_VERSION} --environment-name ${EB_STAGE}',
            ],
          },
        },
      }),
      //Build environment to use for the build.
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          // you can add more env variables here as per your requirement
          EB_APP_NAME: {
            //value: envVars.APP_NAME,
            value: `${props.appName}-${props.stage}`,
          },
          EB_STAGE: {
            //value: envVars.APP_STAGE_NAME,
            //value: 'dev',
            value: `${props.appName}-${props.stage}`,
          },
        },
      },

      //Indicates whether AWS CodeBuild generates a publicly accessible URL for your project's build badge.
      //badge: true,
      timeout: cdk.Duration.hours(1),
    }); */

    /* buildProject.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkFullAccess'),
    );

    buildProject.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['elasticbeanstalk:*',
        'autoscaling:*',
        'elasticloadbalancing:*',
        'rds:*',
        's3:*',
        'ec2:*',
        'cloudwatch:*',
        'logs:*',
        'cloudformation:*'],
    })); */

    /**
     * 1.3 Add Source Stage to pipeline
     */
    /* const buildStage = pipeline.addStage({
      stageName: 'BuildAndDeployDEV',
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      input: sourceOutput,
      project: buildProject,
      type: codepipeline_actions.CodeBuildActionType.BUILD,
    });

    buildStage.addAction(buildAction);

    const approvalStage = pipeline.addStage({
      stageName: 'Approval',
    });

    approvalStage.addAction(new codepipeline_actions.ManualApprovalAction({
      actionName: 'ManualApproval',
      notifyEmails: ['jingood2@gmail.com'],
    })); */

    // CloudZ Tags

  }
}