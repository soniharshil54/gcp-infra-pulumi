import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";
const { GITHUB_PAT, GITHUB_BRANCH, NODE_SERVER_PORT } = process.env;

export function createInstanceTemplate(name: string) {
    return new gcp.compute.InstanceTemplate(`${name}`, {
        machineType: "f1-micro",
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
            
            # Clone the repository
            git clone https://github.com/soniharshil54/get-client-ip-node.git /home/ubuntu/get-client-ip-node
            cd /home/ubuntu/get-client-ip-node
            pwd
            ls
            
            # Switch to the branch
            git checkout ${GITHUB_BRANCH}
            
            # Install dependencies
            npm install
            
            # Start the server with pm2
            npm run start:prod

            echo "Startup script complete"
        } &>> /var/log/startup-script.log`,
    }, { provider: gcpProvider });
}

export function createInstanceGroup(name: string, instanceTemplate: gcp.compute.InstanceTemplate, zone: string, size: number) {
    return new gcp.compute.InstanceGroupManager(name, {
        baseInstanceName: name,
        versions: [{
            instanceTemplate: instanceTemplate.selfLink,
        }],
        zone: zone,
        // allInstancesConfig: {
        //     metadata: {
        //         metadata_key: "metadata_value",
        //     },
        //     labels: {
        //         label_key: "label_value",
        //     },
        // },
        targetSize: size,
        namedPorts: [{
            name: `http-${NODE_SERVER_PORT}`,  // This name must match the portName in the BackendService
            port: NODE_SERVER_PORT as any,
        }],
    }, { provider: gcpProvider });
}
