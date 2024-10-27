import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

import { GCP_CONFIG, CENTRAL_SERVER, STACK_NAME } from "../config/constant";

export function createInstanceTemplate(name: string) {
    // Create a service account to be used by the instances
    const secretId = `${GCP_CONFIG.PROJECT}-${STACK_NAME}-github-token`;

    const accountId = `${name.slice(0, 24)}-sa`;
    const serviceAccount = new gcp.serviceaccount.Account(`${name}-sa`, {
        accountId: accountId,
        displayName: `${name} Service Account`,
    }, { provider: gcpProvider });

    // Attach the Secret Manager Access Role to the service account
    new gcp.projects.IAMMember(`${name}-secret-access`, {
        project: GCP_CONFIG.PROJECT,
        role: "roles/secretmanager.secretAccessor",
        member: serviceAccount.email.apply(email => `serviceAccount:${email}`),
    }, { provider: gcpProvider });

    return new gcp.compute.InstanceTemplate(`${name}`, {
        machineType: "f1-micro",
        serviceAccount: {
            email: serviceAccount.email,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
        disks: [{
            boot: true,
            autoDelete: true,
            sourceImage: "ubuntu-os-cloud/ubuntu-2004-lts",
        }],
        networkInterfaces: [{
            network: "default",
            accessConfigs: [{}],
        }],
        tags: ["allow-lb"],
        metadataStartupScript: `#!/bin/bash
        {
            echo "Startup script running"
            sudo apt-get update
            sudo apt-get install -y git
            
            # Install Node.js 18
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs

            # Install pm2 globally
            sudo npm install -g pm2

            # Set HOME environment variable
            export HOME=/root

            # Fetch GitHub token from Google Secret Manager
            echo "Fetching GitHub token from Secret Manager: ${secretId}"
            GITHUB_TOKEN=$(gcloud secrets versions access latest --secret="${secretId}")
            echo "GitHub token: $GITHUB_TOKEN"

            # Use GIT_ASKPASS for authentication
            export GIT_ASKPASS=$(mktemp)
            echo "echo \$GITHUB_TOKEN" > $GIT_ASKPASS
            chmod +x $GIT_ASKPASS

            echo "Github Repo URL: ${CENTRAL_SERVER.GITHUB.REPO_URL}"
            echo "Github Branch: ${CENTRAL_SERVER.GITHUB.BRANCH}"
            echo "Github Repo Name: ${CENTRAL_SERVER.GITHUB.REPO_NAME}"
            # Clone the repository
            git clone ${CENTRAL_SERVER.GITHUB.REPO_URL} /home/ubuntu/${CENTRAL_SERVER.GITHUB.REPO_NAME} || exit 1
            cd /home/ubuntu/${CENTRAL_SERVER.GITHUB.REPO_NAME}
            pwd
            ls
            
            # Switch to the branch
            git checkout ${CENTRAL_SERVER.GITHUB.BRANCH}
            
            # Install dependencies
            npm install
            
            # Start the server with pm2
            npm run start:prod

            echo "Startup script complete"
        } &>> /var/log/startup-script.log`,
    }, { provider: gcpProvider });
}

export function createInstanceGroup(name: string, instanceTemplate: gcp.compute.InstanceTemplate, region: string, size: number) {
    return new gcp.compute.RegionInstanceGroupManager(name, {
        name: name,
        baseInstanceName: name,
        versions: [{
            instanceTemplate: instanceTemplate.selfLink,
        }],
        region: region,
        targetSize: size,
        namedPorts: [{
            name: `http-${CENTRAL_SERVER.NODE_SERVER_PORT}`,  // This name must match the portName in the BackendService
            port: CENTRAL_SERVER.NODE_SERVER_PORT,
        }],
        updatePolicy: {
            type: "PROACTIVE",
            minimalAction: "REPLACE",
            maxSurgeFixed: 3,  // Only replace one instance at a time
            maxUnavailableFixed: 0,  // Always keep at least one instance running
            replacementMethod: "SUBSTITUTE",  // Ensures seamless replacement
        },
    }, { provider: gcpProvider });
}
