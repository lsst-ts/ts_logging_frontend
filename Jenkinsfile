pipeline {
  options {
    disableConcurrentBuilds()
  }

  agent any

  environment {
    dockerImageName = "rubincr.lsst.org/nightlydigest-frontend:"
    dockerImage = ""
  }

  stages {
    stage("Run pre-commit hooks and tests") {
      agent{
        docker {
          alwaysPull true
          image 'lsstts/develop-env:develop'
          args "--entrypoint=''"
        }
      }
      steps {
        script {
          sh """
            source /home/saluser/.setup_dev.sh

            npm install
            pre-commit run --all-files

            npm install vitest
            npx vitest run --run --no-color --reporter=verbose
          """
        }
      }
    }
    stage("Run e2e tests") {
      agent{
        docker {
          alwaysPull true
          image 'lsstts/develop-env:develop'
          args "--entrypoint=''"
        }
      }
      steps {
        script {
          sh """
            source /home/saluser/.setup_dev.sh
            npx playwright install chromium
            npm run test:e2e -- --reporter=list
          """
        }
      }
    }

    stage("Build Docker image") {
      when {
        anyOf {
          branch "develop"
        }
      }
      steps {
        script {
          image_tag = "develop"
          dockerImageName = dockerImageName + image_tag
          echo "dockerImageName: ${dockerImageName}"
          dockerImage = docker.build(dockerImageName, "-f docker/Dockerfile-deploy .")
        }
      }
    }
    
    stage("Push Docker image") {
      when {
        anyOf {
          branch "develop"
        }
      }
      steps {
        script {
          docker.withRegistry("https://rubincr.lsst.org/", "nexus3-lsst_jenkins") {
            dockerImage.push()
          }
        }
      }
    }
  }
}
