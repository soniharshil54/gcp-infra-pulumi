import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

import { CENTRAL_SERVER } from "../config/constant";

// Firewall rule to allow HTTP access from the internet to the load balancer
export function createAllowHttpFirewallRule(name: string) {
    return new gcp.compute.Firewall(name, {
        network: "default",
        allows: [{
            protocol: "tcp",
            ports: ["80"],
        }],
        direction: "INGRESS",
        sourceRanges: ["0.0.0.0/0"], // Allows traffic from anywhere
        targetTags: ["allow-http"],
    }, { provider: gcpProvider });
}

// Firewall rule to allow the load balancer to reach instances on port 80
export function createAllowLbToInstanceFirewallRule(name: string) {
    return new gcp.compute.Firewall(name, {
        network: "default",
        allows: [{
            protocol: "tcp",
            ports: ["80", CENTRAL_SERVER.NODE_SERVER_PORT as any], // Allow traffic on port 80 and NODE_SERVER_PORT
        }],
        direction: "INGRESS",
        // sourceRanges: ["130.211.0.0/22", "35.191.0.0/16"], // GCP load balancer IP ranges
        sourceRanges: ["0.0.0.0/0"], // Allows traffic from anywhere
        targetTags: ["allow-lb"],
    }, { provider: gcpProvider });
}
