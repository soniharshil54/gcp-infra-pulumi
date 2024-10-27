import * as gcp from "@pulumi/gcp";

export function createGithubTokenSecret(name: string, token: string, location: string) {
    // Create a new secret with automatic replication
    const secret = new gcp.secretmanager.Secret(name, {
        secretId: name,
        replication: {
            userManaged: {
                replicas: [
                    {
                        location: location,
                    },
                ],
            },
        },
    });

    // Add the secret value
    new gcp.secretmanager.SecretVersion(`${name}-version`, {
        secret: secret.id,
        secretData: token,
    });

    return secret.secretId;
}
