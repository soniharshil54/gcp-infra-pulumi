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

            # Wait for Jenkins to fully start
            while ! curl -s http://localhost:8080 >/dev/null; do
                echo "Waiting for Jenkins to start..."
                sleep 20
            done

            # Fetch the initial admin password
            ADMIN_PASSWORD=$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword)

            # Install Jenkins CLI
            JENKINS_CLI="/tmp/jenkins-cli.jar"
            curl -L -o $JENKINS_CLI http://localhost:8080/jnlpJars/jenkins-cli.jar

            # Download the job configuration (replace with your URL)
            curl -L -o /tmp/jenkins-job-config.xml https://raw.githubusercontent.com/soniharshil54/remote-files-fieasta/main/jenkins-job-config.xml

            # Create Jenkins job using the Jenkins CLI with default admin credentials
            java -jar $JENKINS_CLI -s http://localhost:8080 -auth admin:$ADMIN_PASSWORD create-job your-nodejs-job < /tmp/jenkins-job-config.xml

            echo "Jenkins setup complete"
        } &>> /var/log/jenkins-install.log`,
        tags: [jenkinsTag],
        allowStoppingForUpdate: true,
    }, { provider: gcpProvider });

    return instance;
}
