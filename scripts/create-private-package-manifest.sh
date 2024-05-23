#!/bin/bash

# set exit on error to true
set -e

# create a new file to store the private packages
# this will be imported and used in the Git Client to determine the packages to deprecate

echo 'export default [' > scripts/components/private_packages.ts
grep -l packages/*/package.json -e '"private": "\?true"\?' | xargs cat | jq .name | tr -s '\n' ',' >> scripts/components/private_packages.ts 
echo '];' >> scripts/components/private_packages.ts
