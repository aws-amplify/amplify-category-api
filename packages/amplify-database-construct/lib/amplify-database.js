"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplifyDatabase = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_rds_1 = require("aws-cdk-lib/aws-rds");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
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
            vpc: props.vpc,
        });
    }
}
exports.AmplifyDatabase = AmplifyDatabase;
_a = JSII_RTTI_SYMBOL_1;
AmplifyDatabase[_a] = { fqn: "@aws-amplify/database-construct.AmplifyDatabase", version: "0.0.1" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1kYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbXBsaWZ5LWRhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQUFvQztBQUNwQyxpREFBd0k7QUFDeEksaURBQWdGO0FBR2hGLE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQVc1QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTJCO1FBQ25FLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxtQkFBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUU3Qix5Q0FBeUM7UUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFNBQVMsR0FBRztZQUNmLGVBQWU7WUFDZixhQUFhO1lBQ2IsYUFBYTtTQUNkLENBQUM7SUFDSixDQUFDO0lBRU8sb0JBQW9CLENBQUMsUUFBZ0I7UUFDM0MsOEJBQThCO1FBQzlCLDZDQUE2QztRQUM3QyxPQUFPLElBQUksd0JBQWMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLFFBQVEsRUFBRSxFQUFFO1lBQ25FLFFBQVE7U0FDVCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8scUJBQXFCLENBQUMsS0FBMkI7UUFDdkQsbUJBQW1CO1FBQ25CLE9BQU8sSUFBSSx5QkFBZSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUN6RCxNQUFNLEVBQUUsK0JBQXFCLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLGtDQUF3QixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNGLE1BQU0sRUFBRSx5QkFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7Z0JBQzVDLFlBQVksRUFBRSxzQkFBWSxDQUFDLEVBQUUsQ0FBQyx1QkFBYSxDQUFDLEdBQUcsRUFBRSxzQkFBWSxDQUFDLE9BQU8sQ0FBQzthQUN2RSxDQUFDO1lBQ0YsdUJBQXVCLEVBQUUsR0FBRztZQUM1Qix1QkFBdUIsRUFBRSxFQUFFO1lBQzNCLE9BQU8sRUFBRTtnQkFDUCxpRUFBaUU7Z0JBQ2pFLHlCQUFlLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDbEUscUVBQXFFO2dCQUNyRSx5QkFBZSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUM7YUFDeEM7WUFDRCxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDOztBQXBESCwwQ0FxREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRGF0YWJhc2VDbHVzdGVyLCBBdXJvcmFNeXNxbEVuZ2luZVZlcnNpb24sIERhdGFiYXNlQ2x1c3RlckVuZ2luZSwgQ2x1c3Rlckluc3RhbmNlLCBEYXRhYmFzZVNlY3JldCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0IHsgSW5zdGFuY2VUeXBlLCBJbnN0YW5jZUNsYXNzLCBJbnN0YW5jZVNpemUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IEFtcGxpZnlEYXRhYmFzZVByb3BzLCBBbXBsaWZ5RGF0YWJhc2VSZXNvdXJjZXMgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIEFtcGxpZnlEYXRhYmFzZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKlxuICAgKiBHZW5lcmF0ZWQgTDEgYW5kIEwyIENESyByZXNvdXJjZXMuXG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzb3VyY2VzOiBBbXBsaWZ5RGF0YWJhc2VSZXNvdXJjZXM7XG5cbiAgLyoqXG4gICAqIFJlZmVyZW5jZSB0byBwYXJlbnQgc3RhY2sgb2YgZGF0YWJhc2UgY29uc3RydWN0XG4gICAqL1xuICBwdWJsaWMgcmVhZG9ubHkgc3RhY2s6IFN0YWNrO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBbXBsaWZ5RGF0YWJhc2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG4gICAgdGhpcy5zdGFjayA9IFN0YWNrLm9mKHNjb3BlKTtcblxuICAgIC8vIFRPRE86IHBhc3Mgc2VjcmV0cyB0byBkYXRhYmFzZSBjbHVzdGVyXG4gICAgY29uc3QgZGF0YUFwaVNlY3JldCA9IHRoaXMuY3JlYXRlRGF0YWJhc2VTZWNyZXQoJ2RhdGFhcGknKTtcbiAgICBjb25zdCBjb25zb2xlU2VjcmV0ID0gdGhpcy5jcmVhdGVEYXRhYmFzZVNlY3JldCgnY29uc29sZScpO1xuICAgIGNvbnN0IGRhdGFiYXNlQ2x1c3RlciA9IHRoaXMuY3JlYXRlRGF0YWJhc2VDbHVzdGVyKHByb3BzKTtcblxuICAgIHRoaXMucmVzb3VyY2VzID0ge1xuICAgICAgZGF0YWJhc2VDbHVzdGVyLFxuICAgICAgZGF0YUFwaVNlY3JldCxcbiAgICAgIGNvbnNvbGVTZWNyZXQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VTZWNyZXQodXNlcm5hbWU6IHN0cmluZyk6IERhdGFiYXNlU2VjcmV0IHtcbiAgICAvLyBUT0RPOiBpcyB0aGlzIG9rIHdpdGggQkdEcz9cbiAgICAvLyBzaG91bGQgaXQgYmUgd2l0aCBTZWNyZXRzTWFuYWdlciBkaXJlY3RseT9cbiAgICByZXR1cm4gbmV3IERhdGFiYXNlU2VjcmV0KHRoaXMsIGBBbXBsaWZ5RGF0YWJhc2VTZWNyZXQtJHt1c2VybmFtZX1gLCB7XG4gICAgICB1c2VybmFtZSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VDbHVzdGVyKHByb3BzOiBBbXBsaWZ5RGF0YWJhc2VQcm9wcyk6IERhdGFiYXNlQ2x1c3RlciB7XG4gICAgLy8gVE9ETzogc2V0IGNvbmZpZ1xuICAgIHJldHVybiBuZXcgRGF0YWJhc2VDbHVzdGVyKHRoaXMsICdBbXBsaWZ5RGF0YWJhc2VDbHVzdGVyJywge1xuICAgICAgZW5naW5lOiBEYXRhYmFzZUNsdXN0ZXJFbmdpbmUuYXVyb3JhTXlzcWwoeyB2ZXJzaW9uOiBBdXJvcmFNeXNxbEVuZ2luZVZlcnNpb24uVkVSXzNfMDFfMCB9KSxcbiAgICAgIHdyaXRlcjogQ2x1c3Rlckluc3RhbmNlLnByb3Zpc2lvbmVkKCd3cml0ZXInLCB7XG4gICAgICAgIGluc3RhbmNlVHlwZTogSW5zdGFuY2VUeXBlLm9mKEluc3RhbmNlQ2xhc3MuUjZHLCBJbnN0YW5jZVNpemUuWExBUkdFNCksXG4gICAgICB9KSxcbiAgICAgIHNlcnZlcmxlc3NWMk1pbkNhcGFjaXR5OiA2LjUsXG4gICAgICBzZXJ2ZXJsZXNzVjJNYXhDYXBhY2l0eTogNjQsXG4gICAgICByZWFkZXJzOiBbXG4gICAgICAgIC8vIHdpbGwgYmUgcHV0IGluIHByb21vdGlvbiB0aWVyIDEgYW5kIHdpbGwgc2NhbGUgd2l0aCB0aGUgd3JpdGVyXG4gICAgICAgIENsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ3JlYWRlcjEnLCB7IHNjYWxlV2l0aFdyaXRlcjogdHJ1ZSB9KSxcbiAgICAgICAgLy8gd2lsbCBiZSBwdXQgaW4gcHJvbW90aW9uIHRpZXIgMiBhbmQgd2lsbCBub3Qgc2NhbGUgd2l0aCB0aGUgd3JpdGVyXG4gICAgICAgIENsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ3JlYWRlcjInKSxcbiAgICAgIF0sXG4gICAgICB2cGM6IHByb3BzLnZwYyxcbiAgICB9KTtcbiAgfVxufVxuIl19