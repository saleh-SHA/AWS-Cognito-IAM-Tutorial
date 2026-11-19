# 12. Knowledge check

1. **Does IAM perform authentication?** Yes. AWS authenticates signed requests and associates them with principals before evaluating policy.
2. **Can a User Pool JWT sign an S3 API request?** No. Direct AWS calls normally need AWS credentials and SigV4; an Identity Pool can broker temporary credentials.
3. **Must every Cognito application use an Identity Pool?** No. Backend-only designs frequently need only a User Pool.
4. **Is a Cognito group enough to authorize access to Project 42?** Not necessarily. Check project membership and action-level entitlements in the app or policy engine.
5. **What does a role trust policy do?** Specifies who may assume a role and under what conditions.
6. **What does a role permissions policy do?** Specifies what authorized role sessions can do with AWS resources.
7. **Which ECS role should boto3 use for application data access?** The ECS task role, not task execution role.
8. **Can explicit IAM Deny override Allow?** Yes, an applicable explicit Deny takes precedence.
9. **How do JWT and STS credentials differ?** A JWT conveys application/OIDC identity or API claims; STS credentials sign AWS requests.
10. **Why use identity-specific S3 key prefixes?** To constrain AWS object access to resources scoped to a specific authenticated identity.
11. **What if a project member is removed while their JWT is still valid?** The backend should deny access based on current project membership.
12. **How do you verify an ECS task's AWS principal?** Call STS `GetCallerIdentity` in controlled diagnostics and check the task-role ARN.

