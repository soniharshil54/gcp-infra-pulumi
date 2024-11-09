import * as gcp from "@pulumi/gcp";
import { gcpProvider } from "../config/provider";

export function createArtifactRegistry(name: string, location: string) {
    return new gcp.artifactregistry.Repository(name, {
        repositoryId: name,
        location: location,
        format: "DOCKER",
    }, { provider: gcpProvider });
}
