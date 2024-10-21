#!/bin/bash

TEMP_FILE=dependency_licenses_temp.txt
DEST_FILE=dependency_licenses.txt

set -e

yarn licenses generate-disclaimer \
    --ignore-platform \
    --ignore-engines \
    --ignore-optional \
    --silent \
    --no-progress \
    --frozen-lockfile > $TEMP_FILE

if [[ ! -s $TEMP_FILE ]] ; then
    echo "Error processing dependencies" >&2
    exit 1
fi

sed \
    -e '/WORKSPACE AGGREGATOR/d' \
    -e '/workspace-aggregator/d' \
    $TEMP_FILE > $DEST_FILE

rm $TEMP_FILE
