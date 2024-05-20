#!/bin/bash

echo 'export default [' > scripts/components/private_packages.ts
grep -l packages/*/package.json -e '"private": "\?true"\?' | xargs cat | jq .name | tr -s '\n' ',' >> scripts/components/private_packages.ts 
echo '];' >> scripts/components/private_packages.ts
