# gcp-pulumi-infra-gotham

## Prerequisites

- Google Cloud SDK (https://cloud.google.com/sdk/docs/install)
- Pulumi CLI (https://www.pulumi.com/docs/get-started/install/)
- Node.js (https://nodejs.org/) (v18 or later) - Ideally use nvm

## Setup Instructions

### Install Pulumi CLI

Follow the instructions on the Pulumi installation page (https://www.pulumi.com/docs/get-started/install/) to install the Pulumi CLI.

### Install Google Cloud SDK

Follow the instructions on the Google Cloud SDK installation page (https://cloud.google.com/sdk/docs/install) to install the Google Cloud SDK.

After installing, authenticate with your Google account:

``gcloud auth login``

``gcloud auth application-default``

### Create a Service Account and Generate Key

1. Go to the Google Cloud Console (https://console.cloud.google.com/).
2. Navigate to IAM & Admin > Service Accounts.
3. Click "Create Service Account".
4. Assign roles (e.g., `Editor`, `Owner`, or specific roles needed for your resources).
5. Go to the "Keys" tab, click "Add Key" > "Create new key", and choose "JSON".
6. Download and save the JSON key file securely.

### Set Up the Project

Install project dependencies:

``npm install``

Create a `.env` file in the project root and add your configurations:

GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-file.json
GITHUB_TOKEN=

### Run Pulumi Commands

Initialize Pulumi:

``pulumi stack init dev``

Configure Pulumi to use your GCP project and region:

pulumi config set gcp:project your-gcp-project-id
pulumi config set gcp:region us-central1


Preview the stack:

``pulumi preview``

Deploy the stack:

``pulumi up``

### Destroy the Stack

To destroy the stack and all associated resources, run:

``pulumi destroy``

## Project Structure

- `index.ts`: Main Pulumi program file that defines the Google Cloud resources.
- `.env`: Environment variables for the project.
- `package.json`: Node.js project file with dependencies and scripts.
- `Pulumi.yaml`: Pulumi project configuration file.

## Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to your GCP service account JSON key file.
- `GITHUB_TOKEN`: Github access token

## Useful Links

- Pulumi Documentation (https://www.pulumi.com/docs/)
- Pulumi GCP Resources Documentation (https://www.pulumi.com/registry/packages/gcp/api-docs/)
- Google Cloud SDK Documentation (https://cloud.google.com/sdk/docs)
- Google Cloud Console (https://console.cloud.google.com/)

## Troubleshooting

### Common Errors

1. **Failed to get regions list**: Ensure that the `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set correctly and points to a valid service account key file.
2. **Error loading zone**: Ensure that you specify a valid zone within your region (e.g., `us-central1-a`).

### Tips

- Ensure you have enabled the necessary APIs in your GCP project, such as the Compute Engine API.
- Verify that your service account has the required permissions to create resources in your GCP project.
