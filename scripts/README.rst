This folder contains **python** scripts utilities for managing the `ts_logging_frontend` project.

#######
Scripts
#######

---------------
make_release.py
---------------

A simple Python command-line tool to arrange releases for `ts_logging_frontend`.
It generates release notes using towncrier, updates package.json metadata, and creates a git tag.
To use this script, run the following command:

::
    
    python make_release.py -v <new_version>
