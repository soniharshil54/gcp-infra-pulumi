pipeline {
    agent any

    environment {
        PROJECT_ID = '__GCP_PROJECT__'
        LOCATION = '__GCP_REGION__'
        REPOSITORY_NAME = '__VENUE_ARTIFACT_REGISTRY_NAME__'
        SERVICE_NAME = '__VENUE_SERVER_SERVICE_NAME__'
        TAG = 'latest'
        PROD_REPO_URL = '__VENUE_SERVER_PROD_GITHUB_REPO_URL__'
        PROD_REPO_BRANCH = '__VENUE_SERVER_PROD_GITHUB_BRANCH__'
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

        stage('Update Compose and Push Git Tag') {
            steps {
                script {
                    def imagePath = "${LOCATION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${SERVICE_NAME}:${VERSION_TAG}"

                    // Remove the prod-repo directory if it already exists
                    sh "rm -rf prod-repo"

                    // Clone the production repository
                    sh """
                    git clone ${PROD_REPO_URL} prod-repo
                    cd prod-repo
                    git checkout ${PROD_REPO_BRANCH}
                    """

                    // Ensure update_image.sh is executable
                    sh "chmod +x prod-repo/update_image.sh"

                    // Run update_image.sh with the new image tag
                    sh """
                    cd prod-repo
                    ./update_image.sh api-service ${imagePath}
                    """

                    // Commit the updated docker-compose file and push the new tag using GIT_ASKPASS
                    withCredentials([usernamePassword(credentialsId: 'github-token-v1', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_TOKEN')]) {
                        sh """
                        cd prod-repo
                        git config user.name "Jenkins CI"
                        git config user.email "jenkins@example.com"
                        git add docker-compose.prod.yaml
                        git commit -m "Update Docker Compose image to ${VERSION_TAG}"

                        # Set up GIT_ASKPASS for secure token-based push
                        export GIT_ASKPASS=\$(mktemp)
                        echo "echo \${GIT_TOKEN}" > \${GIT_ASKPASS}
                        chmod +x \${GIT_ASKPASS}

                        # Push the commit and tag
                        git push origin ${PROD_REPO_BRANCH}
                        git tag ${VERSION_TAG}
                        git push origin ${VERSION_TAG}

                        # Clean up GIT_ASKPASS
                        rm -f \${GIT_ASKPASS}
                        """
                    }
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
