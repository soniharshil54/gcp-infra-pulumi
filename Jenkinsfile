pipeline {
    agent any

    environment {
        PROJECT = 'gotham-433513'
        ZONE = 'us-central1-a'
        INSTANCE_GROUP_NAME = sh(script: 'pulumi stack output instanceGroupName', returnStdout: true).trim()
        REPO_URL = 'https://github.com/soniharshil54/get-client-ip-node.git'  // Replace with your Node.js repo
    }

    stages {
        stage('Setup Job') {
            steps {
                script {
                    // Create a Jenkins Job via the Jenkins CLI
                    sh '''
                    cat <<EOF | java -jar /tmp/jenkins-cli.jar -s http://localhost:8080/ create-job your-nodejs-job
                    <flow-definition plugin="workflow-job">
                        <description></description>
                        <keepDependencies>false</keepDependencies>
                        <properties/>
                        <definition class="org.jenkinsci.plugins.workflow.cps.CpsScmFlowDefinition" plugin="workflow-cps">
                            <scm class="hudson.plugins.git.GitSCM" plugin="git">
                                <configVersion>2</configVersion>
                                <userRemoteConfigs>
                                    <hudson.plugins.git.UserRemoteConfig>
                                        <url>${REPO_URL}</url>
                                    </hudson.plugins.git.UserRemoteConfig>
                                </userRemoteConfigs>
                                <branches>
                                    <hudson.plugins.git.BranchSpec>
                                        <name>*/master</name>
                                    </hudson.plugins.git.BranchSpec>
                                </branches>
                                <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
                                <submoduleCfg class="list"/>
                                <extensions/>
                            </scm>
                            <scriptPath>Jenkinsfile</scriptPath>
                            <lightweight>true</lightweight>
                        </definition>
                        <triggers>
                            <hudson.triggers.SCMTrigger>
                                <spec></spec>
                                <ignorePostCommitHooks>false</ignorePostCommitHooks>
                            </hudson.triggers.SCMTrigger>
                        </triggers>
                    </flow-definition>
                    EOF
                    '''
                }
            }
        }
    }
}
