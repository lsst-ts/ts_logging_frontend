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
  agent{
    docker {
      alwaysPull true
      image 'lsstts/develop-env:develop'
      args "--entrypoint=''"
    }
  }
  environment {
    dockerImage = ""
    // LTD credentials
    user_ci = credentials('lsst-io')
    LTD_USERNAME="${user_ci_USR}"
    LTD_PASSWORD="${user_ci_PSW}"
  }
  stages {
    stage("Run pre-commit hooks and tests") {
      steps {
        script {
          sh """
            source /home/saluser/.setup_dev.sh
            
            npm install
            pre-commit run --all-files
            
            npm install vitest
            npm run test
          """
        }
      }
    }
  }
}
