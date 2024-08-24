import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createInstance(name: string, zone: string) {
    return new gcp.compute.Instance(name, {
        machineType: "f1-micro",
        zone: zone,
        bootDisk: {
            initializeParams: {
                image: "debian-cloud/debian-11",
            },
        },
        networkInterfaces: [{
            network: "default",
            accessConfigs: [{}], // Allocate a one-to-one NAT IP to the instance
        }],
    }, { provider: gcpProvider });
}
