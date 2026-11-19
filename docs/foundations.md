# 1. Authentication and authorization

**Authentication (AuthN)** establishes an identity: who is making the request? **Authorization (AuthZ)** decides whether that identity may perform a particular action on a particular resource under the current conditions.

| Question | Application example | AWS example |
| --- | --- | --- |
| Authentication | Is this the person who signed in? | Which IAM role signed this S3 request? |
| Authorization | Can this user edit Project 42? | Can this principal call `s3:GetObject` on this key? |
| Credential | Cognito JWT access or ID token | SigV4-signed request using AWS credentials |
| Decision source | API scopes, app roles, project membership | IAM and resource policies plus guardrails |

The distinction is not simply “Cognito authenticates; IAM authorizes.” IAM also authenticates AWS requests, and Cognito can issue groups and scopes used as authorization inputs.

## Ask which resource is being accessed

If the browser calls your API to read a PostgreSQL row, the backend must decide whether the user can read that row. If the backend calls S3, IAM decides whether the backend's AWS role can read the object. Those are separate checks.

| Layer | Identity or policy | Enforcer |
| --- | --- | --- |
| User authentication | Password, passkey, federation, MFA, JWT claims | Cognito User Pool or identity provider |
| API entrance | JWT signature, issuer, expiry, client, scopes | API Gateway or FastAPI middleware |
| Business authorization | Project role, ownership, tenant, subscription | Backend or Verified Permissions |
| AWS infrastructure access | S3, Secrets Manager, SQS, DynamoDB actions | AWS service using IAM |

## Who uses which identity service?

| Identity | Typical consumer | What it provides |
| --- | --- | --- |
| Cognito User Pool | Public/customer-facing app users | Sign-up, sign-in, federation, MFA, tokens, groups |
| Cognito Identity Pool | App users who need direct AWS access | Exchanges identity evidence for temporary AWS credentials |
| IAM role | AWS workloads and federated principals | Temporary AWS principal with trust rules and policies |
| IAM user | Exceptional programmatic or legacy cases | Long-lived identity; generally avoid long-term access keys |
| IAM Identity Center | Workforce and AWS console users | Workforce SSO/federation into AWS accounts and apps |

When an SDK sends a request to S3, it normally signs the request with Signature Version 4 (SigV4). AWS identifies the principal (often an assumed role session), then evaluates permissions. An IAM role has no permanent password or access key; AWS STS-backed sessions provide short-lived credentials. A Cognito User Pool JWT is a bearer token for application identity or OAuth-protected APIs, not an AWS access key.

Engineers entering the AWS console should normally use IAM Identity Center or workforce federation. Cognito is generally for application consumers; Identity Center is generally for the organization's workforce.

