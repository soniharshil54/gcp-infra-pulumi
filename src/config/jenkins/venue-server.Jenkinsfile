pipeline {
    agent any

    environment {
        PROJECT_ID = '__GCP_PROJECT__'
        LOCATION = '__GCP_REGION__'
        REPOSITORY_NAME = '__VENUE_ARTIFACT_REGISTRY_NAME__'
        SERVICE_NAME = '__VENUE_SERVER_SERVICE_NAME__'
        TAG = 'latest'
    }

    stages {
        stage('Checkout Source') {
            steps {
                git(
                    url: '__VENUE_SERVER_GITHUB_REPO_URL__',
                    branch: '__VENUE_SERVER_GITHUB_BRANCH__',
                    credentialsId: 'github-token-v1'
                )
            }
        }

        stage('Read Version Tag') {
            steps {
                script {
                    VERSION_TAG = readFile('VERSION').trim()
                    echo "Read VERSION_TAG: ${VERSION_TAG}"
                }
            }
        }

        stage('Authenticate with Google Cloud') {
            steps {
                script {
                    sh 'gcloud auth configure-docker "${LOCATION}-docker.pkg.dev"'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh 'docker compose -f docker-compose.build.yml build'

                    // Capture the image ID of the service
                    IMAGE_ID = sh(script: "docker images --filter=reference='*' --format '{{.ID}}' | head -n 1", returnStdout: true).trim()
                    echo "Built image with ID: ${IMAGE_ID}"
                }
            }
        }

        stage('Tag Docker Image') {
            steps {
                script {
                    sh """
                    docker tag ${IMAGE_ID} ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:latest
                    docker tag ${IMAGE_ID} ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${VERSION_TAG}
                    """
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                script {
                    sh """
                    docker push ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:latest
                    docker push ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${VERSION_TAG}
                    """
                }
            }
        }

        stage('Confirmation') {
            steps {
                echo "Images pushed successfully to Artifact Registry:"
                echo "- ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:latest"
                echo "- ${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${VERSION_TAG}"
            }
        }
    }
}
