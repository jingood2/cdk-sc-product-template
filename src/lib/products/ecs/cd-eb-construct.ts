import * as fs from 'fs';
import * as path from 'path';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import * as yaml from 'yaml';
//import * as ecs from '@aws-cdk/aws-ecs';


export interface CDConstructProps {
  pipeline: codepipeline.Pipeline;
  serviceName: string;
  targetEnv: string;
  targetType: string;
  imageTag: string;
  buildOutput: codepipeline.Artifact;
}

export class CDEBConstruct extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: CDConstructProps) {
    super(scope, id);

    const imageTag = new cdk.CfnParameter(this, 'DockerImageTag', {
      type: 'String',
      description: 'deploy Docker ImageTag',
      default: 'latest',
    });

    /*
    const containerPort = new cdk.CfnParameter(this, 'ContainerPort', {
      type: 'Number',
      description: 'Container Port',
      default: '8080',
    }); */

    const approveStage = props.pipeline.addStage({ stageName: 'Approve' });
    const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
      actionName: 'Approve',
    });
    approveStage.addAction(manualApprovalAction);

    /* const role = iam.Role.fromRoleArn(this, 'Admin', Arn.format({ service: 'iam', resource: 'role', resourceName: 'Admin' }, this));
    manualApprovalAction.grantManualApproval(role); */

    const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './deploy-buildspec.yml'), 'utf8'));
    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        //REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        CONTAINER_NAME: { value: props.serviceName },
        //CONTAINER_PORT: { value: CONTAINER_PORT.valueAsNumber },
        DEPLOY_ENV_NAME: { value: props.targetEnv },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        ARTIFACT_BUCKET: { value: `${props.serviceName}-codepipeline-artifact` },
        IMAGE_TAG: { value: imageTag.valueAsString },
        //S3_KEY: { value: objKey },
        //TARGET_TYPE: { value: TARGET_TYPE.valueAsString },
        TARGET_TYPE: { value: props.targetType },
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
    }));

    const deployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      input: props.buildOutput,
      project: deployProject,
    });

    const deployStage = props.pipeline.addStage( { stageName: 'Deploy' });
    deployStage.addAction(deployAction);


    /*  const deployBuildSpec = yaml.parse(fs.readFileSync(path.join(__dirname, './deploy-buildspec.yml'), 'utf8'));
    const deployProject = new codebuild.PipelineProject(this, 'CodeBuildDeployPloject', {
      buildSpec: codebuild.BuildSpec.fromObject(deployBuildSpec),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      environmentVariables: {
        REPOSITORY_URI: { value: ecrRepository.repositoryUri },
        CONTAINER_NAME: { value: CONTAINER_NAME.valueAsString },
        CONTAINER_PORT: { value: CONTAINER_PORT.valueAsNumber },
        DEPLOY_ENV_NAME: { value: DEPLOY_ENV_NAME.valueAsString },
        AWS_DEFAULT_REGION: { value: cdk.Stack.of(this).region },
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        TARGET_TYPE: { value: props.targetType },
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
    }));

    if ( props.targetType === 'ECS') {
      props.pipeline.addStage({
        stageName: 'DeployameOnECS',
        actions: [
          new codepipeline_actions.EcsDeployAction({
            actionName: 'DeployAction',
            service: props.service ?? this.service,
            // if your file is called imagedefinitions.json,
            // use the `input` property,
            // and leave out the `imageFile` property
            input: props.buildOutput,
            // if your file name is _not_ imagedefinitions.json,
            // use the `imageFile` property,
            // and leave out the `input` property
            imageFile: buildOutput.atPath('imageDef.json'),
            deploymentTimeout: Duration.minutes(60), // optional, default is 60 minutes
          }),
        ],

      });
    } */
  }
  /* private selectDeployAction(targetType: string, repoName: string, branch: string,
    sourceOutput: codepipeline.Artifact, owner?: string, secretId?: string): codepipeline_actions.Action {

    //const sourceOutput = new codepipeline.Artifact();

    if (provider === 'ECS') {
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
      actionName: 'BEANSTALK',
      repository: codecommit.Repository.fromRepositoryName(this, 'GitRepository', repoName),
      branch: branch,
      output: sourceOutput,
    });

  } */
}