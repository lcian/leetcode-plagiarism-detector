#!/usr/bin/env node
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { ApplicationStack } from "../lib/application-stack";
import { InfrastructureStack } from "../lib/infrastructure-stack";

const app = new cdk.App();

const infrastructureStack = new InfrastructureStack(app, "InfrastructureStack", {});
new ApplicationStack(app, "ApplicationStack", {
    vpc: infrastructureStack.vpc,
});

cdk.Aspects.of(app).add(new cdk.Tag("AppManagerCFNStackKey", "leetcode-plagiarism-detector"));
