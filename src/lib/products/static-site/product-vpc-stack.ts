//import * as acm from '@aws-cdk/aws-certificatemanager';
import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as ssm from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';
import { VpcConstruct } from './product-vpc-construct';

export interface ProductStackProps {

}

export class MyVpcStack extends servicecatalog.ProductStack {
  constructor(scope: cdk.Construct, id: string, props: ProductStackProps) {
    super(scope, id);

    console.log(props);

    // define resources here...
    const cidr = new cdk.CfnParameter(this, 'Cidr', {
      type: 'String',
      description: 'VPC CIDR',
      default: '10.0.0.0/16',
    });

    new ssm.StringParameter(this, 'alerts-email-param', {
      parameterName: '/dev/vpc/cidr',
      stringValue: cidr.valueAsString,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.STANDARD,
    });

    new VpcConstruct(this, 'MyVpcConstruct', {
      cidr: ssm.StringParameter.fromStringParameterName(this, 'imported-dev-vpc-cidr', '/dev/vpc/cidr').stringValue,
    });

  }
}