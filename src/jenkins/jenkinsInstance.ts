import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

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
            sudo apt-get install -y openjdk-11-jdk jq jenkins
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

            # Download the job configuration (replace with your URL)
            echo "Downloading the Jenkins job configuration..."
            curl -L -o /tmp/jenkins-job-config.xml https://raw.githubusercontent.com/soniharshil54/remote-files-fieasta/main/jenkins-job-config-v6.xml

            # Ensure the job configuration file is downloaded correctly
            if [ ! -f "/tmp/jenkins-job-config.xml" ]; then
                echo "Jenkins job configuration not found!"
                exit 1
            fi
            echo "Jenkins job configuration downloaded."

            # Create Jenkins job using the Jenkins CLI with default admin credentials
            echo "Creating Jenkins job..."
            java -jar $JENKINS_CLI -s http://localhost:8080 -auth admin:$ADMIN_PASSWORD create-job nodejs-deployment-job < /tmp/jenkins-job-config.xml || { echo "Failed to create Jenkins job"; exit 1; }
            echo "Jenkins job created successfully."

            echo "Jenkins setup complete"
        } &>> /var/log/jenkins-install.log
        `,
        tags: [jenkinsTag],
        allowStoppingForUpdate: true,
    }, { provider: gcpProvider });

    return instance;
}
