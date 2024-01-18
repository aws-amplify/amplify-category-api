declare -a regions=( 'us-east-1' 'us-east-2' 'us-west-2' 'eu-west-2' 'eu-central-1' 'ap-northeast-1' 'ap-southeast-1' 'ap-southeast-2') ## now loop through the above array
for region in "${regions[@]}"
do
   echo "Deleting all the RDS instances in $region"
   aws rds describe-db-instances --region $region \
    --query 'DBInstances[*].[DBInstanceIdentifier]' \
    --output text | xargs -I {} \
      aws rds delete-db-instance \
         --region $region \
         --db-instance-identifier {} \
         --skip-final-snapshot \
         --query 'DBInstance.DBInstanceIdentifier' \
         --no-delete-automated-backups \
         --output text | xargs -I {} \
      echo "--- Deleting DB instance" {}
done
