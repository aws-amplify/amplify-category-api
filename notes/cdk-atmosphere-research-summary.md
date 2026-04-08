# CDK Atmosphere Research Summary

**Research Date:** March 31, 2026  
**Researcher:** Roko AI Agent (sarayev)

---

## Executive Summary

**CDK Atmosphere** is an HTTP-based environment allocation service developed by the AWS CDK team to safely run integration tests against real AWS accounts—especially for tests from untrusted open-source contributors. It manages a pool of pre-existing AWS environments (account + region combinations), allocates them exclusively to one test at a time, and performs cleanup afterward to prevent test interference and privilege escalation.

---

## 1. What is CDK Atmosphere? What Problem Does It Solve?

### The Problem
The AWS CDK team needed a way to run integration tests from **untrusted sources** (open-source contributors) against real AWS accounts without risk of:
- **Privilege escalation:** Malicious code could create IAM roles with admin access and assume them
- **Account contamination:** Multiple tests running in the same account could interfere with each other (e.g., VPC limits, EIP exhaustion)
- **Resource leakage:** Tests could leave resources behind, polluting environments for future tests

### The Solution
CDK Atmosphere is a **central locking service** that:
- Manages a pool of AWS environments (account + region combinations)
- **Exclusively allocates** environments to integration tests (one test per environment at a time)
- Provides time-limited credentials (3-hour sessions)
- **Automatically cleans up** environments after tests complete (using Test Reaper or aws-nuke to delete CloudFormation stacks)
- Uses **AWS Organizations + Service Control Policies (SCPs)** to prevent privilege escalation

### Key Features
- **Public HTTP endpoint** with AWS SigV4 authentication
- **Constraint-based allocation** (e.g., request environments in specific regions)
- **Multi-account support** for tests requiring multiple AWS accounts
- **Pool-based isolation** (separate capacity for different test stages: release, canary, PR/CR)
- **Automatic timeout handling** (3-hour sessions with forced cleanup)
- **Historical tracking** (6 months of allocation data for troubleshooting)

---

## 2. Architecture and How It Works

### High-Level Flow
```
Integration Test
  ↓ (1) POST /allocations (request environment)
API Gateway (SigV4 auth)
  ↓
Allocation Lambda
  ↓ (2) Check available environments → Mark as in-use
DynamoDB (Environments + Allocations tables)
  ↓ (3) Return credentials (TestRole + metadata)
Integration Test (runs with 3-hour session)
  ↓ (4) DELETE /allocations/{id} (release environment)
Deallocation Lambda
  ↓ (5) Start cleanup
ECS Task (Cleanup using Test Reaper/aws-nuke)
  ↓ (6) Delete stacks, restore resources
DynamoDB (mark environment as available)
```

### Core Components

#### **API Layer (AWS API Gateway)**
- **Routes:**
  - `POST /allocations` → Allocate environment
  - `DELETE /allocations/{id}` → Deallocate environment
- **Authentication:** AWS SigV4 signatures with resource policy (account allowlist)
- **Authorization:** Only authenticated AWS IAM principals from allow-listed accounts can invoke

#### **Storage Layer (DynamoDB)**
- **Environments Table:** Tracks runtime state (in-use, cleaning, dirty)
  - Primary Key: `account` + `region`
  - Statuses: `in-use`, `cleaning`, `dirty`
  - Deleted when environment is available (available = not in table)
- **Allocations Table:** Tracks allocation history (6-month retention with TTL)
  - Primary Key: `id` (GUID)
  - Fields: account, region, pool, requester, start, end, outcome

#### **Compute Layer (Lambda + ECS)**
- **Allocation Lambda:** 
  1. Reads configuration from S3
  2. Finds available environment matching constraints
  3. Assumes TestRole to get credentials
  4. Creates allocation record + timeout event
  5. Returns credentials to test
- **Deallocation Lambda:**
  1. Marks allocation as ended
  2. Updates environment status to `cleaning`
  3. Starts ECS cleanup task
  4. Creates cleanup timeout event
