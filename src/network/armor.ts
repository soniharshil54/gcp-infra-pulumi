import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createSecurityPolicy(name: string) {
    return new gcp.compute.SecurityPolicy(name, {
        description: "Security policy for Cloud Armor",
        rules: [
            {
                priority: 1000,
                match: {
                    versionedExpr: "SRC_IPS_V1",
                    config: {
                        srcIpRanges: [
                            "0.0.0.0/0",
                        ], // Adjust as necessary
                    },
                },
                action: "allow",
            }, {
                priority: 2147483647,
                match: {
                    versionedExpr: "SRC_IPS_V1", // Matches all traffic
                },
                action: "deny(404)", // Default action for unmatched traffic
            }
        ],  
    }, { provider: gcpProvider });
}
