# 12. Advanced application authorisation: groups are not enough

Suppose Alice and Bob both belong to the “reviewer” group. Alice owns Project 101; Bob only belongs to Project 202. If the API authorises with "reviewer" in token.groups alone, both can potentially see both projects. That is a broken object-level authorisation vulnerability.

## Model the access decision as a tuple

Evaluate (principal, action, resource, context). Example: (Alice, export_results, Project 101, paid subscription and active membership). Do not derive ownership from a client-supplied owner ID.

| Request | AuthN | API/AuthZ check | Outcome |
| --- | --- | --- | --- |
| Alice: GET /projects/101 | Valid Cognito JWT | Alice belongs to project 101 | 200 |
| Bob: GET /projects/101 | Valid Cognito JWT | Bob is not a member | 403 (or consistent 404 policy) |
| Alice: DELETE /projects/101 | Valid Cognito JWT | Alice has “viewer”, not “owner” | 403 |
| Guest: GET /projects/101 | No accepted token | Fails authentication | 401 |

## When to use Amazon Verified Permissions

Verified Permissions is a fine-grained application-authorisation service using Cedar policies. It can evaluate policies against Cognito identities and resource attributes, replacing or complementing custom authorisation logic. Your application still supplies trustworthy resource/context facts and enforces the resulting Allow/Deny. It is not an IAM replacement for S3/ECS.

> **A good SaaS default**\
> Cognito for application sign-in; application DB or Verified Permissions for organisation/project-level rights; ECS task roles and IAM for the AWS calls. Add Identity Pools only when the client genuinely requires direct AWS access.
