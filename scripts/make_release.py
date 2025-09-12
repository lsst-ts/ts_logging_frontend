import argparse
import json
import os
import subprocess

from datetime import datetime


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VERSION_HISTORY_PATH = os.path.join(ROOT_DIR, "doc/version_history.rst")
PACKAGE_JSON_PATH = os.path.join(ROOT_DIR, "package.json")


def run_towncrier_build(version: str):
    """Run the towncrier build command to generate release notes."""

    # Build the release notes using towncrier
    subprocess.run(["towncrier", "build", "--yes", f"--version=v{version}"], check=True)

    # Stage and commit the generated changelog
    subprocess.run(["git", "add", VERSION_HISTORY_PATH], check=True)
    subprocess.run(["git", "commit", "-m", "Update the version history."], check=True)


def bump_package_json_metadata(version: str):
    """Update `version` and `lastUpdated` fields
    in the package.json file."""

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

    # Stage and commit the changes
    subprocess.run(["git", "add", PACKAGE_JSON_PATH], check=True)
    subprocess.run(["git", "commit", "-m", f"Bump package.json metadata for v{version}."], check=True)


def git_tag(version: str):
    """Create a git tag for the new version."""
    subprocess.run([
        "git",
        "tag",
        "-a",
        f"v{version}",
        "-m",
        f"Release v{version}."
    ], check=True)


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

    # Parse arguments
    args = parser.parse_args()

    # Command logic
    run_towncrier_build(args.version)
    bump_package_json_metadata(args.version)
    git_tag(args.version)


if __name__ == "__main__":
    main()
