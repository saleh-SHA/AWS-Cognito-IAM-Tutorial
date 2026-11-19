# 1. The boundary: authentication is not the same as authorisation

Authentication (AuthN) establishes an identity: who is making the request? Authorisation (AuthZ) evaluates whether that identity can do a particular thing to a particular resource under the applicable conditions.

| Question | App-user example | AWS example |
| --- | --- | --- |
| Authentication | “Is this the person who signed in?” | “Which IAM role signed this S3 request?” |
| Authorisation | “Can this user edit Project 42?” | “Can this principal call `s3:GetObject` on this key?” |
| Credential | Cognito JWT access/ID token | SigV4-signed request using AWS credentials |
| Decision source | API scopes, app roles, project memberships | IAM/resource policies + guardrails |

The apparent overlap is real: both Cognito and IAM handle aspects of authentication and authorisation. The distinction is not “Cognito authenticates; IAM authorises.” That slogan is incomplete. IAM also authenticates AWS requests, while Cognito can carry groups and scopes that support authorisation.

> **The crucial boundary**\
> Ask what resource is actually being accessed. If the browser calls your API to read a PostgreSQL row, the backend must decide whether the user may read that row. If your backend calls S3, IAM decides whether the backend’s AWS role may read the object. Those are two different permission checks.

## A useful four-layer model

| Layer | Identity / policy | Enforcer |
| --- | --- | --- |
| 1. User authentication | Password, passkey, federation, MFA; JWT claims | Cognito User Pool / identity provider |
| 2. API entrance | JWT signature, issuer, expiry, audience/client ID, scopes | API Gateway or FastAPI middleware |
| 3. Business authorisation | Project roles, ownership, tenant, subscription | Backend / Verified Permissions |
| 4. AWS infrastructure access | S3, Secrets Manager, SQS, DynamoDB IAM actions | AWS service using IAM |

# 2. Who uses which AWS identity service?

| Identity | Typical consumer | What it provides |
| --- | --- | --- |
| Cognito User Pool | Public/customer-facing application users | Sign-up, sign-in, federation, MFA, tokens, groups |
| Cognito Identity Pool | Authenticated/guest app users needing AWS access | Exchange external/user-pool identity for temporary AWS credentials |
| IAM role | AWS workloads, services, federated principals | Temporary AWS principal with policies and trust rules |
| IAM user | Exceptional programmatic or legacy cases | Long-lived identity; generally avoid long-term access keys |
| IAM Identity Center | Workforce: engineers, analysts, AWS console users | Workforce SSO/federation into AWS accounts and apps |

## IAM authenticates as well

When an SDK sends a request to S3, it normally signs the request with Signature Version 4 (SigV4) using AWS credentials. AWS identifies/authenticates the principal (often an assumed role session), then evaluates permissions. An IAM role itself does not have a permanent password or access key; AWS STS-backed sessions supply short-lived credentials.

By contrast, a Cognito JWT is a bearer token for application identity or OAuth-protected APIs. An ordinary Cognito User Pool JWT is not an AWS access key. It cannot be used directly to sign an S3 request.

## Where IAM Identity Center fits

Engineers entering the AWS console should normally use IAM Identity Center or workforce federation, not a Cognito User Pool created for customer sign-in. Cognito is generally for your application’s consumers; Identity Center is generally for your organisation’s workforce.
