pipeline {
    agent any

    environment {
        // Use default values if parameters are not provided
        PROJECT = '__GCP_PROJECT__'
        REGION = '__GCP_REGION__'
        INSTANCE_GROUP_NAME = '__INSTANCE_GROUP_NAME__'
        ENVIRONMENT = '__ENVIRONMENT__'
    }

    stages {
        stage('Checkout Source') {
            steps {
                git(
                    url: '__CENTRAL_SERVER_GITHUB_REPO_URL__',
                    branch: '__CENTRAL_SERVER_GITHUB_BRANCH__',
                    credentialsId: 'github-token-v1'
                )
            }
        }

        stage('Approval') {
            when {
                expression { env.ENVIRONMENT == 'prod' }
            }
            steps {
                script {
                    input message: 'Approve to proceed with the production deployment ?', 
                          ok: 'Approve'
                }
            }
        }

        stage('Update Instances') {
            steps {
                script {
                    // Trigger rolling restart by updating instance group template
                    sh '''
                    gcloud compute instance-groups managed rolling-action replace ${INSTANCE_GROUP_NAME} \
                    --region ${REGION} \
                    --max-surge 3 \
                    --max-unavailable 0 \
                    '''
                }
            }
        }
    }
}
