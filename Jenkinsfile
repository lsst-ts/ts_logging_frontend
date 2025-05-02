properties(
    [
    buildDiscarder(
        logRotator(
            artifactDaysToKeepStr: '',
            artifactNumToKeepStr: '',
            daysToKeepStr: '14',
            numToKeepStr: '10',
        )
    ),
    // Make new builds terminate existing builds
    disableConcurrentBuilds(
        abortPrevious: true,
    )
    ]
)

pipeline {
  agent any
  environment {
    dockerImage = ""
    // SAL setup file
    SAL_SETUP_FILE = "/home/saluser/.setup_dev.sh"
    // LTD credentials
    user_ci = credentials('lsst-io')
    LTD_USERNAME="${user_ci_USR}"
    LTD_PASSWORD="${user_ci_PSW}"
  }
  stages {
    stage("Run tests") {
      when {
        anyOf {
          branch "main"
          branch "develop"
          branch "bugfix/*"
          branch "hotfix/*"
          branch "release/*"
          branch "tickets/*"
          branch "PR-*"
        }
      }
      steps {
        script {
          sh "docker build -f docker/Dockerfile-test -t nightly-digest-frontend-test  ."
          sh "docker run nightly-digest-frontend-test"
        }
      }
    }
  }
}
