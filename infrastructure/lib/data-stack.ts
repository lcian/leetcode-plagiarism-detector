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
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";

import { QueueProcessingFargateService } from "./constructs/queue-processing-fargate-service";

export interface DataStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
}

export class DataStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: DataStackProps) {
        super(scope, id, props);

        const isProd = this.node.tryGetContext("prod") ?? false;

        // =============================================================================================================
        // BASE
        // =============================================================================================================

        const ecsCluster = new ecs.Cluster(this, "Cluster", {
            vpc: props.vpc,
        });
        ecsCluster.connections.addSecurityGroup(props.securityGroup);

        const processingTopic = new sns.Topic(this, "ProcessingTopic");

        const oxylabsCredentials = ssm.StringParameter.fromSecureStringParameterAttributes(this, "OxylabsCredentials", {
            parameterName: "/leetcode-cheater-detector/oxylabs-credentials",
        });
        const dbConnectionString = ssm.StringParameter.fromSecureStringParameterAttributes(this, "DbConnectionString", {
            parameterName: "/leetcode-cheater-detector/db-connection-string",
        });

        // =============================================================================================================
        // SCRAPING
        // =============================================================================================================

        const contestQuestionsScraper = new ecsPatterns.QueueProcessingFargateService(
            this,
            "ContestQuestionsScraperService",
            {
                cluster: ecsCluster,
                taskSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
                assignPublicIp: true,
                memoryLimitMiB: 1024,
                cpu: 512,
                image: ecs.ContainerImage.fromAsset("../data/scraping/contest_questions_scraper/"),
                environment: {
                    LOG_LEVEL: "DEBUG",
                },
                secrets: {
                    DB_CONNECTION_STRING: ecs.Secret.fromSsmParameter(dbConnectionString),
                },
                scalingSteps: [
                    { upper: 0, change: -1 },
                    { lower: 1, change: +1 },
                ],
                minScalingCapacity: 0,
                maxScalingCapacity: 1,
                capacityProviderStrategies: [{ capacityProvider: "FARGATE_SPOT", weight: 1 }],
                visibilityTimeout: cdk.Duration.hours(8),
                maxReceiveCount: 9,
            },
        );
        contestQuestionsScraper.service.connections.allowFrom(
            ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
            ec2.Port.allTraffic(),
        );
        processingTopic.addSubscription(new snsSubscriptions.SqsSubscription(contestQuestionsScraper.sqsQueue));

        const contestSubmissionsScraper = new QueueProcessingFargateService(this, "ContestSubmissionsScraperService", {
            cluster: ecsCluster,
            taskSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
            assignPublicIp: true,
            memoryLimitMiB: 1024,
            cpu: 512,
            image: ecs.ContainerImage.fromAsset("../data/scraping/contest_submissions_scraper/"),
            environment: {
                QUESTIONS_QUEUE_NAME: contestQuestionsScraper.sqsQueue.queueName,
                LOG_LEVEL: "DEBUG",
            },
            secrets: {
                OXYLABS_CREDENTIALS: ecs.Secret.fromSsmParameter(oxylabsCredentials),
                DB_CONNECTION_STRING: ecs.Secret.fromSsmParameter(dbConnectionString),
            },
            minScalingCapacity: 0,
            maxScalingCapacity: 1,
            scalingSteps: [
                { upper: 0, change: -1 },
                { lower: 1, change: +1 },
            ],
            disableCpuBasedScaling: true,
            capacityProviderStrategies: [{ capacityProvider: "FARGATE_SPOT", weight: 1 }],
            visibilityTimeout: cdk.Duration.hours(1),
            maxReceiveCount: 10,
        });
        contestQuestionsScraper.sqsQueue.grantSendMessages(contestSubmissionsScraper.taskDefinition.taskRole);

        contestSubmissionsScraper.service.connections.allowFrom(
            ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
            ec2.Port.allTraffic(),
        );

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
            entry: "../data/scraping/latest_contest_checker/",
            index: "check_and_update.py",
            handler: "handler",
            environment: {
                PROCESSED_CONTEST_SLUGS_TABLE_NAME: processedContestSlugsTable.tableName,
                UNPROCESSED_CONTESTS_TOPIC_ARN: processingTopic.topicArn,
                LOG_LEVEL: "DEBUG",
            },
            timeout: cdk.Duration.seconds(30),
        });
        processedContestSlugsTable.grantReadWriteData(latestContestCheckerLambda);
        processingTopic.grantPublish(latestContestCheckerLambda);

        new events.Rule(this, "LatestContestCheckerLambdaHourlyExecutionRule", {
            targets: [new eventsTargets.LambdaFunction(latestContestCheckerLambda)],
            schedule: events.Schedule.cron({ minute: "0" }),
        });

        // =============================================================================================================
        // PROCESSING
        // =============================================================================================================

        const processingTasks = {
            copydetect: "../data/processing/copydetect/",
        };
        for (const [taskName, taskPath] of Object.entries(processingTasks)) {
            const processingService = new ecsPatterns.QueueProcessingFargateService(
                this,
                `ProcessingService-${taskName}`,
                {
                    cluster: ecsCluster,
                    taskSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
                    assignPublicIp: true,
                    memoryLimitMiB: 1024,
                    cpu: 512,
                    image: ecs.ContainerImage.fromAsset(taskPath),
                    environment: {
                        LOG_LEVEL: "DEBUG",
                    },
                    secrets: {
                        DB_CONNECTION_STRING: ecs.Secret.fromSsmParameter(dbConnectionString),
                    },
                    scalingSteps: [
                        { upper: 0, change: -1 },
                        { lower: 1, change: +1 },
                    ],
                    minScalingCapacity: 0,
                    maxScalingCapacity: 1,
                    capacityProviderStrategies: [{ capacityProvider: "FARGATE_SPOT", weight: 1 }],
                    visibilityTimeout: cdk.Duration.minutes(30),
                    maxReceiveCount: 3,
                },
            );
            processingService.service.connections.allowFrom(
                ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
                ec2.Port.allTraffic(),
            );
            processingTopic.addSubscription(new snsSubscriptions.SqsSubscription(processingService.sqsQueue));
        }
    }
}
