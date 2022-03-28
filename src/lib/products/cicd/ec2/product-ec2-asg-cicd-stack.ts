//import * as servicecatalog from '@aws-cdk/aws-servicecatalog';
import * as cdk from '@aws-cdk/core';
import { Ec2AsgCiCdConstruct } from './product-ec2-asg-cicd-construct';

export interface Ec2AsgCiCdStackProps extends cdk.StackProps {

}

export class Ec2AsgCiCdStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Ec2AsgCiCdStackProps) {
    super(scope, id);

    console.log(props);

    /* const appName = new cdk.CfnParameter(this, 'AppName', {
      type: 'String',
      description: 'Autoscaling Application Name',
      default: 'demoApp',
    });

    const asgName = new cdk.CfnParameter(this, 'AsgName', {
      type: 'String',
      description: 'Autoscaling Group Name',
      default: 'SC-037729278610-pp-7we7d63ljkgu6-AlbEc2AsgAutoScalingGroupASGC66DBBE8-EVVY1W4TC8SJ',
    }); */

    new Ec2AsgCiCdConstruct(this, 'Ec2Asg', {
      //appName: appName.valueAsString,
      //asgName: asgName.valueAsString,
      appName: 'mydemoapp',
      asgName: 'SC-037729278610-pp-7we7d63ljkgu6-AlbEc2AsgAutoScalingGroupASGC66DBBE8-EVVY1W4TC8SJ',
    });

  }
}