import {Stack, StackProps, Duration, CfnOutput} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';

export class SampleStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props)

    // VPC
    const SampleVpc = new ec2.Vpc(this, 'SampleVPC',{
      ipAddresses: ec2.IpAddresses.cidr('10.20.0.0/16'),
      availabilityZones: ["ap-southeast-2a","ap-southeast-2b","ap-southeast-2c"],
      createInternetGateway: true,
      natGateways: 3,

      subnetConfiguration:[
        {
          cidrMask: 24,
          name: "Sample-subnet-public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Sample-subnet-private",
          // subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          // subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });
            
    // ECR
    const SampleRepo = new ecr.Repository(this, 'SampleRepo',{
      repositoryName: 'sample-cdk-assignment',
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      
      lifecycleRules: [
        {
          rulePriority: 3,
          maxImageAge: Duration.days(365),
          tagStatus: ecr.TagStatus.ANY,
          description: 'Deleting images older than 1 year'
        },
        {
          rulePriority: 2,
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageCount: 10,
          description: 'Deleting untagged images'
        },
        {
          rulePriority: 1,
          tagStatus: ecr.TagStatus.TAGGED,
          tagPrefixList: ['dev'],
          maxImageAge: Duration.days(30),
          description: 'Delete dev-tagged images older than 30 days.',
        },
      ]

    });

    // ECS
    const cluster = new ecs.Cluster(this, 'SampleCluster', {
      vpc: SampleVpc,
      clusterName: 'SampleCluster',
    });
    
    const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'SampleService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(SampleRepo, 'latest'),
        containerPort: 3000,
      },
      publicLoadBalancer: true, // ALB gets a public IP
    });


    /*  #########################
        #####    OUTPUTS    #####
        ######################### */

    // VPC OUTPUTS
    new CfnOutput(this, 'VpcId', { value: SampleVpc.vpcId });

    SampleVpc.publicSubnets.forEach((subnet, index) => {
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;

      new CfnOutput(this, `PublicSubnet${index + 1}Id`, {
        value: subnet.subnetId,
      });

      new CfnOutput(this, `PublicSubnet${index + 1}Cidr`, {
        value: cfnSubnet.cidrBlock || 'unknown',
      });
    });

    SampleVpc.privateSubnets.forEach((subnet, index) => {
      const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;

      new CfnOutput(this, `PrivateSubnet${index + 1}Id`, {
        value: subnet.subnetId,
      });

      new CfnOutput(this, `PrivateSubnet${index + 1}Cidr`, {
        value: cfnSubnet.cidrBlock || 'unknown',
      });
    });

    // FARGATE OUTPUTS
    new CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'The DNS address of the ALB fronting the Fargate service',
    });

    // ECR OUTPUTS
    new CfnOutput(this, 'RepositoryUri', { value: SampleRepo.repositoryUri });
  }

}
