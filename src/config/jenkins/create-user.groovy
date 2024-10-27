import hudson.security.*
import jenkins.model.*
def instance = Jenkins.getInstance()

// Replace these placeholders with actual values if you inject them dynamically
def username = "__NEW_USERNAME__"
def password = "__NEW_PASSWORD__"

// Create the new user
def hudsonRealm = instance.getSecurityRealm()
hudsonRealm.createAccount(username, password)
instance.save()

// Assign admin privileges to the new user
def strategy = instance.getAuthorizationStrategy()
if(strategy instanceof hudson.security.FullControlOnceLoggedInAuthorizationStrategy) {
    // If using FullControlOnceLoggedInAuthorizationStrategy, nothing more to do
} else if(strategy instanceof hudson.security.GlobalMatrixAuthorizationStrategy) {
    strategy.add(Jenkins.ADMINISTER, username)
    instance.save()
} else {
    // Handle other authorization strategies if necessary
}
