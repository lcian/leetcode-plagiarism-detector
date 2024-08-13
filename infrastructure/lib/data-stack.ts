import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";

export interface DataStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: DataStackProps) {
        super(scope, id, props);

        const processedContestSlugsTable = new dynamodb.TableV2(
            this,
            "ProcessedContestSlugsTable",
            {
                tableName: "ProcessedContestSlugs",
                partitionKey: {
                    name: "ContestSlug",
                    type: dynamodb.AttributeType.STRING,
                },
                billing: dynamodb.Billing.provisioned({
                    readCapacity: dynamodb.Capacity.autoscaled({
                        maxCapacity: 1,
                    }),
                    writeCapacity: dynamodb.Capacity.autoscaled({
                        maxCapacity: 1,
                    }),
                }),
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            },
        );

        const latestContestCheckerLambda = new PythonFunction(
            this,
            "LatestContestCheckerLambda",
            {
                vpc: props.vpc,
                vpcSubnets: props.vpc.selectSubnets({
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }),
                securityGroups: [props.securityGroup],
                runtime: lambda.Runtime.PYTHON_3_10,
                entry: "../data/latest_contest_checker/",
                index: "check_and_update.py",
                handler: "handler",
                environment: {
                    PROCESSED_CONTEST_SLUGS_TABLE_NAME:
                        processedContestSlugsTable.tableName,
                },
            },
        );
        processedContestSlugsTable.grantReadWriteData(
            latestContestCheckerLambda,
        );
    }
}
