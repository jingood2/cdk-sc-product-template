//import * as acm from '@aws-cdk/aws-certificatemanager';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { ProductConstruct } from './product-static-site-construct';

export interface ProductStackProps {

}

export class MyProductStack extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductStackProps) {
    super(scope, id);

    console.log(props);

    // define resources here...
    new cdk.CfnParameter(this, 'ResourcePrefix', {
      type: 'String',
      description: 'ResourcePrefix',
      default: 'Ecme',
    });

    const hostedZoneName = new cdk.CfnParameter(this, 'Route53 Hosted Zone Name', {
      type: 'String',
      description: 'Route53 Hosted Zone Name',
      default: 'skcnctf.tk',
    });

    const certificateArn = new cdk.CfnParameter(this, 'ACM Certificate ARN', {
      type: 'String',
      description: 'ACM Certificate ARN',
    });

    const hostedZoneId = new cdk.CfnParameter(this, 'Route53 Hosted Zone Id', {
      type: 'String',
      description: 'Route53 Hosted Zone Id',
      default: 'Z10008191COSSLORKT6ZO',
    });

    const domainName = new cdk.CfnParameter(this, 'Host Domain Name', {
      type: 'String',
      description: 'Host Domain Name',
      default: 'skcnctf.tk',
    });

    const includeWWW = new cdk.CfnParameter(this, 'includeWWW', {
      type: 'String',
      description: 'include WWW true/false',
      allowedValues: ['true', 'false'],
    });

    new ProductConstruct(this, 'static-site', {
      resourcePrefix: 'Ecme',
      certificateArn: certificateArn.valueAsString,
      hostedZoneName: hostedZoneName.valueAsString,
      hostedZoneId: hostedZoneId.valueAsString,
      domainName: domainName.valueAsString,
      includeWWW: includeWWW.valueAsString,
    });

  }
}