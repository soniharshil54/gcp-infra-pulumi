import * as fs from "fs";
import * as gcp from "@pulumi/gcp";
import * as path from "path";
import { gcpProvider } from "../config/provider";
import { GCP_CONFIG, STACK_NAME, CENTRAL_SERVER, VENUE_SERVER, JENKINS_CONFIG } from "../config/constant";
import { escapeXml } from "../utils";

const installDockerScriptPath = path.join(__dirname, "../config/scripts/docker-setup.sh");
const installDockerScript = fs.readFileSync(installDockerScriptPath, "utf-8");

// Read Jenkins job configuration from file
const centralServerJobConfigPath = path.join(__dirname, "../config/jenkins/central-server-job-config.xml");
const venueServerJobConfigPath = path.join(__dirname, "../config/jenkins/venue-server-job-config.xml");

let centralServerJobConfig = fs.readFileSync(centralServerJobConfigPath, "utf-8");
const venueServerJobConfig = fs.readFileSync(venueServerJobConfigPath, "utf-8");

const githubCredentialsConfigPath = path.join(__dirname, "../config/jenkins/github-credentials.xml");
const githubCredentialsConfig = fs.readFileSync(githubCredentialsConfigPath, "utf-8");

const createUserGroovyScriptPath = path.join(__dirname, "../config/jenkins/create-user.groovy");
let createUserGroovyScript = fs.readFileSync(createUserGroovyScriptPath, "utf-8");

const centralServerJenkinsfilePath = path.join(__dirname, "../config/jenkins/central-server.Jenkinsfile");
const centralServerJenkinsfileContent = escapeXml(fs.readFileSync(centralServerJenkinsfilePath, "utf-8"));
centralServerJobConfig = centralServerJobConfig.replace(/__JENKINSFILE_CONTENT__/g, centralServerJenkinsfileContent);

// Define the new Jenkins username
const newJenkinsUsername = JENKINS_CONFIG.USERNAME;

// Replace placeholders in the Groovy script
createUserGroovyScript = createUserGroovyScript
    .replace(/__NEW_USERNAME__/g, newJenkinsUsername);

const secretId = `${GCP_CONFIG.PROJECT}-${STACK_NAME}-github-token`;
const jenkinsSecretId = `${GCP_CONFIG.PROJECT}-${STACK_NAME}-jenkins-password`;

// Read the setup-github-webhook.sh script
const setupGithubWebhookScriptPath = path.join(__dirname, "../config/scripts/setup-github-webhook.sh");
const setupGithubWebhookScript = fs.readFileSync(setupGithubWebhookScriptPath, "utf-8");
const setupGithubWebhookScriptBase64 = Buffer.from(setupGithubWebhookScript).toString('base64');

