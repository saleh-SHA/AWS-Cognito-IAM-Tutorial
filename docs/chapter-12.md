# Chapter 12: Decision framework and knowledge check

*Select the right identity mechanism*

Use this page as a design-review shortcut.

## 12.1 Which mechanism should you choose?

If you need… | Start with… | Do not confuse it with…

Customer login, password reset, | Cognito User Pool | IAM users for all customers — MFA, social sign-in

Access-token scopes on your own | Cognito User Pool + JWT validation / | IAM S3 permissions — REST API                                       API authorizer

Project ownership and team | Backend RBAC/ABAC checks + | Token validity alone — membership                                     database

Browser calls S3 directly with SDK | Cognito Identity Pool + least- | User Pool alone — privilege IAM role

Backend ECS service reads S3 | ECS task IAM role | Identity Pool or client secrets

Engineer access to AWS accounts | IAM Identity Center + IAM roles | Customer User Pool

Service calls your business API | OAuth client credentials (if | AWS STS credentials — appropriate)

Service calls AWS API | Workload IAM role / STS | Cognito JWT

## 12.2 Quick knowledge check

Q1. Alice signs in with Cognito and receives an access token. Can she now call s3:ListBucket directly?

Q2. FastAPI checks Alice’s token and then reads S3. Which principal does S3 normally evaluate?

Q3. A role has s3:GetObject permission but cannot be assumed. Which policy might be wrong?

Q4. What protects Bob’s project from Alice when both users’ API tokens have projects/read ?

Q5. Where do temporary AWS access keys come from in the Identity Pool flow?

## 12.3 Answers

1. No. She needs AWS credentials authorised for that API; an Identity Pool can broker temporary IAM-role credentials.

2. The ECS task role (unless your system deliberately assumes another role or uses another credentials provider).

3. The trust policy and/or the calling principal’s permission to assume it.

4. Application-level resource checks (membership, owner and action) or an equivalent fine-grained authorisation system.

5. AWS STS, via the configured Identity Pool flow and the selected IAM role.

Final rule of thumb Ask three questions in order: (1) Who is calling? App user or AWS principal? (2) What is being called? Your API/business record or an AWS API? (3) Who makes the decision? Cognito token/API layer, your app policy, or IAM? This usually draws the boundary clearly.

## 12.4 Case study: select the right architecture

Scenario A - a React SaaS product. Users review papers, collaborate on projects, and upload PDFs. The backend is FastAPI on ECS and keeps metadata in PostgreSQL. Use a Cognito User Pool for user sign-in, FastAPI for JWT verification and project-level authorisation, and an ECS task role for AWS service calls. For uploads, prefer backend-authorised presigned URLs unless the client has a clear need for many direct AWS SDK operations.

Scenario B - a field data-collection mobile client. The app must upload many files directly to a single per- device/user prefix and may use other AWS APIs. An Identity Pool can be justified, with narrow authenticated role policies and strict negative tests. The product still needs its own permission model for shared workspaces.

Scenario C - an analyst deploying to AWS. The analyst is a company employee, not an application customer. Use IAM Identity Center/workforce federation and a role/permission set for the AWS account. Do not grant AWS-console access by adding them to a Cognito User Pool group.

## 12.5 Five worked exam questions

Question | Worked answer

A Cognito JWT is valid, but S3 denies GetObject. What is | If browser calls S3, it needs appropriate temporary AWS — missing?                                                       credentials and IAM permissions. If FastAPI calls S3, review the ECS task role and S3/KMS policies.

A role policy permits GetObject, but STS will not assume the | Permissions on the target role govern what a resulting — role. Why?                                                     session may do, not who may assume it. Examine trust and caller-side AssumeRole permission.

Alice can view a project; Bob gets 403 using the same API | Not necessarily. Application authorisation may correctly — endpoint. Is IAM misconfigured?                                deny Bob based on project membership, even though both tokens are valid.

Developer can pull an ECS image but boto3 cannot fetch a | Image pulls typically use execution role. Runtime boto3 — secret. Which role?                                            secret reads use task role; check its Secrets Manager and KMS access.

Question | Worked answer

Could Cognito groups replace all project memberships? | Usually not for many dynamic user/project relations. Use — app DB or dedicated fine-grained authorisation and treat groups as one coarse input.

## 12.6 The final three-minute explanation you should be able to give

Amazon Cognito User Pools authenticate users of an application, provide managed sign-in features and issue signed tokens. Cognito Identity Pools optionally map an authenticated or guest identity to a role session with temporary AWS credentials for direct AWS calls. AWS IAM manages AWS principals, trust relationships, permissions and the evaluation of AWS service operations. STS supplies temporary credentials for assumed roles and related federation flows. Your application remains responsible for its own business authorisation - which user or organisation may read, edit or delete which product resource.

Self-assessment: can you trace all four identities? For a React user downloading a private PDF through FastAPI on ECS, state: (1) the Cognito sub , (2) the access-token claims the API validates, (3) the database membership rule that authorises the project, and (4) the IAM task-role session that AWS S3 actually evaluates. If you can identify all four without mixing them, the Cognito/IAM boundary is clear.

## References and further reading

The following are official AWS documentation pages consulted for this tutorial. The bracketed numbers in the text refer to these sources. AWS changes services and console layouts regularly; verify your deployment details against the latest docs.

- <span id="ref-1"></span> [1] [What is Amazon Cognito?](https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html)

- <span id="ref-2"></span> [2] [What is IAM?](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)

- <span id="ref-3"></span> [3] [Using user pools with identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-integrating-user-pools-with-identity-pools.html)

- <span id="ref-4"></span> [4] [Verify JSON web tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)

- <span id="ref-5"></span> [5] [Using PKCE in authorisation code grants](https://docs.aws.amazon.com/cognito/latest/developerguide/using-pkce-in-authorization-code.html)

- <span id="ref-6"></span> [6] [Scopes, M2M and resource servers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html)

- <span id="ref-7"></span> [7] [Compare IAM identities and credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_identity-management.html)

- <span id="ref-8"></span> [8] [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html)

- <span id="ref-9"></span> [9] [Role trust policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-trust-policy.html)

- <span id="ref-10"></span> [10] [Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

- <span id="ref-11"></span> [11] [Cognito Identity Pools overview](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html)

- <span id="ref-12"></span> [12] [Cognito Identity Pools authentication flow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)

- <span id="ref-13"></span> [13] [S3 policy for Cognito identity-pool users](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_cognito-bucket.html)

- <span id="ref-14"></span> [14] [ECS task role and execution role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-iam-role-overview.html)

- <span id="ref-15"></span> [15] [Security best practices for Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools-security-best-practices.html)

- <span id="ref-16"></span> [16] [Cognito machine-to-machine tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html)

- <span id="ref-17"></span> [17] [IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)

- <span id="ref-18"></span> [18] [Verified Permissions with Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-authorization-with-avp.html)

- <span id="ref-19"></span> [19] [S3 presigned URLs and expiration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

- <span id="ref-20"></span> [20] [Cognito token revocation limitations](https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html)

- <span id="ref-21"></span> [21] [IAM permissions-boundary evaluation caveats](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)

- <span id="ref-22"></span> [22] [Cross-account IAM policy evaluation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html)

- <span id="ref-23"></span> [23] [Cognito access-token claims and scopes](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html)

- <span id="ref-24"></span> [24] [ECS task role credentials](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)

- <span id="ref-25"></span> [25] [Verified Permissions application integration](https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/authorization.html)
