import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createBucket(name: string) {
    return new gcp.storage.Bucket(name, {
        location: 'US',
    }, { provider: gcpProvider });
}
