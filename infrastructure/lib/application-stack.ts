import { Construct } from "constructs";
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { QueueProcessingFargateService } from "./constructs/queue-processing-fargate-service";

export interface ApplicationStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}

export class ApplicationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApplicationStackProps) {
        super(scope, id, props);

        const apiUrl = this.node.getContext("api-url");

        // =============================================================================================================
        // BASE
        // =============================================================================================================

        const ecsCluster = new ecs.Cluster(this, "Cluster", {
            vpc: props.vpc,
        });

        const oxylabsCredentials = ssm.StringParameter.fromSecureStringParameterAttributes(this, "OxylabsCredentials", {
            parameterName: "/leetcode-plagiarism-detector/oxylabs-credentials",
        });
        const apiKey = ssm.StringParameter.fromSecureStringParameterAttributes(this, "APIKey", {
            parameterName: "/leetcode-plagiarism-detector/api-key",
        });

        const processingTopic = new sns.Topic(this, "ProcessingTopic");

        // =============================================================================================================
        // SCRAPING
        // =============================================================================================================

        const dataContainerImage = ecs.ContainerImage.fromAsset("../data/");

        const questionScraper = new ecsPatterns.QueueProcessingFargateService(this, "QuestionScraperService", {
            cluster: ecsCluster,
            taskSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
            assignPublicIp: true,
            memoryLimitMiB: 1024,
            cpu: 512,
            image: dataContainerImage,
            environment: {
                TASK: "scraping/questions",
                API_URL: apiUrl,
                LOG_LEVEL: "DEBUG",
            },
            secrets: {
                API_KEY: ecs.Secret.fromSsmParameter(apiKey),
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
        });
        processingTopic.addSubscription(new snsSubscriptions.SqsSubscription(questionScraper.sqsQueue));

        const submissionScraper = new QueueProcessingFargateService(this, "SubmissionScraperService", {
            cluster: ecsCluster,
            taskSubnets: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
            assignPublicIp: true,
            memoryLimitMiB: 1024,
            cpu: 512,
            image: dataContainerImage,
            environment: {
                TASK: "scraping/submissions",
                API_URL: apiUrl,
                LOG_LEVEL: "DEBUG",
                QUESTIONS_QUEUE_NAME: questionScraper.sqsQueue.queueName,
            },
            secrets: {
                OXYLABS_CREDENTIALS: ecs.Secret.fromSsmParameter(oxylabsCredentials),
                API_KEY: ecs.Secret.fromSsmParameter(apiKey),
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
        questionScraper.sqsQueue.grantSendMessages(submissionScraper.taskDefinition.taskRole);

        // =============================================================================================================
        // CHECKING
        // =============================================================================================================

        const processedContestsTable = new dynamodb.TableV2(this, "ProcessedContestsTable", {
            tableName: "ProcessedContests",
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
        });

        const contestCheckerLambda = new lambda.DockerImageFunction(this, "ContestCheckerLambda", {
            code: lambda.DockerImageCode.fromImageAsset("../data/"),
            environment: {
                TASK: "scraping/contest",
                LOG_LEVEL: "DEBUG",
                OXYLABS_CREDENTIALS_PARAMETER_ARN: oxylabsCredentials.parameterArn,
                PROCESSED_CONTEST_SLUGS_TABLE_NAME: processedContestsTable.tableName,
                UNPROCESSED_CONTESTS_TOPIC_ARN: processingTopic.topicArn,
            },
            timeout: cdk.Duration.seconds(30),
        });
        oxylabsCredentials.grantRead(contestCheckerLambda);
        processedContestsTable.grantReadWriteData(contestCheckerLambda);
        processingTopic.grantPublish(contestCheckerLambda);

        new events.Rule(this, "ContestCheckerLambdaHourlyExecutionRule", {
            targets: [new eventsTargets.LambdaFunction(contestCheckerLambda)],
            schedule: events.Schedule.cron({ minute: "0" }),
        });

        // =============================================================================================================
        // PROCESSING
        // =============================================================================================================

        const taskEntrypoints = {
            copydetect: "processing/copydetect",
        };
        for (const [taskName, taskPath] of Object.entries(taskEntrypoints)) {
            const processingService = new ecsPatterns.QueueProcessingFargateService(
                this,
                `ProcessingService-${taskName}`,
                {
                    cluster: ecsCluster,
                    assignPublicIp: true,
                    memoryLimitMiB: 1024,
                    cpu: 512,
                    image: dataContainerImage,
                    environment: {
                        TASK: taskPath,
                        LOG_LEVEL: "DEBUG",
                        API_URL: apiUrl,
                    },
                    secrets: {
                        API_KEY: ecs.Secret.fromSsmParameter(apiKey),
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
            processingTopic.addSubscription(new snsSubscriptions.SqsSubscription(processingService.sqsQueue));
        }
    }
}
