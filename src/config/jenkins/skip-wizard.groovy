import jenkins.model.*
import hudson.util.*
import jenkins.install.*

println "--> Disabling Jenkins Setup Wizard"
InstallState.INITIAL_SETUP_COMPLETED.initializeState()
