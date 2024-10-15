"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplifyDatabase = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_rds_1 = require("aws-cdk-lib/aws-rds");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const DEFAULT_DATABASE_NAME = 'amplify';
class AmplifyDatabase extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.stack = aws_cdk_lib_1.Stack.of(scope);
        // TODO: pass secrets to database cluster
        const dataApiSecret = this.createDatabaseSecret('dataapi');
        const consoleSecret = this.createDatabaseSecret('console');
        const databaseCluster = this.createDatabaseCluster(props);
        this.resources = {
            databaseCluster,
            dataApiSecret,
            consoleSecret,
        };
        if (!databaseCluster.secret) {
            throw new Error('Database cluster does not have an admin secret.');
        }
        this.dataSourceStrategy = {
            name: 'AmplifyDatabaseDataSourceStrategy',
            dbType: props.dbType,
            dbConnectionConfig: {
                // use admin secret
                secretArn: databaseCluster.secret.secretArn,
                // TODO: get correct port
                port: 5000,
                databaseName: DEFAULT_DATABASE_NAME,
                hostname: databaseCluster.clusterEndpoint.hostname,
            },
            vpcConfiguration: {
                vpcId: databaseCluster.vpc.vpcId,
                // TODO: how to fix this
                // @ts-expect-error protected property
                securityGroupIds: databaseCluster.securityGroups.map((securityGroup) => securityGroup.securityGroupId),
                subnetAvailabilityZoneConfig: databaseCluster.vpc.publicSubnets,
            },
        };
    }
    createDatabaseSecret(username) {
        // TODO: is this ok with BGDs?
        // should it be with SecretsManager directly?
        return new aws_rds_1.DatabaseSecret(this, `AmplifyDatabaseSecret-${username}`, {
            username,
        });
    }
    createDatabaseCluster(props) {
        return new aws_rds_1.DatabaseCluster(this, 'AmplifyDatabaseCluster', {
            engine: this.getDatabaseClusterEngine(props.dbType),
            writer: aws_rds_1.ClusterInstance.provisioned('writer', {
                instanceType: aws_ec2_1.InstanceType.of(aws_ec2_1.InstanceClass.R6G, aws_ec2_1.InstanceSize.XLARGE4),
            }),
            enableDataApi: true,
            defaultDatabaseName: DEFAULT_DATABASE_NAME,
            vpc: props.vpc,
        });
    }
    getDatabaseClusterEngine(dbType) {
        switch (dbType) {
            case 'MYSQL':
                return aws_rds_1.DatabaseClusterEngine.AURORA_MYSQL;
            case 'POSTGRES':
                return aws_rds_1.DatabaseClusterEngine.AURORA_POSTGRESQL;
            default:
                throw new Error(`Unsupported database type: ${dbType}`);
        }
    }
}
exports.AmplifyDatabase = AmplifyDatabase;
_a = JSII_RTTI_SYMBOL_1;
AmplifyDatabase[_a] = { fqn: "@aws-amplify/database-construct.AmplifyDatabase", version: "0.0.1" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1kYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbXBsaWZ5LWRhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQUFvQztBQUNwQyxpREFBOEg7QUFDOUgsaURBQWdGO0FBSWhGLE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDO0FBRXhDLE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQWE1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTJCO1FBQ25FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU3Qix5Q0FBeUM7UUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFNBQVMsR0FBRztZQUNmLGVBQWU7WUFDZixhQUFhO1lBQ2IsYUFBYTtTQUNkLENBQUM7UUFFRixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHO1lBQ3hCLElBQUksRUFBRSxtQ0FBbUM7WUFDekMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLGtCQUFrQixFQUFFO2dCQUNsQixtQkFBbUI7Z0JBQ25CLFNBQVMsRUFBRSxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVM7Z0JBQzNDLHlCQUF5QjtnQkFDekIsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsWUFBWSxFQUFFLHFCQUFxQjtnQkFDbkMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUTthQUNuRDtZQUNELGdCQUFnQixFQUFFO2dCQUNoQixLQUFLLEVBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLO2dCQUNoQyx3QkFBd0I7Z0JBQ3hCLHNDQUFzQztnQkFDdEMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUM7Z0JBQ3RHLDRCQUE0QixFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsYUFBYTthQUNoRTtTQUNGLENBQUM7SUFDSixDQUFDO0lBRU8sb0JBQW9CLENBQUMsUUFBZ0I7UUFDM0MsOEJBQThCO1FBQzlCLDZDQUE2QztRQUM3QyxPQUFPLElBQUksd0JBQWMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLFFBQVEsRUFBRSxFQUFFO1lBQ25FLFFBQVE7U0FDVCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8scUJBQXFCLENBQUMsS0FBMkI7UUFDdkQsT0FBTyxJQUFJLHlCQUFlLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ3pELE1BQU0sRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUNuRCxNQUFNLEVBQUUseUJBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO2dCQUM1QyxZQUFZLEVBQUUsc0JBQVksQ0FBQyxFQUFFLENBQUMsdUJBQWEsQ0FBQyxHQUFHLEVBQUUsc0JBQVksQ0FBQyxPQUFPLENBQUM7YUFDdkUsQ0FBQztZQUNGLGFBQWEsRUFBRSxJQUFJO1lBQ25CLG1CQUFtQixFQUFFLHFCQUFxQjtZQUMxQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sd0JBQXdCLENBQUMsTUFBYztRQUM3QyxRQUFRLE1BQU0sRUFBRSxDQUFDO1lBQ2YsS0FBSyxPQUFPO2dCQUNWLE9BQU8sK0JBQXFCLENBQUMsWUFBWSxDQUFDO1lBQzVDLEtBQUssVUFBVTtnQkFDYixPQUFPLCtCQUFxQixDQUFDLGlCQUFpQixDQUFDO1lBQ2pEO2dCQUNFLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNILENBQUM7O0FBakZILDBDQWtGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgU3RhY2sgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDbHVzdGVySW5zdGFuY2UsIERhdGFiYXNlQ2x1c3RlciwgRGF0YWJhc2VDbHVzdGVyRW5naW5lLCBEYXRhYmFzZVNlY3JldCwgSUNsdXN0ZXJFbmdpbmUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcbmltcG9ydCB7IEluc3RhbmNlVHlwZSwgSW5zdGFuY2VDbGFzcywgSW5zdGFuY2VTaXplIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgdHlwZSB7IFNRTExhbWJkYU1vZGVsRGF0YVNvdXJjZVN0cmF0ZWd5IH0gZnJvbSAnQGF3cy1hbXBsaWZ5L2dyYXBocWwtYXBpLWNvbnN0cnVjdCc7XG5pbXBvcnQgdHlwZSB7IEFtcGxpZnlEYXRhYmFzZVByb3BzLCBBbXBsaWZ5RGF0YWJhc2VSZXNvdXJjZXMsIERCVHlwZSB9IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBERUZBVUxUX0RBVEFCQVNFX05BTUUgPSAnYW1wbGlmeSc7XG5cbmV4cG9ydCBjbGFzcyBBbXBsaWZ5RGF0YWJhc2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogUmVmZXJlbmNlIHRvIHBhcmVudCBzdGFjayBvZiBkYXRhYmFzZSBjb25zdHJ1Y3RcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBzdGFjazogU3RhY2s7XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlZCBMMSBhbmQgTDIgQ0RLIHJlc291cmNlcy5cbiAgICovXG4gIHB1YmxpYyByZWFkb25seSByZXNvdXJjZXM6IEFtcGxpZnlEYXRhYmFzZVJlc291cmNlcztcblxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YVNvdXJjZVN0cmF0ZWd5OiBTUUxMYW1iZGFNb2RlbERhdGFTb3VyY2VTdHJhdGVneTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQW1wbGlmeURhdGFiYXNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIHRoaXMuc3RhY2sgPSBTdGFjay5vZihzY29wZSk7XG5cbiAgICAvLyBUT0RPOiBwYXNzIHNlY3JldHMgdG8gZGF0YWJhc2UgY2x1c3RlclxuICAgIGNvbnN0IGRhdGFBcGlTZWNyZXQgPSB0aGlzLmNyZWF0ZURhdGFiYXNlU2VjcmV0KCdkYXRhYXBpJyk7XG4gICAgY29uc3QgY29uc29sZVNlY3JldCA9IHRoaXMuY3JlYXRlRGF0YWJhc2VTZWNyZXQoJ2NvbnNvbGUnKTtcbiAgICBjb25zdCBkYXRhYmFzZUNsdXN0ZXIgPSB0aGlzLmNyZWF0ZURhdGFiYXNlQ2x1c3Rlcihwcm9wcyk7XG5cbiAgICB0aGlzLnJlc291cmNlcyA9IHtcbiAgICAgIGRhdGFiYXNlQ2x1c3RlcixcbiAgICAgIGRhdGFBcGlTZWNyZXQsXG4gICAgICBjb25zb2xlU2VjcmV0LFxuICAgIH07XG5cbiAgICBpZiAoIWRhdGFiYXNlQ2x1c3Rlci5zZWNyZXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGF0YWJhc2UgY2x1c3RlciBkb2VzIG5vdCBoYXZlIGFuIGFkbWluIHNlY3JldC4nKTtcbiAgICB9XG4gICAgdGhpcy5kYXRhU291cmNlU3RyYXRlZ3kgPSB7XG4gICAgICBuYW1lOiAnQW1wbGlmeURhdGFiYXNlRGF0YVNvdXJjZVN0cmF0ZWd5JyxcbiAgICAgIGRiVHlwZTogcHJvcHMuZGJUeXBlLFxuICAgICAgZGJDb25uZWN0aW9uQ29uZmlnOiB7XG4gICAgICAgIC8vIHVzZSBhZG1pbiBzZWNyZXRcbiAgICAgICAgc2VjcmV0QXJuOiBkYXRhYmFzZUNsdXN0ZXIuc2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgLy8gVE9ETzogZ2V0IGNvcnJlY3QgcG9ydFxuICAgICAgICBwb3J0OiA1MDAwLFxuICAgICAgICBkYXRhYmFzZU5hbWU6IERFRkFVTFRfREFUQUJBU0VfTkFNRSxcbiAgICAgICAgaG9zdG5hbWU6IGRhdGFiYXNlQ2x1c3Rlci5jbHVzdGVyRW5kcG9pbnQuaG9zdG5hbWUsXG4gICAgICB9LFxuICAgICAgdnBjQ29uZmlndXJhdGlvbjoge1xuICAgICAgICB2cGNJZDogZGF0YWJhc2VDbHVzdGVyLnZwYy52cGNJZCxcbiAgICAgICAgLy8gVE9ETzogaG93IHRvIGZpeCB0aGlzXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgcHJvdGVjdGVkIHByb3BlcnR5XG4gICAgICAgIHNlY3VyaXR5R3JvdXBJZHM6IGRhdGFiYXNlQ2x1c3Rlci5zZWN1cml0eUdyb3Vwcy5tYXAoKHNlY3VyaXR5R3JvdXApID0+IHNlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkKSxcbiAgICAgICAgc3VibmV0QXZhaWxhYmlsaXR5Wm9uZUNvbmZpZzogZGF0YWJhc2VDbHVzdGVyLnZwYy5wdWJsaWNTdWJuZXRzLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVEYXRhYmFzZVNlY3JldCh1c2VybmFtZTogc3RyaW5nKTogRGF0YWJhc2VTZWNyZXQge1xuICAgIC8vIFRPRE86IGlzIHRoaXMgb2sgd2l0aCBCR0RzP1xuICAgIC8vIHNob3VsZCBpdCBiZSB3aXRoIFNlY3JldHNNYW5hZ2VyIGRpcmVjdGx5P1xuICAgIHJldHVybiBuZXcgRGF0YWJhc2VTZWNyZXQodGhpcywgYEFtcGxpZnlEYXRhYmFzZVNlY3JldC0ke3VzZXJuYW1lfWAsIHtcbiAgICAgIHVzZXJuYW1lLFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVEYXRhYmFzZUNsdXN0ZXIocHJvcHM6IEFtcGxpZnlEYXRhYmFzZVByb3BzKTogRGF0YWJhc2VDbHVzdGVyIHtcbiAgICByZXR1cm4gbmV3IERhdGFiYXNlQ2x1c3Rlcih0aGlzLCAnQW1wbGlmeURhdGFiYXNlQ2x1c3RlcicsIHtcbiAgICAgIGVuZ2luZTogdGhpcy5nZXREYXRhYmFzZUNsdXN0ZXJFbmdpbmUocHJvcHMuZGJUeXBlKSxcbiAgICAgIHdyaXRlcjogQ2x1c3Rlckluc3RhbmNlLnByb3Zpc2lvbmVkKCd3cml0ZXInLCB7XG4gICAgICAgIGluc3RhbmNlVHlwZTogSW5zdGFuY2VUeXBlLm9mKEluc3RhbmNlQ2xhc3MuUjZHLCBJbnN0YW5jZVNpemUuWExBUkdFNCksXG4gICAgICB9KSxcbiAgICAgIGVuYWJsZURhdGFBcGk6IHRydWUsXG4gICAgICBkZWZhdWx0RGF0YWJhc2VOYW1lOiBERUZBVUxUX0RBVEFCQVNFX05BTUUsXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGF0YWJhc2VDbHVzdGVyRW5naW5lKGRiVHlwZTogREJUeXBlKTogSUNsdXN0ZXJFbmdpbmUge1xuICAgIHN3aXRjaCAoZGJUeXBlKSB7XG4gICAgICBjYXNlICdNWVNRTCc6XG4gICAgICAgIHJldHVybiBEYXRhYmFzZUNsdXN0ZXJFbmdpbmUuQVVST1JBX01ZU1FMO1xuICAgICAgY2FzZSAnUE9TVEdSRVMnOlxuICAgICAgICByZXR1cm4gRGF0YWJhc2VDbHVzdGVyRW5naW5lLkFVUk9SQV9QT1NUR1JFU1FMO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBkYXRhYmFzZSB0eXBlOiAke2RiVHlwZX1gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==