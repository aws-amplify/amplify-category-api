#!/bin/bash

yarn licenses generate-disclaimer \
    --ignore-platform \
    --ignore-engines \
    --ignore-optional \
    --silent \
    --no-progress \
    --frozen-lockfile > dependency_licenses_temp.txt

sed \
    -e '/WORKSPACE AGGREGATOR/d' \
    -e '/workspace-aggregator/d' \
    dependency_licenses_temp.txt > dependency_licenses.txt

rm dependency_licenses_temp.txt
