#!/bin/bash

custom_registry_url=http://localhost:4873
default_verdaccio_package=verdaccio@5.1.2

function startLocalRegistry {
    # Start local registry
    tmp_registry_log="$(mktemp)"
    echo "Registry output file: $tmp_registry_log"
    (cd && nohup npx "${VERDACCIO_PACKAGE:-$default_verdaccio_package}" -c $1 &>"${tmp_registry_log}" &)
    # Wait for Verdaccio to boot
    grep -q 'http address' <(tail -f "${tmp_registry_log}")
}

function setNpmTag {
    if [ -z $NPM_TAG ]; then
        if [[ "$BRANCH_NAME" =~ ^tagged-release ]]; then
            if [[ "$BRANCH_NAME" =~ ^tagged-release-without-e2e-tests\/.* ]]; then
                export NPM_TAG="${BRANCH_NAME/tagged-release-without-e2e-tests\//}"
            elif [[ "$BRANCH_NAME" =~ ^tagged-release\/.* ]]; then
                export NPM_TAG="${BRANCH_NAME/tagged-release\//}"
            fi
        fi
        if [[ "$BRANCH_NAME" == "beta" ]]; then
            export NPM_TAG="beta"
        fi
    else
        echo "NPM tag was already set!"
    fi
    echo $NPM_TAG
}

function unsetNpmRegistryUrl {
    # Restore the original NPM and Yarn registry URLs
    npm set registry "https://registry.npmjs.org/"
    yarn config set registry "https://registry.npmjs.org/"
}

function unsetSudoNpmRegistryUrl {
    # Restore the original NPM and Yarn registry URLs
    sudo npm set registry "https://registry.npmjs.org/"
    sudo yarn config set registry "https://registry.npmjs.org/"
}

function changeNpmGlobalPath {
    mkdir -p ~/.npm-global
    npm config set prefix '~/.npm-global'
    export PATH=~/.npm-global/bin:$PATH
}

function changeSudoNpmGlobalPath {
    mkdir -p ~/.npm-global-sudo
    npm config set prefix '~/.npm-global-sudo'
    export PATH=~/.npm-global/bin:$PATH
}

function setNpmRegistryUrlToLocal {
    # Set registry to local registry
    echo "Setting custom NPM registry: $custom_registry_url."
    npm set registry "$custom_registry_url"
    yarn config set registry "$custom_registry_url"
}

function setSudoNpmRegistryUrlToLocal {
    # Set registry to local registry
    sudo npm set registry "$custom_registry_url"
    sudo yarn config set registry "$custom_registry_url"
}