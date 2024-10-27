import * as pulumi from "@pulumi/pulumi";

/** Interface Definitions */

interface GcpConfig {
  PROJECT: string;
  REGION: string;
}

interface GithubConfig {
  REPO_URL: string;
  REPO_NAME: string;
  BRANCH: string;
}

interface CentralServerConfig {
  GITHUB: GithubConfig;
  NODE_SERVER_PORT: number;
  HEALTHCHECK_PATH: string;
}

interface VenueServerConfig {
  GITHUB: GithubConfig;
}

/** Fetching Configurations from Pulumi */
const gcpConfig = new pulumi.Config("gcp");
const centralServerConfig = new pulumi.Config("centralServer");
const venueServerConfig = new pulumi.Config("venueServer");
const jenkinsConfig = new pulumi.Config("jenkins");

/** GCP Configuration */
export const GCP_CONFIG: GcpConfig = {
  PROJECT: gcpConfig.require("project"),
  REGION: gcpConfig.require("region"),
};

/** Central Server Configuration */
export const CENTRAL_SERVER: CentralServerConfig = {
  GITHUB: {
    REPO_URL: centralServerConfig.require("githubRepoUrl"),
    REPO_NAME: centralServerConfig.require("githubRepoName"),
    BRANCH: centralServerConfig.require("githubBranch"),
  },
  NODE_SERVER_PORT: centralServerConfig.requireNumber("nodeServerPort"),
  HEALTHCHECK_PATH: centralServerConfig.require("healthcheckPath"),
};

/** Venue Server Configuration */
export const VENUE_SERVER: VenueServerConfig = {
  GITHUB: {
    REPO_URL: venueServerConfig.require("githubRepoUrl"),
    REPO_NAME: venueServerConfig.require("githubRepoName"),
    BRANCH: venueServerConfig.require("githubBranch"),
  },
};

export const JENKINS_CONFIG = {
  USERNAME: jenkinsConfig.require("username"),
};

export const STACK_NAME = pulumi.getStack();
