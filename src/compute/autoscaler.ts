import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createAutoscaler(name: string, instanceGroup: gcp.compute.RegionInstanceGroupManager, region: string) {
    return new gcp.compute.RegionAutoscaler(name, {
        region: region,
        target: instanceGroup.id,
        autoscalingPolicy: {
            maxReplicas: 3,
            minReplicas: 2,
            cpuUtilization: {
                target: 0.6,
            },
        },
    }, { provider: gcpProvider });
}
