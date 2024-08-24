import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createCloudCDNForBucket(bucketName: string) {
    const backendBucket = new gcp.compute.BackendBucket(`cdn-${bucketName}`, {
        bucketName: bucketName,
        enableCdn: true,
    }, { provider: gcpProvider });

    return backendBucket;
}

// export function createCloudCDNForBackendService(backendServiceName: string, healthCheck: gcp.compute.HttpHealthCheck) {
//     return new gcp.compute.BackendService(`${backendServiceName}-cdn`, {
//         name: `${backendServiceName}-cdn`,
//         protocol: "HTTP",
//         loadBalancingScheme: "EXTERNAL",
//         healthChecks: healthCheck.id,
//         enableCdn: true,
//     }, { provider: gcpProvider });
// }
