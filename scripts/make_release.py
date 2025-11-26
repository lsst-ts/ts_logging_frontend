import argparse
import json
import os
import re
import subprocess

from datetime import datetime


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VERSION_HISTORY_PATH = os.path.join(ROOT_DIR, "doc/version_history.rst")
PACKAGE_JSON_PATH = os.path.join(ROOT_DIR, "package.json")
PACKAGE_LOCK_PATH = os.path.join(ROOT_DIR, "package-lock.json")

# Semantic Versioning regex pattern
# Source:
# https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
SEMVER_REGEX = (
    r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
    r"(?:-(?P<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)"
    r"(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))"
    r"?(?:\+(?P<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
)


def run_towncrier_build(version: str):
    """Run the towncrier build command to generate release notes.

    Parameters
    ----------
    version : str
        The version string to set in the generated release notes.
    """

    # Build the release notes using towncrier
    subprocess.run(["towncrier", "build", "--yes", f"--version=v{version}"], check=True)

    # Stage and commit the generated changelog
    subprocess.run(["git", "add", VERSION_HISTORY_PATH], check=True)
    subprocess.run(["git", "commit", "-m", "Update the version history."], check=True)


def bump_package_json_metadata(version: str):
    """Update `version` and `lastUpdated` fields
    in the package.json file.

    Parameters
    ----------
    version : str
        The version string to set in package.json.
    """

    # Read the package.json file and convert to dict
    with open(PACKAGE_JSON_PATH, "r", encoding="utf-8") as f:
        package_json = f.read()
        package_data = json.loads(package_json)

    # Update the version and lastUpdated fields
    package_data["version"] = version
    package_data["lastUpdated"] = datetime.now().strftime("%Y-%m-%d")

    # Write the updated dict back to package.json
    with open(PACKAGE_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(package_data, f, indent=2)
        f.write("\n")

    # Update package-lock.json if needed
    subprocess.run(['npm', 'install', '--package-lock-only'])

    # Stage and commit the changes
    subprocess.run(["git", "add", PACKAGE_JSON_PATH, PACKAGE_LOCK_PATH], check=True)
    subprocess.run(["git", "commit", "-m", f"Bump package.json metadata for v{version}."], check=True)


def git_tag(version: str):
    """Create a git tag for the new version.

    Parameters
    ----------
    version : str
        The version string to tag.
    """
    subprocess.run([
        "git",
        "tag",
        "-a",
        f"v{version}",
        "-m",
        f"Release v{version}."
    ], check=True)


def check_version_format(version: str) -> bool:
    """Check if the provided version string matches semantic versioning.

    Parameters
    ----------

    version : str
        The version string to validate.
    """
    return re.match(SEMVER_REGEX, version) is not None


def main():
    parser = argparse.ArgumentParser(
        description=(
            "A simple Python command-line tool to arrange releases for ts_logging_frontend."
            " It generates release notes using towncrier, updates package.json metadata,"
            " and creates a git tag."
        )
    )
    parser.add_argument(
        "-v",
        "--version",
        type=str,
        help="The releasing version (just the number, without the v prefix)", required=True
    )

    args = parser.parse_args()

    if not check_version_format(args.version):
        raise ValueError(f"Version '{args.version}' is not in valid semantic versioning format.")

    run_towncrier_build(args.version)
    bump_package_json_metadata(args.version)
    git_tag(args.version)


if __name__ == "__main__":
    main()
