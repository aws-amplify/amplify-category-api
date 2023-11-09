#!/bin/bash

change_dependency_licenses=$(git status | grep dependency_licenses.txt | wc -l)

if [[ change_dependency_licenses -gt 0 ]]; then
  echo "Detected license change. Please run 'yarn extract-dependency-licenses' and add dependency_licenses.txt file changes to the change set."
  exit 1;
fi
