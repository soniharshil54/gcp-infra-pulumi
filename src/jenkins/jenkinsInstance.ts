import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createJenkinsInstance(name: string, zone: string): gcp.compute.Instance {
    const jenkinsTag = "jenkins";

    // Create a valid service account ID by shortening and ensuring it meets Google's requirements
    const accountId = `${name.slice(0, 24)}-sa`; // Ensure it’s no longer than 28 characters

    // Create a service account to be used by the Jenkins instance
    const serviceAccount = new gcp.serviceaccount.Account(`${name}-sa`, {
        accountId: accountId,
        displayName: "Jenkins Service Account",
    }, { provider: gcpProvider });

    // Attach IAM roles to the service account
    const roles = [
        "roles/compute.admin",
        "roles/storage.admin",
        "roles/iam.serviceAccountUser",
        // Add other necessary roles here
    ];

    roles.forEach(role => {
        new gcp.projects.IAMMember(`${name}-sa-${role}`, {
            member: serviceAccount.email.apply(email => `serviceAccount:${email}`),
            role: role,
            project: gcp.config.project!, // Assert that the project ID is not undefined
        }, { provider: gcpProvider });
    });

    // Create the network (optional; using the default network here)
    const network = new gcp.compute.Network(`${name}-network`, {
        autoCreateSubnetworks: true,
    }, { provider: gcpProvider });

    // Create a firewall rule to allow HTTP traffic (port 8080) and SSH (port 22) to the Jenkins instance
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

    // Create the Jenkins instance and attach the service account
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
            scopes: ["https://www.googleapis.com/auth/cloud-platform"], // Full access to all Google Cloud APIs
        },
        metadataStartupScript: `#!/bin/bash
        {
            echo "Starting Jenkins installation"

            # Add Jenkins GPG key and repository
            curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
            /usr/share/keyrings/jenkins-keyring.asc > /dev/null
            echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
            https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
            /etc/apt/sources.list.d/jenkins.list > /dev/null

            # Update and install necessary packages
            sudo apt-get update
            sudo apt-get install -y openjdk-11-jdk jq jenkins

            # Start Jenkins service
            sudo systemctl start jenkins
            sudo systemctl enable jenkins

            # Wait for Jenkins to fully start (increase wait time)
            while ! curl -s http://localhost:8080 >/dev/null; do
                echo "Waiting for Jenkins to start..."
                sleep 20  # Increased sleep time to ensure Jenkins is fully started
            done

            # Download Jenkins CLI jar
            export JENKINS_CLI=/tmp/jenkins-cli.jar
            curl -L -o \${JENKINS_CLI} http://localhost:8080/jnlpJars/jenkins-cli.jar

            # Install Jenkins plugins
            PLUGINS=(git github github-branch-source pipeline)
            for plugin in \${PLUGINS[@]}; do
                java -jar \${JENKINS_CLI} -s http://localhost:8080/ -auth admin:\$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword) install-plugin \${plugin} -restart
            done

            # Install Pulumi CLI
            echo "Installing Pulumi CLI"
            curl -fsSL https://get.pulumi.com | sh
            echo "Pulumi CLI installed"
            echo "export PATH=\$PATH:\$HOME/.pulumi/bin" >> ~/.bashrc
            export PATH=\$PATH:\$HOME/.pulumi/bin


            # Verify Pulumi installation
            pulumi version

            echo "Jenkins setup complete"
        } &>> /var/log/jenkins-install.log`,
        tags: [jenkinsTag],
        allowStoppingForUpdate: true, // This allows Pulumi to stop the instance for updates
    }, { provider: gcpProvider });

    return instance;
}
