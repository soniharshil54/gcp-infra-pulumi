pipeline {
    agent any

    environment {
        // Use default values if parameters are not provided
        PROJECT = 'gotham-433513'
        REGION = 'us-central1'
        INSTANCE_GROUP_NAME = 'gotham-433513-dev-instance-group'
    }

    stages {
        stage('Checkout Source') {
            steps {
                git(
                    url: 'https://github.com/soniharshil54/get-client-ip-node-private.git',
                    branch: 'main',
                    credentialsId: 'github-token-v1'
                )
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
