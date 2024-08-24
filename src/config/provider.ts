import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as fs from "fs";

// Load environment variables
const project = process.env.GOOGLE_PROJECT;
const region = process.env.GOOGLE_REGION;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!project || !region || !credentialsPath) {
    throw new Error("Missing required environment variables: GOOGLE_PROJECT, GOOGLE_REGION, GOOGLE_APPLICATION_CREDENTIALS");
}

// Read the credentials file
const credentials = fs.readFileSync(credentialsPath).toString();

// Create and export the GCP provider
export const gcpProvider = new gcp.Provider("gcpProvider", {
    project: project,
    region: region,
    credentials: credentials,
});
