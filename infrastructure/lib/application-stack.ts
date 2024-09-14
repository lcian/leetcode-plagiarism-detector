import { Construct } from "constructs";
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as stepFunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepFunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";

export interface ApplicationStackProps extends cdk.StackProps {
    vpc: ec2.Vpc;
}

export class ApplicationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApplicationStackProps) {
        super(scope, id, props);

        const apiBaseUrl = this.node.getContext("api-base-url");
        const logLevel = this.node.tryGetContext("log-level") ?? "DEBUG";

        // =============================================================================================================
        // COMMON
        // =============================================================================================================

        const oxylabsCredentials = ssm.StringParameter.fromSecureStringParameterAttributes(this, "OxylabsCredentials", {
            parameterName: "/leetcode-plagiarism-detector/oxylabs-credentials",
        });

        const apiKey = ssm.StringParameter.fromSecureStringParameterAttributes(this, "APIKey", {
            parameterName: "/leetcode-plagiarism-detector/api-key",
        });

        const ecsCluster = new ecs.Cluster(this, "Cluster", {
            vpc: props.vpc,
        });

        const dataContainerImage = ecs.ContainerImage.fromAsset("../data/");

        // =============================================================================================================
        // TRIGGER
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
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const contestCheckerTask = new ecs.FargateTaskDefinition(this, "ContestCheckerTaskDefinition", {
            memoryLimitMiB: 1024,
            cpu: 512,
        });
        contestCheckerTask.addContainer("ContestCheckerContainer", {
            image: dataContainerImage,
            environment: {
                TASK: "scraping/contest",
                LOG_LEVEL: logLevel,
                PROCESSED_CONTEST_SLUGS_TABLE_NAME: processedContestsTable.tableName,
            },
            secrets: {
                OXYLABS_CREDENTIALS: ecs.Secret.fromSsmParameter(oxylabsCredentials),
            },
            logging: new ecs.AwsLogDriver({
                streamPrefix: "ContestChecker",
                logRetention: RetentionDays.ONE_WEEK,
            }),
        });
        processedContestsTable.grantReadWriteData(contestCheckerTask.taskRole);

        const checkContests = new stepFunctionsTasks.EcsRunTask(this, "CheckContestsTask", {
            cluster: ecsCluster,
            subnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            stateName: "Check if there are new contests to process",
            taskDefinition: contestCheckerTask,
            launchTarget: new stepFunctionsTasks.EcsFargateLaunchTarget(),
            integrationPattern: stepFunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            containerOverrides: [
                {
                    containerDefinition: contestCheckerTask.defaultContainer!,
                    environment: [
                        {
                            name: "TASK_TOKEN",
                            value: stepFunctions.JsonPath.taskToken,
                        },
                    ],
                },
            ],
        });
        checkContests.addRetry({ errors: ["States.ALL"], interval: cdk.Duration.minutes(30), maxAttempts: 10 });

        // =============================================================================================================
        // SCRAPING -- SUBMISSIONS
        // =============================================================================================================

        const submissionScraperTask = new ecs.FargateTaskDefinition(this, "SubmissionScraperTaskDefinition", {
            memoryLimitMiB: 1024,
            cpu: 512,
        });
        submissionScraperTask.addContainer("SubmissionScraperContainer", {
            image: dataContainerImage,
            environment: {
                TASK: "scraping/submissions",
                API_BASE_URL: apiBaseUrl,
                LOG_LEVEL: logLevel,
            },
            secrets: {
                OXYLABS_CREDENTIALS: ecs.Secret.fromSsmParameter(oxylabsCredentials),
                API_KEY: ecs.Secret.fromSsmParameter(apiKey),
            },
            logging: new ecs.AwsLogDriver({
                streamPrefix: "SubmissionScraper",
                logRetention: RetentionDays.ONE_WEEK,
            }),
        });

        const scrapeSubmissions = new stepFunctionsTasks.EcsRunTask(this, "SubmissionScraperTask", {
            cluster: ecsCluster,
            subnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            stateName: "Scrape part of questions data and submissions from LeetCode",
            taskDefinition: submissionScraperTask,
            launchTarget: new stepFunctionsTasks.EcsFargateLaunchTarget(),
            integrationPattern: stepFunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            taskTimeout: { seconds: cdk.Duration.hours(2).toSeconds() },
            heartbeatTimeout: { seconds: cdk.Duration.minutes(5).toSeconds() },
            containerOverrides: [
                {
                    containerDefinition: submissionScraperTask.defaultContainer!,
                    environment: [
                        {
                            name: "CONTEST_SLUG",
                            value: stepFunctions.JsonPath.stringAt("$.contest-slug"),
                        },
                        {
                            name: "TASK_TOKEN",
                            value: stepFunctions.JsonPath.taskToken,
                        },
                    ],
                },
            ],
        });
        scrapeSubmissions.addRetry({ errors: ["States.ALL"], interval: cdk.Duration.hours(1), maxAttempts: 4 });

        // =============================================================================================================
        // SCRAPING -- QUESTIONS
        // =============================================================================================================

