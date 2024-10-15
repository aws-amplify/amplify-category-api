"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmplifyDatabase = void 0;
const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AmplifyDatabase extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.stack = aws_cdk_lib_1.Stack.of(scope);
        console.log(props);
    }
}
exports.AmplifyDatabase = AmplifyDatabase;
_a = JSII_RTTI_SYMBOL_1;
AmplifyDatabase[_a] = { fqn: "@aws-amplify/database-construct.AmplifyDatabase", version: "0.0.1" };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1wbGlmeS1kYXRhYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9hbXBsaWZ5LWRhdGFiYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLDZDQUFvQztBQUdwQyxNQUFhLGVBQWdCLFNBQVEsc0JBQVM7SUFNNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEyQjtRQUNuRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsbUJBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQixDQUFDOztBQVZILDBDQVdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBTdGFjayB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEFtcGxpZnlEYXRhYmFzZVByb3BzIH0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBBbXBsaWZ5RGF0YWJhc2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICAvKipcbiAgICogUmVmZXJlbmNlIHRvIHBhcmVudCBzdGFjayBvZiBkYXRhYmFzZSBjb25zdHJ1Y3RcbiAgICovXG4gIHB1YmxpYyByZWFkb25seSBzdGFjazogU3RhY2s7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFtcGxpZnlEYXRhYmFzZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLnN0YWNrID0gU3RhY2sub2Yoc2NvcGUpO1xuICAgIGNvbnNvbGUubG9nKHByb3BzKTtcbiAgfVxufVxuIl19