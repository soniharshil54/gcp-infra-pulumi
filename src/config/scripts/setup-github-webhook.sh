#!/bin/bash

# Usage: ./setup-github-webhook.sh <repo> <github_token> <webhook_url>

REPO=$1
GITHUB_TOKEN=$2
WEBHOOK_URL=$3

echo "Setting up GitHub webhook for repository $REPO..."

webhook_payload=$(jq -n --arg url "$WEBHOOK_URL" '{
    "name": "web",
    "config": {
        "url": $url,
        "content_type": "json",
        "insecure_ssl": "0"
    },
    "events": ["push"],
    "active": true
}')

# Make the API request to create or update the webhook
curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$webhook_payload" \
    "https://api.github.com/repos/$REPO/hooks" || {
    echo "Failed to set up GitHub webhook for $REPO"
    exit 1
}

echo "GitHub webhook setup complete for repository $REPO"
