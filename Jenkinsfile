pipeline {
    agent any

    environment {
        PROJECT = 'your-gcp-project-id'
        REGION = 'us-central1'
        ZONE = 'us-central1-a'
        PULUMI_STACK = sh(script: 'pulumi stack --show-name', returnStdout: true).trim()
        INSTANCE_GROUP_NAME = sh(script: 'pulumi stack output instanceGroupName', returnStdout: true).trim()
        TEMPLATE_NAME = sh(script: 'pulumi stack output instanceTemplateName', returnStdout: true).trim()
    }

    stages {
        stage('Pull Latest Code') {
            steps {
                git branch: "${env.GITHUB_BRANCH}", url: "${env.GITHUB_REPO}"
            }
        }

        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

        stage('Update Compute Engine') {
            steps {
                script {
                    // Update the instance template with the new metadata
                    sh 'pulumi stack select ${env.PULUMI_STACK}'
                    sh 'pulumi up --skip-preview --yes'
                }
            }
        }
    }
}
