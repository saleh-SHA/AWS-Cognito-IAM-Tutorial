# Application authorization: groups are not enough

Suppose Alice and Bob both belong to the `reviewer` group. Alice owns Project 101; Bob belongs only to Project 202. If an API authorizes based only on `reviewer` in token groups, both users may be able to see both projects. That is a broken object-level authorization vulnerability.

Model each decision as **(principal, action, resource, context)**. For example: `(Alice, export_results, Project 101, paid subscription and active membership)`. Do not derive ownership from a client-supplied owner ID.

| Request | Authentication | API authorization check | Outcome |
| --- | --- | --- | --- |
| Alice: `GET /projects/101` | Valid Cognito JWT | Alice belongs to Project 101 | 200 |
| Bob: `GET /projects/101` | Valid Cognito JWT | Bob is not a member | 403 (or consistent 404 policy) |
| Alice: `DELETE /projects/101` | Valid Cognito JWT | Alice is viewer, not owner | 403 |
| Guest: `GET /projects/101` | No accepted token | Authentication fails | 401 |

## When to use Amazon Verified Permissions

Verified Permissions is a fine-grained application authorization service using Cedar policies. It can evaluate policies against Cognito identities and resource attributes, replacing or complementing custom authorization logic. The application still supplies trustworthy resource/context facts and enforces the result. Verified Permissions does not replace IAM for S3 or ECS.

## A good SaaS default

Use Cognito for application sign-in; the application database or Verified Permissions for organization/project rights; and ECS task roles with IAM for AWS calls. Add Identity Pools only when the client genuinely requires direct AWS access.

