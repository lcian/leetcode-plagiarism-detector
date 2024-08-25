import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface InfrastructureStackProps extends cdk.StackProps {}

export class InfrastructureStack extends cdk.Stack {
    readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, "Vpc", {
            maxAzs: 1,
            natGateways: 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: "Public",
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ],
        });
    }
}
