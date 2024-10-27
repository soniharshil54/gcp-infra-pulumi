import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as fs from "fs";

import { GCP_CONFIG } from "./constant"

// Load environment variables
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialsPath) {
    throw new Error("Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS");
}

// Read the credentials file
const credentials = fs.readFileSync(credentialsPath).toString();

// Create and export the GCP provider
export const gcpProvider = new gcp.Provider("gcpProvider", {
    project: GCP_CONFIG.PROJECT,
    region: GCP_CONFIG.REGION,
    credentials: credentials,
});
