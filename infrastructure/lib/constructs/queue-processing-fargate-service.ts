/**
 * Rewrite of ecsPatters.QueueProcessingFargateService to use the total number of messages in the queue (visible + in flight) as the metric for scaling.
 */
import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";

export interface QueueProcessingFargateServiceProps
    extends ecsPatterns.QueueProcessingServiceBaseProps,
        ecsPatterns.FargateServiceBaseProps {
    /**
     * Optional name for the container added.
     * This name is not used when `taskDefinition` is provided.
     *
     * @default - QueueProcessingContainer
     */
    readonly containerName?: string;

    /**
     * The health check command and associated configuration parameters for the container.
     *
     * @default - Health check configuration from container.
     */
    readonly healthCheck?: ecs.HealthCheck;

    /**
     * The subnets to associate with the service.
     *
     * @default - Public subnets if `assignPublicIp` is set, otherwise the first available one of Private, Isolated, Public, in that order.
     */
    readonly taskSubnets?: ec2.SubnetSelection;

    /**
     * The security groups to associate with the service. If you do not specify a security group, a new security group is created.
     *
     * @default - A new security group is created.
     */
    readonly securityGroups?: ec2.ISecurityGroup[];

    /**
     * Specifies whether the task's elastic network interface receives a public IP address.
     *
     * If true, each task will receive a public IP address.
     *
     * @default false
     */
    readonly assignPublicIp?: boolean;

    /**
     * Grace period after scaling activity.
     *
     * Subsequent scale outs during the cooldown period are squashed so that only
     * the biggest scale out happens.
     *
     * Subsequent scale ins during the cooldown period are ignored.
     *
     * @see https://docs.aws.amazon.com/autoscaling/application/APIReference/API_StepScalingPolicyConfiguration.html
     * @default No cooldown period
     */
    readonly scalingCooldown?: cdk.Duration;
}

/**
 * Class to create a queue processing Fargate service
 */
export class QueueProcessingFargateService extends ecsPatterns.QueueProcessingServiceBase {
    /**
     * The Fargate service in this construct.
     */
    public readonly service: ecs.FargateService;
    /**
     * The Fargate task definition in this construct.
     */
    public readonly taskDefinition: ecs.FargateTaskDefinition;
    private readonly scalingCooldown?: cdk.Duration;

    override configureAutoscalingForService(service: ecs.BaseService) {
        const scalingTarget = service.autoScaleTaskCount({
            maxCapacity: this.maxCapacity,
            minCapacity: this.minCapacity,
        });
        const totalMessagesMetric = new cloudwatch.MathExpression({
            expression: "m1 + m2",
            usingMetrics: {
                m1: this.sqsQueue.metricApproximateNumberOfMessagesVisible().with({
                    statistic: "sum",
                    period: cdk.Duration.minutes(1),
                }),
                m2: this.sqsQueue.metricApproximateNumberOfMessagesNotVisible().with({
                    statistic: "sum",
                    period: cdk.Duration.minutes(1),
                }),
            },
            period: cdk.Duration.minutes(1),
        });
        scalingTarget.scaleOnMetric("QueueMessagesVisibleScaling", {
            metric: totalMessagesMetric,
            scalingSteps: this.scalingSteps,
            cooldown: this.scalingCooldown,
        });
    }

    /**
     * Constructs a new instance of the QueueProcessingFargateService class.
     */
    constructor(scope: Construct, id: string, props: QueueProcessingFargateServiceProps = {}) {
        super(scope, id, props);
        this.scalingCooldown = props.cooldown;

        if (props.taskDefinition && props.image) {
            throw new Error("You must specify only one of taskDefinition or image");
        } else if (props.taskDefinition) {
            this.taskDefinition = props.taskDefinition;
        } else if (props.image) {
            // Create a Task Definition for the container to start
            this.taskDefinition = new ecs.FargateTaskDefinition(this, "QueueProcessingTaskDef", {
                memoryLimitMiB: props.memoryLimitMiB || 512,
                cpu: props.cpu || 256,
                ephemeralStorageGiB: props.ephemeralStorageGiB,
                family: props.family,
                runtimePlatform: props.runtimePlatform,
            });

            const containerName = props.containerName ?? "QueueProcessingContainer";
            this.taskDefinition.addContainer(containerName, {
                image: props.image,
                command: props.command,
                environment: this.environment,
                secrets: this.secrets,
                logging: this.logDriver,
                healthCheck: props.healthCheck,
            });
        } else {
            throw new Error("You must specify one of: taskDefinition or image");
        }

        // Create a Fargate service with the previously defined Task Definition and configure
        // autoscaling based on cpu utilization and number of *total* messages in the SQS queue.
        this.service = new ecs.FargateService(this, "QueueProcessingFargateService", {
            cluster: this.cluster,
            taskDefinition: this.taskDefinition,
            serviceName: props.serviceName,
            minHealthyPercent: props.minHealthyPercent,
            maxHealthyPercent: props.maxHealthyPercent,
            propagateTags: props.propagateTags,
            enableECSManagedTags: props.enableECSManagedTags,
            platformVersion: props.platformVersion,
            deploymentController: props.deploymentController,
            securityGroups: props.securityGroups,
            vpcSubnets: props.taskSubnets,
            assignPublicIp: props.assignPublicIp,
            circuitBreaker: props.circuitBreaker,
            capacityProviderStrategies: props.capacityProviderStrategies,
            enableExecuteCommand: props.enableExecuteCommand,
        });

        this.configureAutoscalingForService(this.service);
        this.grantPermissionsToService(this.service);
    }
}
