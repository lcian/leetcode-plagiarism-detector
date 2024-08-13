import { Construct } from "constructs";

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface VpcStackProps extends cdk.StackProps {}

export class VpcStack extends cdk.Stack {
    readonly vpc: ec2.Vpc;
    readonly securityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props: VpcStackProps) {
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
                {
                    cidrMask: 24,
                    name: "Private",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        this.securityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
            vpc: this.vpc,
            allowAllOutbound: true,
        });
        this.securityGroup.addIngressRule(
            this.securityGroup,
            ec2.Port.allTraffic(),
        );
        this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22));

        const keyPair = new ec2.KeyPair(this, "KeyPair", {});
        const natInstance = new ec2.Instance(this, "NatInstance", {
            vpc: this.vpc,
            vpcSubnets: this.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PUBLIC,
            }),
            securityGroup: this.securityGroup,
            keyPair: keyPair,
            sourceDestCheck: false,
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T2,
                ec2.InstanceSize.MICRO,
            ),
            machineImage: new ec2.AmazonLinuxImage({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
            }),
            userData: ec2.UserData.custom(`#!/bin/sh
                # install and enable iptables
                yum install iptables-services -y
                systemctl enable iptables
                systemctl start iptables

                # enable ipv4 forwarding
                echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
                sudo sysctl -p

                # enable nat
                INTERFACE=\`ip a | grep UP | grep -v lo | cut -f 2 -d' ' | cut -f 1 -d':'\`
                sudo iptables -t nat -A POSTROUTING -o $INTERFACE -s 0.0.0.0/0 -j MASQUERADE
                sudo /sbin/iptables -F FORWARD

                sudo service iptables save
            `),
        });

        this.vpc.privateSubnets.forEach((subnet) => {
            new ec2.CfnRoute(this, `RouteToNatInstance-${subnet.node.id}`, {
                instanceId: natInstance.instanceId,
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: "0.0.0.0/0",
            });
        });

        const elasticIp = new ec2.CfnEIP(this, "ElasticIp", {});
        new ec2.CfnEIPAssociation(this, "ElasticIpAssociation", {
            eip: elasticIp.ref,
            instanceId: natInstance.instanceId,
        });
    }
}