export function createJenkinsInstance(name: string, zone: string): gcp.compute.Instance {
    const jenkinsTag = "jenkins";

    const accountId = `${name.slice(0, 24)}-sa`;

    const serviceAccount = new gcp.serviceaccount.Account(`${name}-sa`, {
        accountId: accountId,
        displayName: "Jenkins Service Account",
    }, { provider: gcpProvider });

    const roles = [
        "roles/compute.admin",
        "roles/storage.admin",
        "roles/iam.serviceAccountUser",
        "roles/secretmanager.secretAccessor",
    ];

    roles.forEach(role => {
        new gcp.projects.IAMMember(`${name}-sa-${role}`, {
            member: serviceAccount.email.apply(email => `serviceAccount:${email}`),
            role: role,
            project: gcp.config.project!,
        }, { provider: gcpProvider });
    });

    const network = new gcp.compute.Network(`${name}-network`, {
        autoCreateSubnetworks: true,
    }, { provider: gcpProvider });

    const firewall = new gcp.compute.Firewall(`${name}-firewall`, {
        network: network.selfLink,
        allows: [
            {
                protocol: "tcp",
                ports: ["22", "8080"],
            },
        ],
        direction: "INGRESS",
        sourceRanges: ["0.0.0.0/0"],
        targetTags: [jenkinsTag],
    }, { provider: gcpProvider });

    const instance = new gcp.compute.Instance(name, {
        machineType: "n1-standard-1",
        zone: zone,
        bootDisk: {
            initializeParams: {
                image: "ubuntu-os-cloud/ubuntu-2004-lts",
            },
        },
        networkInterfaces: [{
            network: network.selfLink,
            accessConfigs: [{}],
        }],
        serviceAccount: {
            email: serviceAccount.email,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        },
        metadataStartupScript: `#!/bin/bash
        {
            echo "Starting Jenkins installation"

            # Add Jenkins GPG key and repository
            echo "Adding Jenkins GPG key and repository..."
            curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
            echo "Jenkins GPG key and repository added."

            # Add Jenkins source to apt sources list
            echo "Adding Jenkins source to apt sources list..."
            echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
            echo "Jenkins source added."

            # Update and install necessary packages
            echo "Updating apt-get and installing necessary packages..."
            sudo apt-get update

            # Docker and Docker Compose installation
            echo "Installing Docker and Docker Compose..."
            echo '${installDockerScript}' > /tmp/install-docker.sh
            chmod +x /tmp/install-docker.sh
            /tmp/install-docker.sh

            # Install OpenJDK 17 instead of OpenJDK 11
            sudo apt-get install -y openjdk-17-jdk jq jenkins
            echo "Packages installed."

            # Start Jenkins service
            echo "Starting Jenkins service..."
            sudo systemctl start jenkins
            sudo systemctl enable jenkins
            echo "Jenkins service started and enabled."

            sleep 60

            # Wait for Jenkins to fully start
            echo "Waiting for Jenkins to fully start..."
            while ! curl -s http://localhost:8080 >/dev/null; do
                echo "Jenkins is not ready yet, waiting..."
                sleep 60
            done
            echo "Jenkins is up and running."

            # Fetch the initial admin password
            echo "Fetching the initial admin password..."
            ADMIN_PASSWORD=$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword)
            echo "Admin password fetched."

            # Install Jenkins CLI
            echo "Installing Jenkins CLI..."
            JENKINS_CLI="/tmp/jenkins-cli.jar"
            curl -L -o $JENKINS_CLI http://localhost:8080/jnlpJars/jenkins-cli.jar
            echo "Jenkins CLI installed."

            # Ensure the Jenkins CLI is downloaded correctly
            if [ ! -f "$JENKINS_CLI" ]; then
                echo "Jenkins CLI not found!"
                exit 1
            fi

            echo "Seems like Jenkins is up and running. Let's wait for a minute to make sure everything is settled."

            sleep 60

            # Retry logic for plugin installation
            install_plugin() {
                local plugin_name=$1
                local retries=5
                while [ $retries -gt 0 ]; do
                    echo "Installing plugin: $plugin_name..."
                    java -jar $JENKINS_CLI -s http://localhost:8080/ -auth admin:$ADMIN_PASSWORD install-plugin $plugin_name -restart && break
                    retries=$((retries - 1))
                    echo "Retrying plugin installation: $plugin_name..."
                    sleep 30
                done
                if [ $retries -eq 0 ]; then
                    echo "Failed to install $plugin_name after multiple attempts."
                    exit 1
                fi
                echo "Plugin $plugin_name installed successfully."
            }

            # Install necessary plugins with retries
            echo "Installing necessary plugins..."
            install_plugin "workflow-job"
            install_plugin "git"
            install_plugin "github"
            install_plugin "github-branch-source"
            echo "All necessary plugins installed."

            # Wait for Jenkins to restart after plugin installation
            echo "Waiting for Jenkins to restart after plugin installation..."
            sleep 60

            # Verify that Jenkins is back up
            while ! curl -s http://localhost:8080 >/dev/null; do
                echo "Waiting for Jenkins to restart after plugin installation..."
                sleep 60
            done
            echo "Jenkins is up after plugin installation."

            # Define the GitHub credentials ID
            GITHUB_CREDENTIALS_ID="github-token-v1"

            # Define github repo urls
            CENTRAL_SERVER_GITHUB_REPO_URL="${CENTRAL_SERVER.GITHUB.REPO_URL}"
            VENUE_SERVER_GITHUB_REPO_URL="${VENUE_SERVER.GITHUB.REPO_URL}"

            # Fetch GitHub token from Google Secret Manager
            echo "Fetching GitHub token from Secret Manager: ${secretId}"
            GITHUB_TOKEN=$(gcloud secrets versions access latest --secret="${secretId}")
            echo "GitHub token: $GITHUB_TOKEN"
            echo '${githubCredentialsConfig}' > /tmp/github-credentials.xml
            sed -i 's|__GITHUB_TOKEN__|'"$GITHUB_TOKEN"'|g' /tmp/github-credentials.xml

            # Create credentials using the external XML file
            echo "Creating GitHub credentials using external XML file..."
            java -jar $JENKINS_CLI -s http://localhost:8080/ -auth admin:$ADMIN_PASSWORD create-credentials-by-xml system::system::jenkins _ < /tmp/github-credentials.xml
            echo "GitHub credentials created successfully."

            # Create Jenkins central server job using the Jenkins CLI with default admin credentials
            echo "Creating central server Jenkins job..."
            echo '${centralServerJobConfig}' > /tmp/central-server-job-config.xml
            sed -i 's|__GITHUB_CREDENTIALS_ID__|'"$GITHUB_CREDENTIALS_ID"'|g' /tmp/central-server-job-config.xml
            sed -i 's|__CENTRAL_SERVER_GITHUB_REPO_URL__|'"$CENTRAL_SERVER_GITHUB_REPO_URL"'|g' /tmp/central-server-job-config.xml
            java -jar $JENKINS_CLI -s http://localhost:8080 -auth admin:$ADMIN_PASSWORD create-job nodejs-central-server-deployment-job < /tmp/central-server-job-config.xml || { echo "Failed to create Jenkins central server job"; exit 1; }
            echo "Jenkins central server job created successfully."

            # Create Jenkins venue server job using the Jenkins CLI with default admin credentials
            echo "Creating venue server Jenkins job..."
            echo '${venueServerJobConfig}' > /tmp/venue-server-job-config.xml
            sed -i 's|__GITHUB_CREDENTIALS_ID__|'"$GITHUB_CREDENTIALS_ID"'|g' /tmp/venue-server-job-config.xml
            sed -i 's|__VENUE_SERVER_GITHUB_REPO_URL__|'"$VENUE_SERVER_GITHUB_REPO_URL"'|g' /tmp/venue-server-job-config.xml
            java -jar $JENKINS_CLI -s http://localhost:8080 -auth admin:$ADMIN_PASSWORD create-job nodejs-venue-server-deployment-job < /tmp/venue-server-job-config.xml || { echo "Failed to create Jenkins venue server job"; exit 1; }
            echo "Jenkins venue server job created successfully."

            # Write the base64-encoded Groovy script to a file
            echo '${createUserGroovyScript}' > /tmp/create-user.groovy
            echo "Fetching Jenkins password from Secret Manager: ${jenkinsSecretId}"
            JENKINS_PASSWORD=$(gcloud secrets versions access latest --secret="${jenkinsSecretId}")
            sed -i 's|__NEW_PASSWORD__|'"$JENKINS_PASSWORD"'|g' /tmp/create-user.groovy
            
            # Execute the Groovy script via Jenkins CLI
            echo "Creating new admin user..."
            java -jar $JENKINS_CLI -s http://localhost:8080/ -auth admin:$ADMIN_PASSWORD groovy = /tmp/create-user.groovy
            echo "New admin user created successfully."

            # Save the password to a file for later retrieval
            echo $ADMIN_PASSWORD > /var/lib/jenkins/admin-password.txt
            sudo chmod 600 /var/lib/jenkins/admin-password.txt
            echo "Admin password saved to /var/lib/jenkins/admin-password.txt"

            # Write setup-github-webhook.sh to /tmp using base64 decoding
            echo '${setupGithubWebhookScriptBase64}' | base64 -d > /tmp/setup-github-webhook.sh
            chmod +x /tmp/setup-github-webhook.sh


            # Fetch GitHub token and repository details
            CENTRAL_SERVER_REPO="${CENTRAL_SERVER.GITHUB.REPO_OWNER}/${CENTRAL_SERVER.GITHUB.REPO_NAME}"
            VENUE_SERVER_REPO="${VENUE_SERVER.GITHUB.REPO_OWNER}/${VENUE_SERVER.GITHUB.REPO_NAME}"
            WEBHOOK_URL="http://$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H 'Metadata-Flavor: Google'):8080/github-webhook/"
            echo "Webhook URL: $WEBHOOK_URL"

            # Execute the webhook setup script for each repository
            /tmp/setup-github-webhook.sh "$CENTRAL_SERVER_REPO" "$GITHUB_TOKEN" "$WEBHOOK_URL"
            /tmp/setup-github-webhook.sh "$VENUE_SERVER_REPO" "$GITHUB_TOKEN" "$WEBHOOK_URL"

            # Restart Jenkins to apply configuration changes
            sleep 60
            sudo systemctl restart jenkins

            echo "Jenkins setup complete"
        } &>> /var/log/jenkins-install.log
        `,
        tags: [jenkinsTag],
        allowStoppingForUpdate: true,
    }, { provider: gcpProvider });

    return instance;
}
