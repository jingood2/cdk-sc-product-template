import * as fs from 'fs';
import * as path from 'path';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ecr from '@aws-cdk/aws-ecr';
import * as s3 from '@aws-cdk/aws-s3';
//import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as cdk from '@aws-cdk/core';
import * as yaml from 'yaml';

export interface CIConstructProps {
  //containerPort: number;
  serviceName: string;
  //sourceProvider: string;
  //targetType: string;
}

export class CIConstruct extends cdk.Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildOutput: codepipeline.Artifact;
  public readonly IMAGE_TAG: string;
  constructor(scope: cdk.Construct, id: string, props: CIConstructProps) {
    super(scope, id);

    const provider = new cdk.CfnParameter(this, 'SourceProviderType', {
      type: 'String',
      description: 'Source Provider Type',
      default: 'GITHUB',
      allowedValues: ['GITHUB', 'CODECOMMIT', 'S3'],
    });

    const serviceName = new cdk.CfnParameter(this, 'ServiceName', {
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
      description: 'deploy target enviornment(ECS Service ARN, EKS Cluster, ElasticBeanstalk Environment Name',
    }); */

    const TARGET_TYPE = new cdk.CfnParameter(this, 'TargetTYPE', {
      type: 'String',
      description: 'platfrom of applcation',
      default: 'ECS',
      allowedValues: ['ECS', 'BEANSTALK', 'EKS', 'EC2', 'LAMBDA'],
    });

    /*
    const isGithub = new cdk.CfnCondition(this, 'IsGithubCondition', {
      expression: cdk.Fn.conditionEquals('GITHUB', provider.valueAsString),
    });

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
      repositoryName: `${serviceName.valueAsString}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const artfactS3 = new s3.Bucket(this, 'S3BucketsApp', {
      bucketName: `${props.serviceName}-codepipeline-artifact`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
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
        CONTAINER_NAME: { value: serviceName.valueAsString },
        CONTAINER_PORT: { value: containerPort.valueAsNumber },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        BUILD_TYPE: { value: buildType.valueAsString },
        TARGET_TYPE: { value: TARGET_TYPE.valueAsString },
        ARTIFACT_BUCKET: { value: artfactS3.bucketName },
        //AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        //AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });
    ecrRepository.grantPullPush(buildProject.grantPrincipal);

    // GithubSource

    /* const githubAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GITHUB',
      owner: repoOwner.valueAsString,
      repo: repoName.valueAsString,
      branch: repoBranch.valueAsString,
      trigger: codepipeline_actions.GitHubTrigger.NONE,
      oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretId.valueAsString),
      output: sourceOutput,
    }); */

    const sourceAction = this.selectSourceAction(provider.valueAsString,
      repoName.valueAsString, repoBranch.valueAsString, sourceOutput, repoOwner.valueAsString, githubTokenSecretId.valueAsString);

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build_DockerImage_ECR',
      input: sourceOutput,
      outputs: [this.buildOutput],
      project: buildProject,
    });

    // artifactBucket/pipelineName/IMAGE_TAG/Dockerrun.aws.json
    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubSourcePipeline', {
      pipelineName: `${props.serviceName}`,
      artifactBucket: artfactS3,
      /* stages: [
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
      ], */
    });

    const sourceStage = githubPipeline.addStage({ stageName: 'Source' });

    sourceStage.addAction(sourceAction);

    const buildStage = githubPipeline.addStage({ stageName: 'Build' });
    buildStage.addAction(buildAction);

    this.IMAGE_TAG = buildAction.variable('IMAGE_TAG');

    this.pipeline = githubPipeline;

    /*  const cfnGithubPipeline = githubPipeline.node.defaultChild as codepipeline.CfnPipeline;
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

    cfnGitHubWebhook.cfnOptions.condition = isGithub; */
  }

  private selectSourceAction(provider: string, repoName: string, branch: string,
    sourceOutput: codepipeline.Artifact, owner?: string, secretId?: string): codepipeline_actions.Action {

    //const sourceOutput = new codepipeline.Artifact();

    if (provider === 'GITHUB') {
      return new codepipeline_actions.GitHubSourceAction({
        actionName: 'GITHUB',
        owner: owner ?? '',
        repo: repoName,
        branch: branch,
        oauthToken: cdk.SecretValue.secretsManager(secretId ?? ''),
        output: sourceOutput,
      });
    }
    return new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CODECOMMIT',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', repoName),
      branch: branch,
      output: sourceOutput,
    });

  }
}