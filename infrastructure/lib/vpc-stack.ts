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
        this.securityGroup.addIngressRule(this.securityGroup, ec2.Port.allTraffic());

        const keyPair = new ec2.KeyPair(this, "KeyPair", {});
        const natInstance = new ec2.Instance(this, "NatInstance", {
            vpc: this.vpc,
            vpcSubnets: this.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PUBLIC,
            }),
            securityGroup: this.securityGroup,
            keyPair: keyPair,
            sourceDestCheck: false,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.genericLinux({ "eu-central-1": "ami-07652eda1fbad7432" }), // Ubuntu Server 22.04 LTS
            userData: ec2.UserData.custom(`#!/bin/sh
                sudo apt-get update
                sudo apt-get install iptables-persistent -y
                sudo systemctl enable iptables
                sudo systemctl start iptables

                # enable ipv4 forwarding
                echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
                sudo sysctl -p

                # enable nat
                INTERFACE=\`ip a | grep UP | grep -v lo | cut -f 2 -d' ' | cut -f 1 -d':'\`
                sudo iptables -t nat -A POSTROUTING -o $INTERFACE -s 0.0.0.0/0 -j MASQUERADE
                sudo iptables -F FORWARD

                sudo iptables-save | sudo tee /etc/iptables/rules.v4
                sudo ip6tables-save | sudo tee /etc/iptables/rules.v6
            `),
        });
        natInstance.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
        natInstance.connections.allowFromAnyIpv4(ec2.Port.udp(51820));

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
