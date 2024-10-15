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
            // TODO: set same as cluster
            dbType: 'MYSQL',
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
            }
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
        // TODO: set config
        return new aws_rds_1.DatabaseCluster(this, 'AmplifyDatabaseCluster', {
            engine: aws_rds_1.DatabaseClusterEngine.auroraMysql({ version: aws_rds_1.AuroraMysqlEngineVersion.VER_3_01_0 }),
            writer: aws_rds_1.ClusterInstance.provisioned('writer', {
                instanceType: aws_ec2_1.InstanceType.of(aws_ec2_1.InstanceClass.R6G, aws_ec2_1.InstanceSize.XLARGE4),
            }),
            serverlessV2MinCapacity: 6.5,
            serverlessV2MaxCapacity: 64,
            readers: [
                // will be put in promotion tier 1 and will scale with the writer
                aws_rds_1.ClusterInstance.serverlessV2('reader1', { scaleWithWriter: true }),
                // will be put in promotion tier 2 and will not scale with the writer
                aws_rds_1.ClusterInstance.serverlessV2('reader2'),
            ],
            defaultDatabaseName: DEFAULT_DATABASE_NAME,
            vpc: props.vpc,
        });
    }
}
exports.AmplifyDatabase = AmplifyDatabase;
_a = JSII_RTTI_SYMBOL_1;
AmplifyDatabase[_a] = { fqn: "@aws-amplify/database-construct.AmplifyDatabase", version: "0.0.1" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1kYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbXBsaWZ5LWRhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQUFvQztBQUNwQyxpREFBd0k7QUFDeEksaURBQWdGO0FBSWhGLE1BQU0scUJBQXFCLEdBQUcsU0FBUyxDQUFDO0FBRXhDLE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQWE1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTJCO1FBQ25FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU3Qix5Q0FBeUM7UUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFNBQVMsR0FBRztZQUNmLGVBQWU7WUFDZixhQUFhO1lBQ2IsYUFBYTtTQUNkLENBQUM7UUFFRixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHO1lBQ3hCLElBQUksRUFBRSxtQ0FBbUM7WUFDekMsNEJBQTRCO1lBQzVCLE1BQU0sRUFBRSxPQUFPO1lBQ2Ysa0JBQWtCLEVBQUU7Z0JBQ2xCLG1CQUFtQjtnQkFDbkIsU0FBUyxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsU0FBUztnQkFDM0MseUJBQXlCO2dCQUN6QixJQUFJLEVBQUUsSUFBSTtnQkFDVixZQUFZLEVBQUUscUJBQXFCO2dCQUNuQyxRQUFRLEVBQUUsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRO2FBQ25EO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCLEtBQUssRUFBRSxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUs7Z0JBQ2hDLHdCQUF3QjtnQkFDeEIsc0NBQXNDO2dCQUN0QyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQztnQkFDdEcsNEJBQTRCLEVBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxhQUFhO2FBQ2hFO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUFnQjtRQUMzQyw4QkFBOEI7UUFDOUIsNkNBQTZDO1FBQzdDLE9BQU8sSUFBSSx3QkFBYyxDQUFDLElBQUksRUFBRSx5QkFBeUIsUUFBUSxFQUFFLEVBQUU7WUFDbkUsUUFBUTtTQUNULENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxLQUEyQjtRQUN2RCxtQkFBbUI7UUFDbkIsT0FBTyxJQUFJLHlCQUFlLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ3pELE1BQU0sRUFBRSwrQkFBcUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQXdCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDM0YsTUFBTSxFQUFFLHlCQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtnQkFDNUMsWUFBWSxFQUFFLHNCQUFZLENBQUMsRUFBRSxDQUFDLHVCQUFhLENBQUMsR0FBRyxFQUFFLHNCQUFZLENBQUMsT0FBTyxDQUFDO2FBQ3ZFLENBQUM7WUFDRix1QkFBdUIsRUFBRSxHQUFHO1lBQzVCLHVCQUF1QixFQUFFLEVBQUU7WUFDM0IsT0FBTyxFQUFFO2dCQUNQLGlFQUFpRTtnQkFDakUseUJBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDO2dCQUNsRSxxRUFBcUU7Z0JBQ3JFLHlCQUFlLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQzthQUN4QztZQUNELG1CQUFtQixFQUFFLHFCQUFxQjtZQUMxQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDOztBQS9FSCwwQ0FnRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRGF0YWJhc2VDbHVzdGVyLCBBdXJvcmFNeXNxbEVuZ2luZVZlcnNpb24sIERhdGFiYXNlQ2x1c3RlckVuZ2luZSwgQ2x1c3Rlckluc3RhbmNlLCBEYXRhYmFzZVNlY3JldCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0IHsgSW5zdGFuY2VUeXBlLCBJbnN0YW5jZUNsYXNzLCBJbnN0YW5jZVNpemUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB0eXBlIHsgU1FMTGFtYmRhTW9kZWxEYXRhU291cmNlU3RyYXRlZ3kgfSBmcm9tICdAYXdzLWFtcGxpZnkvZ3JhcGhxbC1hcGktY29uc3RydWN0JztcbmltcG9ydCB7IEFtcGxpZnlEYXRhYmFzZVByb3BzLCBBbXBsaWZ5RGF0YWJhc2VSZXNvdXJjZXMgfSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgREVGQVVMVF9EQVRBQkFTRV9OQU1FID0gJ2FtcGxpZnknO1xuXG5leHBvcnQgY2xhc3MgQW1wbGlmeURhdGFiYXNlIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqXG4gICAqIFJlZmVyZW5jZSB0byBwYXJlbnQgc3RhY2sgb2YgZGF0YWJhc2UgY29uc3RydWN0XG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgc3RhY2s6IFN0YWNrO1xuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZWQgTDEgYW5kIEwyIENESyByZXNvdXJjZXMuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzb3VyY2VzOiBBbXBsaWZ5RGF0YWJhc2VSZXNvdXJjZXM7XG5cbiAgcHVibGljIHJlYWRvbmx5IGRhdGFTb3VyY2VTdHJhdGVneTogU1FMTGFtYmRhTW9kZWxEYXRhU291cmNlU3RyYXRlZ3k7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFtcGxpZnlEYXRhYmFzZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLnN0YWNrID0gU3RhY2sub2Yoc2NvcGUpO1xuXG4gICAgLy8gVE9ETzogcGFzcyBzZWNyZXRzIHRvIGRhdGFiYXNlIGNsdXN0ZXJcbiAgICBjb25zdCBkYXRhQXBpU2VjcmV0ID0gdGhpcy5jcmVhdGVEYXRhYmFzZVNlY3JldCgnZGF0YWFwaScpO1xuICAgIGNvbnN0IGNvbnNvbGVTZWNyZXQgPSB0aGlzLmNyZWF0ZURhdGFiYXNlU2VjcmV0KCdjb25zb2xlJyk7XG4gICAgY29uc3QgZGF0YWJhc2VDbHVzdGVyID0gdGhpcy5jcmVhdGVEYXRhYmFzZUNsdXN0ZXIocHJvcHMpO1xuXG4gICAgdGhpcy5yZXNvdXJjZXMgPSB7XG4gICAgICBkYXRhYmFzZUNsdXN0ZXIsXG4gICAgICBkYXRhQXBpU2VjcmV0LFxuICAgICAgY29uc29sZVNlY3JldCxcbiAgICB9O1xuXG4gICAgaWYgKCFkYXRhYmFzZUNsdXN0ZXIuc2VjcmV0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RhdGFiYXNlIGNsdXN0ZXIgZG9lcyBub3QgaGF2ZSBhbiBhZG1pbiBzZWNyZXQuJyk7XG4gICAgfVxuICAgIHRoaXMuZGF0YVNvdXJjZVN0cmF0ZWd5ID0ge1xuICAgICAgbmFtZTogJ0FtcGxpZnlEYXRhYmFzZURhdGFTb3VyY2VTdHJhdGVneScsXG4gICAgICAvLyBUT0RPOiBzZXQgc2FtZSBhcyBjbHVzdGVyXG4gICAgICBkYlR5cGU6ICdNWVNRTCcsXG4gICAgICBkYkNvbm5lY3Rpb25Db25maWc6IHtcbiAgICAgICAgLy8gdXNlIGFkbWluIHNlY3JldFxuICAgICAgICBzZWNyZXRBcm46IGRhdGFiYXNlQ2x1c3Rlci5zZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICAvLyBUT0RPOiBnZXQgY29ycmVjdCBwb3J0XG4gICAgICAgIHBvcnQ6IDUwMDAsXG4gICAgICAgIGRhdGFiYXNlTmFtZTogREVGQVVMVF9EQVRBQkFTRV9OQU1FLFxuICAgICAgICBob3N0bmFtZTogZGF0YWJhc2VDbHVzdGVyLmNsdXN0ZXJFbmRwb2ludC5ob3N0bmFtZSxcbiAgICAgIH0sXG4gICAgICB2cGNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHZwY0lkOiBkYXRhYmFzZUNsdXN0ZXIudnBjLnZwY0lkLFxuICAgICAgICAvLyBUT0RPOiBob3cgdG8gZml4IHRoaXNcbiAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvciBwcm90ZWN0ZWQgcHJvcGVydHlcbiAgICAgICAgc2VjdXJpdHlHcm91cElkczogZGF0YWJhc2VDbHVzdGVyLnNlY3VyaXR5R3JvdXBzLm1hcCgoc2VjdXJpdHlHcm91cCkgPT4gc2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQpLFxuICAgICAgICBzdWJuZXRBdmFpbGFiaWxpdHlab25lQ29uZmlnOiBkYXRhYmFzZUNsdXN0ZXIudnBjLnB1YmxpY1N1Ym5ldHMsXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VTZWNyZXQodXNlcm5hbWU6IHN0cmluZyk6IERhdGFiYXNlU2VjcmV0IHtcbiAgICAvLyBUT0RPOiBpcyB0aGlzIG9rIHdpdGggQkdEcz9cbiAgICAvLyBzaG91bGQgaXQgYmUgd2l0aCBTZWNyZXRzTWFuYWdlciBkaXJlY3RseT9cbiAgICByZXR1cm4gbmV3IERhdGFiYXNlU2VjcmV0KHRoaXMsIGBBbXBsaWZ5RGF0YWJhc2VTZWNyZXQtJHt1c2VybmFtZX1gLCB7XG4gICAgICB1c2VybmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VDbHVzdGVyKHByb3BzOiBBbXBsaWZ5RGF0YWJhc2VQcm9wcyk6IERhdGFiYXNlQ2x1c3RlciB7XG4gICAgLy8gVE9ETzogc2V0IGNvbmZpZ1xuICAgIHJldHVybiBuZXcgRGF0YWJhc2VDbHVzdGVyKHRoaXMsICdBbXBsaWZ5RGF0YWJhc2VDbHVzdGVyJywge1xuICAgICAgZW5naW5lOiBEYXRhYmFzZUNsdXN0ZXJFbmdpbmUuYXVyb3JhTXlzcWwoeyB2ZXJzaW9uOiBBdXJvcmFNeXNxbEVuZ2luZVZlcnNpb24uVkVSXzNfMDFfMCB9KSxcbiAgICAgIHdyaXRlcjogQ2x1c3Rlckluc3RhbmNlLnByb3Zpc2lvbmVkKCd3cml0ZXInLCB7XG4gICAgICAgIGluc3RhbmNlVHlwZTogSW5zdGFuY2VUeXBlLm9mKEluc3RhbmNlQ2xhc3MuUjZHLCBJbnN0YW5jZVNpemUuWExBUkdFNCksXG4gICAgICB9KSxcbiAgICAgIHNlcnZlcmxlc3NWMk1pbkNhcGFjaXR5OiA2LjUsXG4gICAgICBzZXJ2ZXJsZXNzVjJNYXhDYXBhY2l0eTogNjQsXG4gICAgICByZWFkZXJzOiBbXG4gICAgICAgIC8vIHdpbGwgYmUgcHV0IGluIHByb21vdGlvbiB0aWVyIDEgYW5kIHdpbGwgc2NhbGUgd2l0aCB0aGUgd3JpdGVyXG4gICAgICAgIENsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ3JlYWRlcjEnLCB7IHNjYWxlV2l0aFdyaXRlcjogdHJ1ZSB9KSxcbiAgICAgICAgLy8gd2lsbCBiZSBwdXQgaW4gcHJvbW90aW9uIHRpZXIgMiBhbmQgd2lsbCBub3Qgc2NhbGUgd2l0aCB0aGUgd3JpdGVyXG4gICAgICAgIENsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ3JlYWRlcjInKSxcbiAgICAgIF0sXG4gICAgICBkZWZhdWx0RGF0YWJhc2VOYW1lOiBERUZBVUxUX0RBVEFCQVNFX05BTUUsXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICB9KTtcbiAgfVxufVxuIl19