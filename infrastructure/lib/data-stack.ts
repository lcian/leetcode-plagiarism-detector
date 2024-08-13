import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";

import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";

export interface DataStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: DataStackProps) {
        super(scope, id, props);

        const isProd = this.node.tryGetContext("prod") ?? false;

        const contestSubmissionsBucket = new s3.Bucket(this, "ContestSubmissionsBucket", {
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });

        const contestSubmissionsScraper = new ecsPatterns.QueueProcessingFargateService(
            this,
            "QueueProcessingFargateService",
            {
                memoryLimitMiB: 512,
                cpu: 256,
                image: ecs.ContainerImage.fromAsset("../data/contest_submissions_scraper/"),
                environment: {
                    CONTEST_SUBMISSIONS_BUCKET_NAME: contestSubmissionsBucket.bucketName,
                },
                scalingSteps: [
                    { upper: 0, change: -1 },
                    { lower: 1, change: +1 },
                ],
                maxScalingCapacity: 1,
                minScalingCapacity: 0,
                capacityProviderStrategies: [{ capacityProvider: "FARGATE_SPOT", weight: 1 }],
            },
        );
        contestSubmissionsBucket.grantReadWrite(contestSubmissionsScraper.taskDefinition.taskRole);

        const processedContestSlugsTable = new dynamodb.TableV2(this, "ProcessedContestSlugsTable", {
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
            removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });

        const latestContestCheckerLambdaRole = new iam.Role(this, "LatestContestCheckerLambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        });
        latestContestCheckerLambdaRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        );
        latestContestCheckerLambdaRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaENIManagementAccess"),
        );
        const latestContestCheckerLambda = new PythonFunction(this, "LatestContestCheckerLambda", {
            vpc: props.vpc,
            vpcSubnets: props.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            }),
            securityGroups: [props.securityGroup],
            role: latestContestCheckerLambdaRole,
            runtime: lambda.Runtime.PYTHON_3_10,
            entry: "../data/latest_contest_checker/",
            index: "check_and_update.py",
            handler: "handler",
            environment: {
                PROCESSED_CONTEST_SLUGS_TABLE_NAME: processedContestSlugsTable.tableName,
                UNPROCESSED_CONTESTS_QUEUE: contestSubmissionsScraper.sqsQueue.queueUrl,
            },
            timeout: cdk.Duration.seconds(30),
        });
        processedContestSlugsTable.grantReadWriteData(latestContestCheckerLambda);
        contestSubmissionsScraper.sqsQueue.grantSendMessages(latestContestCheckerLambdaRole);

        new events.Rule(this, "LatestContestCheckerLambdaHourlyExecutionRule", {
            targets: [new eventsTargets.LambdaFunction(latestContestCheckerLambda)],
            schedule: events.Schedule.cron({ minute: "0" }),
        });
    }
}
