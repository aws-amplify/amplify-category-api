"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplifyDatabase = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_rds_1 = require("aws-cdk-lib/aws-rds");
class AmplifyDatabase extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.stack = aws_cdk_lib_1.Stack.of(scope);
        const databaseCluster = new aws_rds_1.DatabaseCluster(this, 'Database', {
            engine: aws_rds_1.DatabaseClusterEngine.auroraMysql({ version: aws_rds_1.AuroraMysqlEngineVersion.VER_3_01_0 }),
            writer: aws_rds_1.ClusterInstance.provisioned('writer', {
            // instanceType: InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE4),
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
        this.resources = {
            databaseCluster: databaseCluster,
        };
    }
}
exports.AmplifyDatabase = AmplifyDatabase;
_a = JSII_RTTI_SYMBOL_1;
AmplifyDatabase[_a] = { fqn: "@aws-amplify/database-construct.AmplifyDatabase", version: "0.0.1" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1kYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbXBsaWZ5LWRhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQUFvQztBQUNwQyxpREFBd0g7QUFHeEgsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBVzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLG1CQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdCLE1BQU0sZUFBZSxHQUFHLElBQUkseUJBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzVELE1BQU0sRUFBRSwrQkFBcUIsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQXdCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDM0YsTUFBTSxFQUFFLHlCQUFlLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtZQUM1QywwRUFBMEU7YUFDM0UsQ0FBQztZQUNGLHVCQUF1QixFQUFFLEdBQUc7WUFDNUIsdUJBQXVCLEVBQUUsRUFBRTtZQUMzQixPQUFPLEVBQUU7Z0JBQ1AsaUVBQWlFO2dCQUNqRSx5QkFBZSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQ2xFLHFFQUFxRTtnQkFDckUseUJBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO2FBQ3hDO1lBQ0QsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsR0FBRztZQUNmLGVBQWUsRUFBRSxlQUFlO1NBQ2pDLENBQUM7SUFDSixDQUFDOztBQWxDSCwwQ0FtQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFN0YWNrIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRGF0YWJhc2VDbHVzdGVyLCBBdXJvcmFNeXNxbEVuZ2luZVZlcnNpb24sIERhdGFiYXNlQ2x1c3RlckVuZ2luZSwgQ2x1c3Rlckluc3RhbmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XG5pbXBvcnQgeyBBbXBsaWZ5RGF0YWJhc2VQcm9wcywgQW1wbGlmeURhdGFiYXNlUmVzb3VyY2VzIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBBbXBsaWZ5RGF0YWJhc2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogR2VuZXJhdGVkIEwxIGFuZCBMMiBDREsgcmVzb3VyY2VzLlxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHJlc291cmNlczogQW1wbGlmeURhdGFiYXNlUmVzb3VyY2VzO1xuXG4gIC8qKlxuICAgKiBSZWZlcmVuY2UgdG8gcGFyZW50IHN0YWNrIG9mIGRhdGFiYXNlIGNvbnN0cnVjdFxuICAgKi9cbiAgcHVibGljIHJlYWRvbmx5IHN0YWNrOiBTdGFjaztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQW1wbGlmeURhdGFiYXNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIHRoaXMuc3RhY2sgPSBTdGFjay5vZihzY29wZSk7XG5cbiAgICBjb25zdCBkYXRhYmFzZUNsdXN0ZXIgPSBuZXcgRGF0YWJhc2VDbHVzdGVyKHRoaXMsICdEYXRhYmFzZScsIHtcbiAgICAgIGVuZ2luZTogRGF0YWJhc2VDbHVzdGVyRW5naW5lLmF1cm9yYU15c3FsKHsgdmVyc2lvbjogQXVyb3JhTXlzcWxFbmdpbmVWZXJzaW9uLlZFUl8zXzAxXzAgfSksXG4gICAgICB3cml0ZXI6IENsdXN0ZXJJbnN0YW5jZS5wcm92aXNpb25lZCgnd3JpdGVyJywge1xuICAgICAgICAvLyBpbnN0YW5jZVR5cGU6IEluc3RhbmNlVHlwZS5vZihJbnN0YW5jZUNsYXNzLlI2RywgSW5zdGFuY2VTaXplLlhMQVJHRTQpLFxuICAgICAgfSksXG4gICAgICBzZXJ2ZXJsZXNzVjJNaW5DYXBhY2l0eTogNi41LFxuICAgICAgc2VydmVybGVzc1YyTWF4Q2FwYWNpdHk6IDY0LFxuICAgICAgcmVhZGVyczogW1xuICAgICAgICAvLyB3aWxsIGJlIHB1dCBpbiBwcm9tb3Rpb24gdGllciAxIGFuZCB3aWxsIHNjYWxlIHdpdGggdGhlIHdyaXRlclxuICAgICAgICBDbHVzdGVySW5zdGFuY2Uuc2VydmVybGVzc1YyKCdyZWFkZXIxJywgeyBzY2FsZVdpdGhXcml0ZXI6IHRydWUgfSksXG4gICAgICAgIC8vIHdpbGwgYmUgcHV0IGluIHByb21vdGlvbiB0aWVyIDIgYW5kIHdpbGwgbm90IHNjYWxlIHdpdGggdGhlIHdyaXRlclxuICAgICAgICBDbHVzdGVySW5zdGFuY2Uuc2VydmVybGVzc1YyKCdyZWFkZXIyJyksXG4gICAgICBdLFxuICAgICAgdnBjOiBwcm9wcy52cGMsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlc291cmNlcyA9IHtcbiAgICAgIGRhdGFiYXNlQ2x1c3RlcjogZGF0YWJhc2VDbHVzdGVyLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==