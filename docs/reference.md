# 13. Decision matrix, glossary, and further reading

## Choose the pattern

| Situation | Recommended design |
| --- | --- |
| Public users log into an API-backed SaaS | Cognito User Pool + JWT verification + database authorization |
| ECS backend accesses S3 or Secrets Manager | ECS task IAM role with least-privilege policy; no Identity Pool required |
| Browser/mobile client must call AWS APIs directly | User Pool (or IdP) + Identity Pool + scoped IAM roles |
| Browser uploads files privately after authorization | FastAPI-issued S3 presigned URL is often simpler than Identity Pool |
| Staff need AWS console across accounts | IAM Identity Center / workforce federation |
| Complex application roles, tenants, dynamic conditions | Custom authorization layer or Amazon Verified Permissions |

## Mini glossary

**Principal:** authenticated requester, such as an assumed role session. **ARN:** identifier of an AWS resource or principal. **STS:** AWS service for temporary security credentials. **SigV4:** mechanism for signing AWS API requests. **JWT:** signed token carrying claims. **JWKS:** public keys used to verify signed JWTs. **OIDC:** authentication identity layer over OAuth 2.0. **PKCE:** protection for public-client OAuth code flows. **SCP:** organization-level maximum-permission guardrail. **ABAC:** authorization using attributes/tags.

## Official AWS documentation

### Cognito

- [Cognito developer guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [How Cognito authentication works](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html)
- [Connect User Pools to Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-integrating-user-pools-with-identity-pools.html)
- [Identity Pool role trust](https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html)
- [Verify Cognito JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)

### IAM and ECS

- [IAM concepts](https://docs.aws.amazon.com/IAM/latest/UserGuide/intro-structure.html)
- [IAM policy evaluation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [ECS task roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [ECS task execution role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
- [S3 policy example for Cognito](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_cognito-bucket.html)

### Application authorization

- [Amazon Verified Permissions](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/)

## Final mental model

- Cognito User Pool logs a person into your application.
- Cognito Identity Pool optionally maps that identity to temporary AWS role credentials.
- IAM authenticates AWS API callers and enforces permissions on AWS resources.
- Application authorization enforces who can access each project, document, or tenant. This is often a separate decision from IAM.

