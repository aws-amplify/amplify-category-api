#!/bin/bash
set -eu

scriptdir=$(cd $(dirname $0) && pwd)
cd $scriptdir

python3 -m venv .venv
source .venv/bin/activate

pip install --no-cache-dir -r requirements.txt --force

# Use pylint to check for unimportable modules, typos, etc
(cd ../streaming-lambda && pylint -E *.py)