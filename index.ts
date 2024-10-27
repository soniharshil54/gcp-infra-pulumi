import * as dotenv from "dotenv";

import { GCP_CONFIG, STACK_NAME } from "./src/config/constant";

// Load environment variables from .env file
dotenv.config();

// Ensure the environment variables are set
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const githubToken = process.env.GITHUB_TOKEN;
const jenkinsPassword = process.env.JENKINS_PASSWORD;

if (!credentialsPath) {
    throw new Error("Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS");
}

if (!githubToken) {
    throw new Error("Missing required environment variable: GITHUB_TOKEN");
}

if (!jenkinsPassword) {
    throw new Error("Missing required environment variable: JENKINS_PASSWORD");
}

console.log(`Stack name: ${STACK_NAME}`);

import { createInstanceTemplate, createInstanceGroup } from "./src/compute/instanceGroup";
import { createAllowHttpFirewallRule, createAllowLbToInstanceFirewallRule } from "./src/network/firewallRules";
import { createAutoscaler } from "./src/compute/autoscaler";
import { createLoadBalancer } from "./src/compute/loadBalancer";
import { createBucket } from "./src/storage/bucket";
import { createJenkinsInstance } from "./src/jenkins/jenkinsInstance";  // Import Jenkins creation function
// import { createSecurityPolicy } from "./src/network/armor";
import { createGithubTokenSecret } from "./src/secrets/githubSecret";
import { createJenkinsSecret } from "./src/secrets/jenkinsSecret";

const resourceName = (baseName: string) => `${GCP_CONFIG.PROJECT}-${STACK_NAME}-${baseName}`;

// Create the GitHub token secret in Secret Manager
const githubSecretName = createGithubTokenSecret(resourceName("github-token"), githubToken, GCP_CONFIG.REGION);
const jenkkinsSecretName = createJenkinsSecret(resourceName("jenkins-password"), jenkinsPassword, GCP_CONFIG.REGION);

// Create Firewall Rules
const allowHttpFirewall = createAllowHttpFirewallRule(resourceName("allow-http"));
const allowLbToInstanceFirewall = createAllowLbToInstanceFirewallRule(resourceName("allow-lb-to-instances"));

// Create security policy around Cloud Armor
// const securityPolicy = createSecurityPolicy(resourceName("lb-security-policy"));

// Create Instance Template
const instanceTemplate = createInstanceTemplate(resourceName("instance-template"));

// Create Instance Group
const instanceGroup = createInstanceGroup(resourceName("instance-group"), instanceTemplate, GCP_CONFIG.REGION, 3);

// Set up Autoscaling
createAutoscaler(resourceName("autoscaler"), instanceGroup, GCP_CONFIG.REGION);

// Set up Load Balancer
const loadBalancer = createLoadBalancer(resourceName("load-balancer"), instanceGroup);

export const loadBalancerIp = loadBalancer.loadBalancerIp;

// Create Jenkins Instance
const jenkinsInstance = createJenkinsInstance(resourceName("jenkins-instance"), "us-central1-f");

// Create Storage Bucket
createBucket(resourceName("assets-bucket"));

export const instanceGroupName = instanceGroup.name;
export const instanceTemplateName = instanceTemplate.name;
export const pulumiStackName = STACK_NAME;
export const jenkinsInstancePublicIp = jenkinsInstance.networkInterfaces.apply(ni => ni[0].accessConfigs![0].natIp);
