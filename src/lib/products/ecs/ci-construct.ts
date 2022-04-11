import * as fs from 'fs';
import * as path from 'path';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as s3 from '@aws-cdk/aws-s3';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as cdk from '@aws-cdk/core';
import * as yaml from 'yaml';

export interface CIConstructProps {
  //containerPort: number;
  containerName: string;
  //sourceProvider: string;
  //targetType: string;
}

export class CIConstruct extends cdk.Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildOutput: codepipeline.Artifact;
  constructor(scope: cdk.Construct, id: string, props: CIConstructProps) {
    super(scope, id);

    const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    });

    const containerName = new cdk.CfnParameter(this, 'ServiceName', {
      type: 'String',
      description: 'Service Name',
      default: 'demo-app',
    });

    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'Container Port',
      default: '8080',
    });

    const repoName = new cdk.CfnParameter(this, 'RepoName', {
      type: 'String',
      description: 'Git Repository or S3 Bucket Name',
    });

    const repoOwner= new cdk.CfnParameter(this, 'RepoOwner', {
      default: 'main',
    });

    const repoBranch = new cdk.CfnParameter(this, 'RepoBranch', {
      default: 'main',
    });

    const githubTokenSecretId = new cdk.CfnParameter(this, 'Github Secret Token Id', {
      type: 'String',
      description: '(Github Only Use)Secret Token Id for Github',
    });

    // BuildProejct
    const buildType = new cdk.CfnParameter(this, 'PackagingType', {
      type: 'String',
      description: 'Source Packaging Tool',
      default: 'GRADLE',
      allowedValues: ['MAVEN', 'GRADLE', 'NPM', 'PYTHON'],
    });

    /* const DEPLOY_ENV_NAME = new cdk.CfnParameter(this, 'DeployEnvName', {
      type: 'String',
      description: 'deploy target enviornment(ECS Cluster, EKS Cluster, ElasticBeanstalk Environment Name',
    }); */

    const TARGET_TYPE = new cdk.CfnParameter(this, 'TargetTYPE', {
      type: 'String',
      description: 'platfrom of applcation',
      default: 'ECS',
      allowedValues: ['ECS', 'BEANSTALK', 'EKS', 'EC2', 'LAMBDA'],
    });

    const isGithub = new cdk.CfnCondition(this, 'IsGithubCondition', {
      expression: cdk.Fn.conditionEquals('GITHUB', provider.valueAsString),
    });

    /*
    const isCodecommit = new cdk.CfnCondition(this, 'IsCodecommitCondition', {
      expression: cdk.Fn.conditionEquals('CODECOMMIT', provider.valueAsString),
    });
    const isS3= new cdk.CfnCondition(this, 'IsS3Condition', {
      expression: cdk.Fn.conditionEquals('S3', provider.valueAsString),
    }); */

    console.log(props);

    const sourceOutput = new codepipeline.Artifact('Source');
    this.buildOutput = new codepipeline.Artifact('Build');
    //const deployOutput = new codepipeline.Artifact('Deploy');

    const ecrRepository = new ecr.Repository(this, 'ECRRepository', {
      repositoryName: `${containerName.valueAsString}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const buildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './buildspec.yml'), 'utf8'));
    const buildProject = new codebuild.PipelineProject(this, 'CIBuildProject', {
      buildSpec: codebuild.BuildSpec.fromObject(buildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        CONTAINER_NAME: { value: containerName.valueAsString },
        CONTAINER_PORT: { value: containerPort.valueAsNumber },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        BUILD_TYPE: { value: buildType.valueAsString },
        TARGET_TYPE: { value: TARGET_TYPE.valueAsString },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });
    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    const artfactS3 = new s3.Bucket(this, 'S3BucketsApp', {
      bucketName: `${props.containerName}-codepipeline-artifact`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GithubSource
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubSourcePipeline', {
      pipelineName: `${props.containerName}-cicd`,
      artifactBucket: artfactS3,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GITHUB',
              owner: repoOwner.valueAsString,
              repo: repoName.valueAsString,
              branch: repoBranch.valueAsString,
              trigger: codepipeline_actions.GitHubTrigger.NONE,
              oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretId.valueAsString),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [new codepipeline_actions.CodeBuildAction({
            actionName: 'Build_DockerImage_ECR',
            input: sourceOutput,
            outputs: [this.buildOutput],
            project: buildProject,
          })],
        },
      ],
    });

    this.pipeline = githubPipeline;

    const cfnGithubPipeline = githubPipeline.node.defaultChild as codepipeline.CfnPipeline;
    cfnGithubPipeline.cfnOptions.condition = isGithub;

    // GitHub Source Webhook
    const cfnGitHubWebhook = new codepipeline.CfnWebhook(this, 'CfnGitHubWebhook', {
      authentication: 'GITHUB_HMAC',
      authenticationConfiguration: {
        secretToken: secretsmanager.Secret.fromSecretNameV2(this, 'GithubPAT', githubTokenSecretId.valueAsString ).secretValue.toString(),
      },
      filters: [{
        jsonPath: '$.ref',
        matchEquals: 'refs/heads/{Branch}',
      }],
      targetAction: 'GITHUB',
      targetPipeline: githubPipeline.pipelineName,
      targetPipelineVersion: 1,

      registerWithThirdParty: true,
    });

    cfnGitHubWebhook.cfnOptions.condition = isGithub;
  }
}