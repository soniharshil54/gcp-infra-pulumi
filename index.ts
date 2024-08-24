import * as dotenv from "dotenv";
import { getStack, output } from "@pulumi/pulumi";

// Load environment variables from .env file
dotenv.config();

// Ensure the environment variables are set
const project = process.env.GOOGLE_PROJECT;
const region = process.env.GOOGLE_REGION;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!project || !region || !credentialsPath) {
    throw new Error("Missing required environment variables: GOOGLE_PROJECT, GOOGLE_REGION, GOOGLE_APPLICATION_CREDENTIALS");
}

const stackName = getStack();

import { createInstanceTemplate, createInstanceGroup } from "./src/compute/instanceGroup";
import { createAllowHttpFirewallRule, createAllowLbToInstanceFirewallRule } from "./src/network/firewallRules";
import { createAutoscaler } from "./src/compute/autoscaler";
import { createLoadBalancer } from "./src/compute/loadBalancer";
import { createBucket } from "./src/storage/bucket";
import { createJenkinsInstance } from "./src/jenkins/jenkinsInstance";  // Import Jenkins creation function
// import { createSecurityPolicy } from "./src/network/armor";

const resourceName = (baseName: string) => `${project}-${stackName}-${baseName}`;

// Create Firewall Rules
const allowHttpFirewall = createAllowHttpFirewallRule(resourceName("allow-http"));
const allowLbToInstanceFirewall = createAllowLbToInstanceFirewallRule(resourceName("allow-lb-to-instances"));

// Create security policy around Cloud Armor
// const securityPolicy = createSecurityPolicy(resourceName("lb-security-policy"));

// Create Instance Template
const instanceTemplate = createInstanceTemplate(resourceName("instance-template"));

// Create Instance Group
const instanceGroup = createInstanceGroup(resourceName("instance-group"), instanceTemplate, "us-central1-a", 1);

// Set up Autoscaling
createAutoscaler(resourceName("autoscaler"), instanceGroup, "us-central1-a");

// Set up Load Balancer
const loadBalancer = createLoadBalancer(resourceName("load-balancer"), instanceGroup);

export const loadBalancerIp = loadBalancer.loadBalancerIp;

// Create Jenkins Instance
const jenkinsInstance = createJenkinsInstance(resourceName("jenkins-instance"), "us-central1-a");

// Create Storage Bucket
createBucket(resourceName("assets-bucket"));

export const instanceGroupName = instanceGroup.name;
export const instanceTemplateName = instanceTemplate.name;
export const pulumiStackName = stackName;
export const jenkinsInstancePublicIp = jenkinsInstance.networkInterfaces.apply(ni => ni[0].accessConfigs![0].natIp);
