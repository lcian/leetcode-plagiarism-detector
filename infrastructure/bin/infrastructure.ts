#!/usr/bin/env node
import "source-map-support/register";

import * as cdk from "aws-cdk-lib";

import { DataStack } from "../lib/data-stack";
import { VpcStack } from "../lib/vpc-stack";

const app = new cdk.App();

const vpcStack = new VpcStack(app, "VpcStack", {});
new DataStack(app, "DataStack", {
    vpc: vpcStack.vpc,
    securityGroup: vpcStack.securityGroup,
});

cdk.Aspects.of(app).add(
    new cdk.Tag("AppManagerCFNStackKey", "leetcode-cheater-detector"),
);