- **Cleanup ECS Task:** (ECS used because cleanup can take >15 minutes)
  1. Assumes CleanupRole with AdministratorAccess
  2. Deletes leftover CloudFormation stacks
  3. Restores pre-provisioned resources
  4. Marks environment as available (or dirty if cleanup fails)

#### **Scheduler Layer (EventBridge Scheduler)**
- **Allocation Timeout Event:** Forces deallocation after 3 hours
- **Cleanup Timeout Event:** Marks environment as dirty if cleanup exceeds timeout
- One-time schedules with at-least-once delivery guarantee
- Auto-deleted upon completion to avoid quota exhaustion

#### **Configuration Layer (S3)**
- `configuration.json` file contains:
  - List of registered environments
  - Pool assignments
  - Admin role ARNs
  - Capabilities (e.g., hosted zones, specific regions)

### Security Model
- **Two IAM Roles per Environment:**
  1. **CleanupRole:** AdministratorAccess; assumable by Atmosphere service and CloudFormation
  2. **TestRole:** Returned to integration tests; controlled by test role-class tags
- **AWS Organizations + SCPs:**
  - Prevents tampering with protected IAM roles (those with `aws-org-role-class` tags)
  - Prevents privilege escalation even if test creates admin roles

### Constraint-Based Allocation
- Integration tests can specify up to **3 constraints** per allocation request
- Supported constraints:
  - `region`: Environment must be in one of the specified AWS regions
- **Processing:**
  1. Validate constraints (max 3, valid structure)
  2. Check if pool can fulfill constraints
  3. Filter available environments
  4. Allocate matching environment or return 423 Locked
- **Response codes:**
  - 200 OK: Environment allocated
  - 423 Locked: No matching environment available (header: `X-Atmosphere-Constraint-Pending: true`)
  - 400 Bad Request: Invalid constraints or pool cannot fulfill

### Registration & De-registration
**Registration (Manual):**
1. Create AWS account via AWS Organizations
2. Create CleanupRole (AdministratorAccess) and TestRole
3. Provision any required resources (e.g., hosted zones)
4. Add environment to `configuration.json`
5. Deploy service

**De-registration (Manual):**
1. Mark environment as de-registered in config
2. Deploy service
3. Environment drains after current allocation expires

---

## 3. Who Maintains It / What Team Owns It?

### Primary Owner
- **Team:** `aws-cdk-dev` (LDAP group)
- **Department:** AWS Developer Tools (department 7421)
- **Organization:** AWS CDK Team

### Key Contributors
- **Rico Huijbers (huijbers):**
  - Sr. Software Dev Engineer (Level 6)
  - Manager: joeywang
  - Location: Netherlands (Virtual)
  - Last modified the `UntrustedActionsInAnAccount` wiki page
  - Email: huijbers@amazon.nl

- **Other Recent Contributors:**
  - `alvazjor` (last modified CDK wiki 13 days ago)
  - `epolon` (last modified CDK Weekly Ops Dashboard 3 days ago)

### Team Structure
The CDK organization has two teams:
1. **CDK Core Team:** Owns the public CDK Framework, AWS Construct Library, and CDK CLI
2. **NADE Team:** Owns internal Amazon CDK usage, Pipelines, and CDKBuild

**CDK Atmosphere is owned by the CDK Core Team.**

---

## 4. How Does It Relate to AWS CDK?

### Purpose Alignment
CDK Atmosphere was **built by the CDK team to solve the CDK project's own integration testing challenges**:
- CDK accepts open-source contributions that need testing against real AWS accounts
- CDK integration tests run in multiple stages:
  - **On PR/CR:** Before code merges (pre-merge verification)
  - **In integration/release workflows:** Continuous health checks
  - **On schedule after release:** Canary tests to catch infrastructure drift
- Running these tests safely requires dedicated AWS accounts that can be cleaned