        const questionScraperTask = new ecs.FargateTaskDefinition(this, "QuestionScraperTaskDefinition", {
            memoryLimitMiB: 1024,
            cpu: 512,
        });
        questionScraperTask.addContainer("QuestionScraperContainer", {
            image: dataContainerImage,
            environment: {
                TASK: "scraping/questions",
                API_BASE_URL: apiBaseUrl,
                LOG_LEVEL: logLevel,
            },
            secrets: {
                API_KEY: ecs.Secret.fromSsmParameter(apiKey),
            },
            logging: new ecs.AwsLogDriver({
                streamPrefix: "QuestionScraper",
                logRetention: RetentionDays.ONE_WEEK,
            }),
        });

        const scrapeQuestions = new stepFunctionsTasks.EcsRunTask(this, "QuestionScraperTask", {
            cluster: ecsCluster,
            stateName: "Scrape missing question data (number and description) from GitHub",
            taskDefinition: questionScraperTask,
            subnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            launchTarget: new stepFunctionsTasks.EcsFargateLaunchTarget(),
            integrationPattern: stepFunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            taskTimeout: { seconds: cdk.Duration.minutes(10).toSeconds() },
            heartbeatTimeout: { seconds: cdk.Duration.minutes(5).toSeconds() },
            containerOverrides: [
                {
                    containerDefinition: questionScraperTask.defaultContainer!,
                    environment: [
                        {
                            name: "CONTEST_SLUG",
                            value: stepFunctions.JsonPath.stringAt("$.contest-slug"),
                        },
                        {
                            name: "QUESTION_NAMES",
                            value: stepFunctions.JsonPath.stringAt("$.question-names"),
                        },
                        {
                            name: "TASK_TOKEN",
                            value: stepFunctions.JsonPath.taskToken,
                        },
                    ],
                },
            ],
        });
        scrapeQuestions.addRetry({ errors: ["States.ALL"], interval: cdk.Duration.hours(12), maxAttempts: 8 });

        // =============================================================================================================
        // PROCESSING
        // =============================================================================================================

        const submissionProcessorTask = new ecs.FargateTaskDefinition(this, "SubmissionProcessorTaskDefinition", {
            memoryLimitMiB: 4096,
            cpu: 1024,
        });
        submissionProcessorTask.addContainer("SubmissionProcessorTaskDefinition", {
            image: dataContainerImage,
            environment: {
                TASK: "processing/copydetect",
                API_BASE_URL: apiBaseUrl,
                LOG_LEVEL: logLevel,
            },
            secrets: {
                API_KEY: ecs.Secret.fromSsmParameter(apiKey),
            },
            logging: new ecs.AwsLogDriver({
                streamPrefix: "SubmissionProcessor",
                logRetention: RetentionDays.ONE_WEEK,
            }),
        });

        const processSubmissions = new stepFunctionsTasks.EcsRunTask(this, "SubmissionProcessor", {
            cluster: ecsCluster,
            subnets: { subnetType: ec2.SubnetType.PUBLIC },
            assignPublicIp: true,
            stateName: "Process submissions and identify plagiarism with copydetect",
            taskDefinition: submissionProcessorTask,
            launchTarget: new stepFunctionsTasks.EcsFargateLaunchTarget(),
            integrationPattern: stepFunctions.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            taskTimeout: { seconds: cdk.Duration.hours(2).toSeconds() },
            heartbeatTimeout: { seconds: cdk.Duration.minutes(5).toSeconds() },
            containerOverrides: [
                {
                    containerDefinition: submissionProcessorTask.defaultContainer!,
                    environment: [
                        {
                            name: "CONTEST_SLUG",
                            value: stepFunctions.JsonPath.stringAt("$.contest-slug"),
                        },
                        {
                            name: "TASK_TOKEN",
                            value: stepFunctions.JsonPath.taskToken,
                        },
                    ],
                },
            ],
        });

        // =============================================================================================================
        // STATE MACHINE
        // =============================================================================================================

        const stateMachine = new stepFunctions.StateMachine(this, "StateMachine", {
            definition: new stepFunctions.Choice(this, "ProcessOrCheck", {
                stateName: "Process the provided contest or check for any new ones",
            })
                .when(stepFunctions.Condition.not(stepFunctions.Condition.isPresent("$.contest-slug")), checkContests) // Manual trigger to process old contests
                .otherwise(
                    new stepFunctions.Pass(this, "ProcessContest", {
                        stateName: "Process the provided contest directly",
                    }),
                )
                .afterwards()
                .next(
                    new stepFunctions.Choice(this, "Continue on contest", {
                        stateName: "Continue processing if a contest is found",
                    })
                        .when(
                            stepFunctions.Condition.isPresent("$.contest-slug"),
                            scrapeSubmissions.next(scrapeQuestions).next(processSubmissions),
                        )
                        .otherwise(
                            new stepFunctions.Succeed(this, "NoNewContests", {
                                stateName: "No contest to process",
                            }),
                        ),
                ),
            tracingEnabled: true,
        });
        stateMachine.grantTaskResponse(contestCheckerTask.taskRole);
        stateMachine.grantTaskResponse(submissionScraperTask.taskRole);
        stateMachine.grantTaskResponse(questionScraperTask.taskRole);
        stateMachine.grantTaskResponse(submissionProcessorTask.taskRole);

        const cronSchedule = new events.Rule(this, "CronSchedule", {
            schedule: events.Schedule.cron({ minute: "0", hour: "*/1" }),
            targets: [new eventsTargets.SfnStateMachine(stateMachine)],
        });
    }
}
