import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as fs from "fs";
import { Config } from "@pulumi/pulumi";

// Load environment variables
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Create Config objects for each namespace
const gcpConfig = new Config("gcp");

// Constants from Pulumi config
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");

if (!credentialsPath) {
    throw new Error("Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS");
}

// Read the credentials file
const credentials = fs.readFileSync(credentialsPath).toString();

// Create and export the GCP provider
export const gcpProvider = new gcp.Provider("gcpProvider", {
    project: project,
    region: region,
    credentials: credentials,
});
