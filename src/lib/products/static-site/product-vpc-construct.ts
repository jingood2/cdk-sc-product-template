import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';

export interface IStaticSiteStackProps extends cdk.StackProps {
  readonly cidr: string;
  //readonly siteSourcePath: string;
}

export class VpcConstruct extends cdk.Construct {
  public readonly vpc: ec2.Vpc;
  constructor(scope: cdk.Construct, id: string, props: IStaticSiteStackProps) {
    super(scope, id );

    this.vpc = new ec2.Vpc(this, 'nested-stack-vpc', {
      cidr: props.cidr,
      natGateways: 0,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    // Deploy site contents to S3 bucket
    /* new s3deploy.BucketDeployment(this, identifyResource(props.resourcePrefix, 'bucket-deployment'), {
      sources: [s3deploy.Source.asset(path.join(__dirname, '.', '../dist'))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    }); */
  }
}