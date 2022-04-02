import * as iam from '@aws-cdk/aws-iam';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { envVars } from './env-vars';
import { ProductAlbStack } from './products/ecs/product-alb-stack';
import { ProductEcsCluster } from './products/ecs/product-ecs-cluster-stack';
import { StackName } from './products/ecs/product-ecs-fargate-stack';
//import { ProductEcsFargateServiceStack } from './products/ecs/product-ecs-fargate-service-stack';
import { StaticSiteCicd } from './products/static-site/product-static-site-cicd-stack';
import { ProductStaticSiteStack } from './products/static-site/product-static-site-stack';

export interface IPortfolioStackProps extends cdk.StackProps {

}

export class PortfolioStack extends cdk.Stack {
  readonly portfolio: servicecatalog.IPortfolio;
  constructor(scope: cdk.Construct, id: string, props: IPortfolioStackProps) {
    super(scope, id, props);

    if (envVars.SC_PORTFOLIO_ARN != '') {
      this.portfolio = servicecatalog.Portfolio.fromPortfolioArn(this, 'MyImportedPortfolio', envVars.SC_PORTFOLIO_ARN);
    } else {
      this.portfolio = new servicecatalog.Portfolio(this, envVars.SC_PORTFOLIO_NAME, {
        displayName: envVars.SC_PORTFOLIO_NAME ?? 'DemoPortfolio',
        providerName: 'Cloud Infra TF',
        description: `Service Catalog: ${envVars.COMPANY_NAME} CDK Reference Architecture`,
        messageLanguage: servicecatalog.MessageLanguage.EN,
      });
      if ( envVars.SC_ACCESS_GROUP_NAME != '') {
        const group = iam.Group.fromGroupName(this, 'SCGroup', 'AdminMasterAccountGroup');
        this.portfolio.giveAccessToGroup(group);
      }
      if ( envVars.SC_ACCESS_ROLE_ARN != '') {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}-Role`, envVars.SC_ACCESS_ROLE_ARN));
      } else {
        this.portfolio.giveAccessToRole(iam.Role.fromRoleArn(this, `${envVars.SC_PORTFOLIO_NAME}AdminRole`, `arn:aws:iam::${process.env.CDK_DEFAULT_ACCOUNT}:role/AssumableAdminRole`));
      }

      const tagOptionsForPortfolio = new servicecatalog.TagOptions(this, 'OrgTagOptions', {
        allowedValuesForTags: {
          stage: ['dev', 'qa', 'staging', 'production'],
        },
      });
      this.portfolio.associateTagOptions(tagOptionsForPortfolio);
    }

    const devEnv = {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    };

    const product = new servicecatalog.CloudFormationProduct(this, 'static-site', {
      productName: 'static-site in s3 distribute with cloudfront',
      owner: 'Product Owner',
      description: 'Static Site With S3 and CloudFront',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new ProductStaticSiteStack(this, 'StaticSiteS3CloudFront', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product);

    const product2 = new servicecatalog.CloudFormationProduct(this, 'static-site-cicd', {
      productName: 'static-site cicd',
      owner: 'Product Owner',
      description: 'Static Site CICD',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new StaticSiteCicd(this, 'staticsitecicd', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product2);

    const product3 = new servicecatalog.CloudFormationProduct(this, 'ecs-cluster-infra', {
      productName: 'ecs-cluster',
      owner: 'Product Owner',
      description: 'ECS Cluster Infra',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new ProductEcsCluster(this, 'EcsCluster', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product3);

    const product4 = new servicecatalog.CloudFormationProduct(this, 'ecs-alb-product', {
      productName: 'alb-product',
      owner: 'Product Owner',
      description: ' application load balancer, for forwarding traffic to containers',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new ProductAlbStack(this, 'EcsAlbProduct', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product4);

    const product5 = new servicecatalog.CloudFormationProduct(this, 'import-vpc', {
      productName: 'import-vpc-test',
      owner: 'Product Owner',
      description: ' application load balancer, for forwarding traffic to containers',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new StackName(this, 'ImportVpcProduct', {
            env: devEnv,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product5);
    /* const product3 = new servicecatalog.CloudFormationProduct(this, 'sagemaker-studio', {
      productName: 'Sagemaker Studio',
      owner: 'Product Owner',
      description: 'Sagemaker Studio Product',
      productVersions: [
        {
          productVersionName: 'v1',
          cloudFormationTemplate: servicecatalog.CloudFormationTemplate.fromProductStack(new SagemakerStack(this, 'sagemakerStudio', {
            env: devEnv,
            vpc: vpc,
          })),
        },
      ],
    });

    this.portfolio.addProduct(product3); */
  }
}