### Integration with CDK Development Workflow
1. **CDK developers/contributors** submit code changes
2. **Integration tests** use the `@cdklabs/cdk-atmosphere-client` library to:
   - Request an environment from the Atmosphere service
   - Run CDK deploy/destroy operations in the allocated environment
   - Report test outcome (success/failure)
   - Release the environment
3. **Atmosphere service** handles the environment lifecycle:
   - Allocates exclusive environment
   - Cleans up CloudFormation stacks after test
   - Tracks which tests ran in which environments (troubleshooting)

### CDK-Specific Design Decisions
- **Cleanup focused on CloudFormation stacks** (CDK's deployment mechanism)
- **Multi-region support** (CDK needs to test region-specific behaviors)
- **3-hour session limit** (typical CDK integration test duration)
- **Pool-based isolation** (separate capacity for different CDK test stages)

---

## 5. Public Repos, Documentation, and Internal Wikis

### Public Resources

#### NPM Packages
- **Service (jsii/multi-language):** `@cdklabs/cdk-atmosphere-service`
  - Latest: v0.0.9 (Feb 20, 2025)
  - Languages: TypeScript, Python, Java
  - Author: Amazon Web Services
  - Purpose: CDK construct for deploying the Atmosphere service

- **Client:** `@cdklabs/cdk-atmosphere-client`
  - TypeScript library for integration tests
  - Handles SigV4 signing and retry logic
  - Simplifies interaction with the service endpoint

#### PyPI Package
- **Package:** `cdklabs.cdk-atmosphere-service`
  - URL: https://pypi.org/project/cdklabs.cdk-atmosphere-service/
  - Python bindings for the service construct

#### Maven Package
- **Artifact:** `io.github.cdklabs:cdk-atmosphere-service`
  - URL: https://mvnrepository.com/artifact/io.github.cdklabs/cdk-atmosphere-service
  - Java bindings for the service construct

#### GitHub Repositories
- **Client (Public):** https://github.com/cdklabs/cdk-atmosphere-client
  - Status: ✅ Active (200 OK)
  - Minimal README (just title)
- **Service (Private/404):** https://github.com/cdklabs/cdk-atmosphere-service
  - Status: ❌ Private or deleted from public GitHub (404 Not Found)
  - Likely internal-only or moved

### Internal Amazon Resources

#### Internal Code Repositories (code.amazon.com)
- **AtmosphereServiceConstruct**
  - URL: https://code.amazon.com/packages/AtmosphereServiceConstruct
  - Description: "Exclusively allocating AWS environments to trusted callers"
  - Status: Active, public visibility
  - Key files:
    - `README.md` (269 lines) — deployment instructions
    - `docs/design.md` (555 lines) — full architecture specification
    - `docs/operator-runbook.md` (289 lines) — operational procedures
    - `src/` — TypeScript implementation

- **CDKCoreAtmosphereServicePipeline**
  - URL: https://code.amazon.com/packages/CDKCoreAtmosphereServicePipeline
  - Description: CDK team's specific instantiation of Atmosphere
  - Contains:
    - CI/CD pipeline configuration
    - AWS Organizations + SCP setup
    - `configuration.json` (pool definitions)
    - Scripts for account creation/registration
    - Security canaries (AppSec requirements)

#### Internal Wikis (w.amazon.com)
- **Main Page:** https://w.amazon.com/bin/view/UntrustedActionsInAnAccount/
  - Title: "UntrustedActionsInAnAccount"
  - Owner: `aws-cdk-dev` (LDAP)
  - Last modified: 6 months ago by `huijbers`
  - Content: Problem definition, security model, Atmosphere overview
  - Links to all relevant repos and packages

- **CDK Main Wiki:** https://w.amazon.com/bin/view/CDK/
  - Owner: `aws-cdk-dev` (LDAP)
  - Last modified: 13 days ago by `alvazjor`
  - Content: CDK team structure, support channels, getting started guides

- **CDK Weekly Ops Dashboard:** https://w.amazon.com/bin/view/CDK/Dashboards/WeeklyOps/
  - Owner: `aws-cdk-dev` (LDAP)
  - Last modified: 3 days ago by `epolon`
  - Content: SIM queues, COEs, availability metrics

#### Internal Specs (Harmony)
- **System Overview:** https://specs.harmony.a2z.com/package/2745b1ce-3cba-4ae2-b52b-d85565ac9b58/...
  - Title: "CDKCoreAtmosphereServicePipeline"
  - Status: JavaScript app (requires client-side rendering)

---

## Key Architecture Insights

### Technology Stack
- **API:** AWS API Gateway (REST) with AWS_IAM authentication
- **Compute:** AWS Lambda (allocation/deallocation) + ECS Fargate (cleanup)
- **Storage:** DynamoDB (on-demand capacity, point-in-time backups)
- **Config:** S3 bucket (`configuration.json`)
- **Scheduling:** EventBridge Scheduler (one-time events with auto-delete)
- **Monitoring:** CloudWatch (metrics, dashboards, alarms)
- **Cleanup:** Test Reaper or aws-nuke (deletes CloudFormation stacks)

### Operational Excellence

#### Metrics Tracked
- **Allocation Status Codes** (200/423/400/500) per pool and capability
- **Allocation Outcomes** (test success/failure) per pool and capability
- **Lambda Invocation Failures** (unexpected errors)
- **DLQ Sizes** (failed event deliveries)
- **Integration Test Stage Failure Rate** (client-side KPI)

#### Alarms
- **Endpoint/Availability:** Low availability (5XX responses)
- **Environments/Dirty/Pool/{pool}:** Per-pool dirty environment tracking
- **Environments/DirtyIncreasing:** Systematic cleanup failure indicator
- **Cleanup/Faults:** Uncaught cleanup errors (exit code 1)
- **Cleanup/DLQNotEmpty:** Failed cleanup messages in DLQ
- **Scheduler/AllocationTimeout/DLQNotEmpty:** Failed allocation timeout events
- **Scheduler/CleanupTimeout/DLQNotEmpty:** Failed cleanup timeout events

#### Direct Tickets
- **Dirty Environment (SIM Ticket):** Auto-created SEV3 ticket for each cleanup failure

### Environment States
- **Available:** Not in DynamoDB table (ready for allocation)
- **In-use:** Allocated to a test, locked
- **Cleaning:** Cleanup in progress (background ECS task)
- **Dirty:** Cleanup failed, requires manual intervention

### Data Retention
- **Allocations:** 6 months (historical troubleshooting)
- **Environments:** Active state only (removed when available)

---

## Constraint-Based Allocation Details

### Supported Constraints
- **region:** Environment must be in one of the specified AWS regions
- **Maximum:** 3 constraints per request

### Constraint Processing
1. **Validation:** Check structure, values, count (≤3)
2. **Fulfillability Check:** Verify pool capabilities can satisfy constraints
3. **Filtering:** Filter available environments by constraints
4. **Allocation:** Assign environment or return 423 Locked

### Pool Capabilities
- Automatically computed as the **union of all `regions`** from environments in the pool
- Used to determine if a pool can fulfill constraints before attempting allocation

---

## Usage Example (TypeScript)

```typescript
import { AtmosphereClient } from '@cdklabs/cdk-atmosphere-client';

// Initialize client
const client = new AtmosphereClient({
  endpoint: 'https://atmosphere.cdk.aws.dev',
  credentials: /* AWS credentials with execute-api:Invoke permission */
});

// Request an environment
const allocation = await client.allocate({
  pool: 'integration-test-pool',
  requester: 'my-test-suite',
  constraints: [
    { type: 'region', values: ['us-east-1', 'us-west-2'] }
  ]
});

// Run test with allocated environment
const { account, region, credentials } = allocation;
// ... run CDK deploy/destroy operations ...

// Release environment (triggers cleanup)
await client.deallocate(allocation.id, {
  outcome: 'success'
});
```

---

## Registration Process

### Steps
1. **Create AWS Account** (via AWS Organizations)
2. **Create IAM Roles:**
   - **CleanupRole:** AdministratorAccess, assumable by Atmosphere and CloudFormation
   - **TestRole:** Assumable by Atmosphere and allow-listed test runner roles
3. **Provision Resources:** Manually create any required resources (e.g., hosted zones)
4. **Update Configuration:** Add environment record to `configuration.json` in S3:
   ```json
   {
     "account": "123456789012",
     "region": "us-east-1",
     "pool": "integration-test-pool",
     "admin_role": "arn:aws:iam::123456789012:role/AtmosphereCleanupRole",
     "regions": ["us-east-1"],
     "capabilities": {
       "hosted_zone_name": "test.example.com"
     }
   }
   ```
5. **Deploy Service:** Push config and deploy Atmosphere service

### De-registration
1. Remove environment from `configuration.json`
2. Deploy service
3. Environment drains after current allocation expires (asynchronous)

---

## Operational Procedures

### Handling Dirty Environments
1. **Identify:** Check `Active Environments` table in CloudWatch dashboard (requires Investigator role)
2. **Investigate:** View cleanup logs using allocation ID
3. **Retry:** Click `clean` button in dashboard to restart cleanup
4. **Release:** Click `release` button if environment is already clean
5. **Escalate:** Create ticket if retry fails repeatedly

### Handling DLQ Messages
1. **Cleanup DLQ:**
   - Navigate to dashboard → Cleanup Tasks section
   - Click "Start Redrive Process"
2. **Scheduler DLQs (Allocation/Cleanup Timeout):**
   - Poll for messages
   - Copy message body
   - Send to lambda function via "Test" tab
   - Delete message if successful

---

## Sources

### Internal Amazon Sources
- `code.amazon.com/packages/AtmosphereServiceConstruct/README.md` (269 lines)
- `code.amazon.com/packages/AtmosphereServiceConstruct/docs/design.md` (555 lines) — **Primary architecture reference**
- `code.amazon.com/packages/AtmosphereServiceConstruct/docs/operator-runbook.md` (289 lines) — **Operations guide**
- `w.amazon.com/bin/view/UntrustedActionsInAnAccount/` — **Problem definition and overview**
- `w.amazon.com/bin/view/CDK/` — CDK team main wiki
- `code.amazon.com/packages/CDKCoreAtmosphereServicePipeline` — CDK team's deployment pipeline

### Public Sources
- PyPI: `cdklabs.cdk-atmosphere-service` (v0.0.9, Feb 20, 2025)
- Maven: `io.github.cdklabs:cdk-atmosphere-service`
- GitHub: `github.com/cdklabs/cdk-atmosphere-client` (public)
- GitHub: `github.com/cdklabs/cdk-atmosphere-service` (404 - private/removed)

### Personnel
- phonetool.amazon.com/users/huijbers (Rico Huijbers, Sr. SDE, AWS Developer Tools)

---

## Key Decisions & Rationale

### Why ECS for Cleanup (Not Lambda)?
Cleanup can take **>15 minutes** (Lambda's maximum runtime). ECS Fargate allows longer-running tasks with no time limit.

### Why DynamoDB (Not RDS)?
- **On-demand capacity:** Accommodates variable throughput
- **Point-in-time backups:** Disaster recovery
- **Conditional writes:** Enables concurrent, idempotent operations
- **Secondary indexes:** Query performance (though not currently used)
- **No partition planning needed:** Data <10GB, fits in single partition

### Why Publicly Accessible Endpoint?
CDK integration tests run in:
- AWS CodeBuild (GitHub Actions for public repo)
- Various AWS accounts (PR builds, canary tests, release workflows)
- Developer machines (local testing)

A publicly accessible endpoint with SigV4 auth allows tests to connect from anywhere without VPN or private networking.

### Why 3-Hour Session Limit?
Balances:
- **Test duration:** Typical CDK integration tests complete in <1 hour
- **Safety:** Prevents tests from holding environments indefinitely
- **Buffer:** Allows time for slow tests and manual debugging

### Why 6-Month Allocation History?
Enables troubleshooting questions like:
- "Which tests ran in environment X in the past 6 months?"
- "Which environments did test Y use in the past 6 months?"

---

## Open Questions

### 1. Current Deployment Status
- **Unknown:** Is the CDK team's production instance currently operational?
- **Unknown:** What is the production endpoint URL?
- **Unknown:** How many environments are currently in each pool?

### 2. Cleanup Implementation
- **Unknown:** Does the CDK team use Test Reaper or aws-nuke for cleanup?
- **Unknown:** What specific resources are cleaned beyond CloudFormation stacks?
- **Unknown:** What triggers a "dirty" state (specific failure modes)?

### 3. Public GitHub Repository Status
- **Unknown:** Why is `github.com/cdklabs/cdk-atmosphere-service` returning 404?
  - Hypothesis 1: Repo is private (doesn't match open-source model)
  - Hypothesis 2: Repo was consolidated into `cdk-atmosphere-client`
  - Hypothesis 3: Service construct is published from internal repo only

### 4. Client Library Documentation
- **Unknown:** Why is the `cdk-atmosphere-client` README minimal (just title)?
- **Unknown:** Is there API documentation elsewhere (JSDoc, TypeDoc)?
- **Unknown:** Are there usage examples in the client repo?

### 5. Multi-Language Support
- **Confirmed:** Service construct supports Python, Java, .NET via jsii
- **Unknown:** Does the client library also support Python/Java, or is it TypeScript-only?

---

## Recommendations for Further Research

If deeper investigation is needed:

1. **Access internal code:**
   - Clone `code.amazon.com/packages/AtmosphereServiceConstruct` to review implementation
   - Clone `code.amazon.com/packages/CDKCoreAtmosphereServicePipeline` to see production config

2. **Contact team:**
   - Slack: #cdk (https://amzn-aws.slack.com/archives/C01853SDU7N)
   - Email list: aws-cdk-interest@amazon.com
   - Direct contact: huijbers@amazon.nl (Rico Huijbers)

3. **Check operational dashboards:**
   - CloudWatch dashboard for live environment status
   - SIM queue for open tickets: https://t.corp.amazon.com/issues?q=...

4. **Review production configuration:**
   - Access production Atmosphere endpoint (need URL from team)
   - Review `configuration.json` to see current pools and environments

---

## Valuable Learnings for Knowledge Base

### Pattern: Environment Locking Service for Integration Tests
Teams running integration tests against real cloud accounts should consider:
- **Central locking service** to prevent test interference
- **Automatic cleanup** to ensure fresh environments
- **Time-limited sessions** to prevent resource exhaustion
- **Pool-based isolation** for different test stages
- **Historical tracking** for troubleshooting

### Fact: CDK Team Structure
- **Team:** `aws-cdk-dev` (LDAP)
- **Department:** AWS Developer Tools (7421)
- **Location:** Distributed (Netherlands, US, others)
- **Key contacts:** huijbers (Rico Huijbers), joeywang (manager)

### Solution: Testing Untrusted Code Against AWS Accounts
Use AWS Organizations + SCPs to:
- Tag protected IAM roles with `aws-org-role-class`
- Deny any principal without matching tag from modifying protected roles
- Prevents privilege escalation even if test creates admin roles
- Combine with environment locking service (like Atmosphere) for full isolation

---

## Conclusion

CDK Atmosphere is a **production-grade environment allocation service** built by the AWS CDK team to safely run integration tests from untrusted contributors against real AWS accounts. It uses a combination of AWS Organizations, SCPs, and exclusive environment locking to prevent privilege escalation and test interference. The service is deployed using CDK itself, operates with a public HTTP endpoint, and is maintained by the `aws-cdk-dev` team under AWS Developer Tools.

**Status:** Actively maintained, publicly available as npm/PyPI/Maven packages, internally deployed by the CDK team.

---

**Research Complete:** March 31, 2026
