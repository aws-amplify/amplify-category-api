#!/bin/bash

DST_FILE="aws-rds-global-bundle.pem"
rm -f "$DST_FILE"

declare -a CERTS

# Cert URLs from:
# - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.CertificatesAllRegions
# - https://www.amazontrust.com/repository/
#
# RDS global bundle is used to connect directly to clusters and/or instances
# Root certs are to connect to RDS Proxies
CERTS=(
https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
https://www.amazontrust.com/repository/AmazonRootCA1.pem
https://www.amazontrust.com/repository/AmazonRootCA2.pem
https://www.amazontrust.com/repository/AmazonRootCA3.pem
https://www.amazontrust.com/repository/AmazonRootCA4.pem
https://www.amazontrust.com/repository/SFSRootCAG2.pem
)

for cert in "${CERTS[@]}" ; do
  curl "$cert" >> "$DST_FILE"
done

