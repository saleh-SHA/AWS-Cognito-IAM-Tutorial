# Chapter 1: The boundary in 60 seconds

*The correct mental model*

The distinction is not simply “Cognito authenticates, IAM authorises.” That is a useful starting point, but it misses how each system can contribute to both.

**Authentication** answers “Who are you, and how was your identity proved?” **Authorisation** answers “Is this principal allowed to perform this action on this resource, under these conditions?”

<div class="flow">
  <div class="flow-step"><b>App user</b><span>Signs in with Cognito</span></div>
  <div class="flow-step"><b>App/API</b><span>Validates JWT + applies product rules</span></div>
  <div class="flow-step"><b>AWS workload</b><span>Uses IAM role credentials</span></div>
  <div class="flow-step"><b>AWS resource</b><span>IAM allows or denies</span></div>
</div>
<p class="figure-caption">Typical architecture: two separate authorisation boundaries.</p>

| Question | Primary mechanism | Why |
| --- | --- | --- |
| Can Alice sign in to our SaaS? | Cognito **User Pool** | Customer identity, login, MFA and tokens |
| Can Alice open Project 42? | **Application authorisation** | Your product’s membership and ownership rules |
| Can our FastAPI container read an S3 object? | **IAM task role** | AWS sees the container’s AWS principal |
| Can Alice’s browser upload directly to her S3 prefix? | Cognito **Identity Pool + IAM** | Temporary AWS credentials scoped by a role |
| Can an engineer deploy ECS to production? | **IAM Identity Center + IAM** | Workforce sign-in and AWS account permissions |

!!! note "The crucial distinction"
    A Cognito JWT is generally an **application token**, not an AWS access key. An IAM role session supplies **temporary AWS credentials**, not a user-facing login screen. A Cognito Identity Pool is the bridge when a client needs AWS credentials.

**One sentence to remember:** Cognito manages app-user identity and token-based access; IAM governs AWS principals and permissions; your backend owns business-data authorisation unless you deliberately delegate specific checks to another system. [1](chapter-12.md#ref-1)[2](chapter-12.md#ref-2)[3](chapter-12.md#ref-3)

## 1.1 Walk through one request before learning any service names

Imagine that Alice opens a literature-review web application and clicks **Download report** for Project 42. Four separate facts must be established. First, Alice completed a sign-in process. Second, the access token presented to the API is valid and was intended for that API. Third, Alice is allowed to read Project 42. Fourth, the server process is allowed to fetch the corresponding object from S3. It is tempting to collapse these into “Alice has access”; doing so is the source of many security mistakes.

| Fact to prove | Evidence | Enforced where | If missing |
| --- | --- | --- | --- |
| A person signed in | Credentials, MFA and identity-provider session | Cognito User Pool | No usable application session |
| The API request presents a valid token | Signature, issuer, token type, expiry, app client and any required audience | FastAPI / gateway | 401 Unauthorized |
| Alice may view Project 42 | Project membership, tenant, role and business rules | FastAPI / authorisation service / database | 403 Forbidden (or a deliberate 404) |
| Server may fetch object | IAM task-role session, S3 policy and relevant KMS permissions | AWS service | AWS AccessDenied; backend maps safely to an API error |

Notice that the same HTTP request can succeed at the first three steps and still fail at AWS IAM. Conversely, an ECS task can have broad S3 permissions while the user making the API call has no right to see a particular project. **Infrastructure permissions do not substitute for product permissions.**

## 1.2 Two planes of security

A practical way to visualise the distinction is to draw two planes. The **application plane** identifies product users and authorises product actions such as adding reviewers or downloading a document. The **AWS control/data plane** identifies an AWS principal and authorises service API actions such as `s3:GetObject`, `secretsmanager:GetSecretValue` or `ecs:UpdateService`.

<div class="flow">
  <div class="flow-step"><b>Alice</b><span>Human app user</span></div>
  <div class="flow-step"><b>React</b><span>Bearer access token</span></div>
  <div class="flow-step"><b>FastAPI</b><span>Membership check</span></div>
  <div class="flow-step"><b>S3</b><span>AWS role check</span></div>
</div>
<p class="figure-caption">The request crosses two authorisation boundaries: product rules at FastAPI and AWS permissions at S3.</p>

!!! note "The question that draws the border line"
    Do not start with “Which service handles authorisation?” Instead ask: **Who is the caller of this exact operation, and what is the target resource?** For `GET /projects/42`, the caller is a product user and the resource is a project. For `s3:GetObject`, the caller is an AWS role session and the resource is an S3 object.

## 1.3 Why IAM really does authenticate

IAM is not an authorisation-only add-on. When an AWS SDK makes a request, it normally signs the HTTP request using Signature Version 4 and AWS credentials. The receiving AWS service validates that signature and resolves the principal represented by those credentials. Only then can it apply the relevant permissions. Signing establishes which AWS identity made the request; IAM policies and related controls decide whether that authenticated identity may perform the action.

A role is therefore **an assumable AWS identity**, not merely a JSON policy document. A trust policy establishes who can obtain a role session. AWS STS issues short-lived credentials for a session. AWS service requests made using those credentials are attributable to that session and evaluated under the applicable policies.

## 1.4 Three questions to ask for every architecture

1. **Who is authenticated?** A human customer, a corporate employee, a workload or another AWS account?

2. **What credential represents them?** Cognito JWT, IAM Identity Center session, SigV4 credentials, or an STS role session?

3. **What does the resource recognise?** Your FastAPI endpoint understands verified JWT claims; S3 understands signed AWS requests; PostgreSQL may be accessed using database credentials and must be scoped by your application.
