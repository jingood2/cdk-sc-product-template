import * as autoscaling from '@aws-cdk/aws-autoscaling';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codedeploy from '@aws-cdk/aws-codedeploy';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';

export interface IEc2AsgCiCdProps {
  appName: string;
  asgName: string;
}

export class Ec2AsgCiCdConstruct extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: IEc2AsgCiCdProps) {
    super(scope, id );


    const asg = autoscaling.AutoScalingGroup.fromAutoScalingGroupName(this, 'AutoScalingGroup', props.asgName ) ;

    this.createCICDPipeline(props.appName, asg);

  }

  private createCICDPipeline(appName: string, asg: autoscaling.IAutoScalingGroup) {

    const deploymentGroup = this.createCodedeploy(appName, asg);

    const repo = new codecommit.Repository(this, `${appName}-Repository`, {
      repositoryName: `${appName}-repository`,
    });

    const pipeline = new codepipeline.Pipeline(this, `${appName}CodePipeline`, {
      pipelineName: `${appName}-codepipeline`,
    });

    const sourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      repository: repo,
      output: sourceOutput,
    });

    const deployAction = new codepipeline_actions.CodeDeployServerDeployAction({
      actionName: 'CodeDeploy',
      input: sourceOutput,
      deploymentGroup,
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });
  }

  private createCodedeploy(appName: string, asg: autoscaling.IAutoScalingGroup) {
    const application = new codedeploy.ServerApplication(this, 'CodeDeployApplication', {
      applicationName: `${appName}-CodedeployApplication`,
    });

    const deploymentGroup = new codedeploy.ServerDeploymentGroup(this, 'CodeDeployDeploymentGroup', {
      application,
      deploymentGroupName: `${appName}-deploymentgroup`,
      autoScalingGroups: [asg],
      installAgent: true,
    });

    return deploymentGroup;
  }
}