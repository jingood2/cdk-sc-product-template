import { BuildSpec, LinuxBuildImage, PipelineProject } from '@aws-cdk/aws-codebuild';
import { Repository } from '@aws-cdk/aws-codecommit';
import { Artifact, IAction, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, CodeCommitSourceAction, GitHubSourceAction, S3SourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { SnsTopic } from '@aws-cdk/aws-events-targets';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import { Subscription, SubscriptionProtocol, Topic } from '@aws-cdk/aws-sns';
import * as cdk from '@aws-cdk/core';
import { Aws } from '@aws-cdk/core';

export interface CicdConstructProps {
  readonly provider: string;
  readonly distributionId: string;
  readonly bucket: string;
  readonly repo: string;
  readonly repoOwner: string;
  readonly repoBranch: string;
  readonly githubTokenSecretId: string;
  readonly buildAlertEmail: string;

}

/**
 * Infrastructure that creates a CI/CD pipeline to deploy a static site to an S3 bucket.
 * The pipeline checks out the source code from a GitHub repository, builds it, deploys it to the S3 bucket and invalidates the CloudFront distribution.
 */
export class StaticSiteCicdConstruct extends cdk.Construct {

  public readonly sourceAction!: IAction;

  constructor(scope: cdk.Construct, id: string, props: CicdConstructProps) {
    super(scope, id);

    // default value

    const sourceOutput = new Artifact('SourceOutput');

    // Create the source action
    this.sourceAction = new GitHubSourceAction({
      actionName: 'GITHUB',
      owner: props.repoOwner,
      repo: props.repo,
      branch: props.repoBranch,
      oauthToken: cdk.SecretValue.secretsManager(props.githubTokenSecretId),
      output: sourceOutput,
    });

    if (props.provider === 'CODECOMMIT') {
      const repo = new Repository(this, `${props.repo}Repo`, { repositoryName: props.repo });

      this.sourceAction = new CodeCommitSourceAction({
        actionName: 'CODECOMMIT',
        repository: repo,
        branch: props.repoBranch,
        output: sourceOutput,
      });

    } else if (props.provider === 'S3') {
      const repo = s3.Bucket.fromBucketName(this, 'SOURCE-S3', props.repo);

      this.sourceAction = new S3SourceAction({
        actionName: 'S3',
        bucket: repo,
        bucketKey: 'path/to/file.zip',
        output: sourceOutput,
      });
    }

    // Create the build action
    const webBuildProject = this.createBuildProject(
      props.distributionId, props.bucket, props.buildAlertEmail);
    const buildAction = new CodeBuildAction({
      actionName: 'BUILD_DEPLOY',
      project: webBuildProject,
      input: sourceOutput,
    });

    // Create the pipeline
    new Pipeline(this, 'static-site-pipeline', {
      pipelineName: 'static-site-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [this.sourceAction],
        },
        {
          stageName: 'Build',
          actions: [buildAction],
        },
      ],
    });
  }

  private createBuildProject(distributionId: string, staticWebsiteBucket: string, buildAlertEmail: string) {
    const buildProject = new PipelineProject(this, 'build', {
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 'latest',
            },
            'commands': [
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
            ],
          },
          post_build: {
            commands: [
              `aws s3 sync "dist" "s3://${staticWebsiteBucket}" --delete`,
              `aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`,

              // ecs cli
              // eks cli
              // ec2
            ],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
      },
    });

    const codeBuildS3ListObjectsPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket', 's3:PutObject', 's3:DeleteObject', 's3:PutObjectAcl'],
      resources: [`arn:aws:s3:::${staticWebsiteBucket}`, `arn:aws:s3:::${staticWebsiteBucket}/*`],
    });
    buildProject.role?.addToPrincipalPolicy(codeBuildS3ListObjectsPolicy);

    const codeBuildCreateInvalidationPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cloudfront:CreateInvalidation'],
      resources: [`arn:aws:cloudfront::${Aws.ACCOUNT_ID}:distribution/${distributionId}`],
    });
    buildProject.role?.addToPrincipalPolicy(codeBuildCreateInvalidationPolicy);

    // Add alert notifications on build failure
    const alertsTopic = new Topic(this, 'notifications', {
      topicName: `${staticWebsiteBucket}-notifications`,
      displayName: `${staticWebsiteBucket} pipeline failures`,
    });

    // Subscribe to these alerts using email
    new Subscription(this, 'notifications-subscription', {
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: buildAlertEmail,
      topic: alertsTopic,
    });

    buildProject.onBuildFailed('build-failed', { target: new SnsTopic(alertsTopic) });

    return buildProject;
  }

}