This folder contains **python** scripts utilities for managing the `ts_logging_frontend` project.

#######
Scripts
#######

---------------
make_release.py
---------------

A simple Python command-line tool to arrange releases for `ts_logging_frontend`.
It generates release notes using towncrier, updates package.json metadata, and creates a git tag.
To use this script, run the following command from the root of the repository:

::

    python scripts/make_release.py -v <new_version>

Each step can be skipped, which is how ``docker/Dockerfile-deploy`` sets the version to ``develop`` without touching git:

- ``--no-version-check``: accept a version that is not semantic versioning.
- ``--no-release-notes``: skip building the release notes with towncrier.
- ``--no-package-json``: skip updating ``package.json``.
- ``--no-git``: skip the commits and the tag.

------------
gc-deploy.py
------------

A Python script to build the Scientific Nightly Digest and deploy it to Google Cloud Storage (see ``doc/snd.md``).
It supports cleaning the target bucket prefix, running the Vite build, and uploading the build output.
To use this script, run the following command from the root of the repository:

::

    python scripts/gc-deploy.py --bucket <bucket_name> --prefix <prefix> --build-dir <build_dir> --backend-url <backend_url>

Alternatively, you can run the script in dry-run mode to simulate the actions without making any changes:

::

    python scripts/gc-deploy.py --dry-run --bucket <bucket_name> --backend-url <backend_url>

Options to run specific steps are also provided (options can be combined):

- `--only-clean:` will only clean the remote GCS bucket.
- `--only-upload`: will only upload the static files without running any other step.

Arguments can be defined as environment variables:

- `GCS_BUCKET_NAME` for `--bucket`.
- `GCS_BUCKET_PREFIX` for `--prefix`.
- `BUILD_DIR` for `--build-dir`.
- `VITE_BACKEND_URL` for `--backend-url`.

**Note:**

- It is mandatory to define a bucket name either via the `--bucket` argument or the `GCS_BUCKET_NAME` environment variable.
- It is mandatory to define a backend url either via the `--backend-url` argument or the `VITE_BACKEND_URL` environment variable.
- The script needs the ``google-cloud-storage`` Python package.
- The script assumes Google Cloud CLI is installed and the user is authenticated with enough permissions to access the specified bucket. Check https://docs.cloud.google.com/sdk/docs/install-sdk for more information.
