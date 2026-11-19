# 10. Troubleshooting playbook

| Failure / symptom | First questions |
| --- | --- |
| 401 from FastAPI | Was an access token sent? Check issuer, `token_use`, expiry, JWKS `kid`, `client_id`, signature, and clock. |
| 403 from API | Is the user authenticated but missing scope, organization membership, plan entitlement, or project role? |
| `AssumeRoleWithWebIdentity` denied | Is the correct Identity Pool ID in trust? Is `amr` authenticated? Is role mapping correct? |
| Browser S3 `AccessDenied` | Did Identity Pool issue credentials? Which assumed role? Is object ARN/prefix correct? Is there a bucket/KMS deny? |
| ECS S3 `AccessDenied` | Is the app using the task role, not execution role? Check region, bucket/key, resource policy, and KMS. |
| IAM allows S3 but API returns 403 | IAM checks backend AWS permissions; the API separately checks customer/project permissions. |
| Simulator says Allow, runtime denies | Check request context, resource policies, SCP/boundary/session/endpoint policies, and KMS key policy. |

## Six diagnostic questions

1. **Which caller?** Browser JWT or AWS SigV4 request?
2. **Which principal?** User Pool `sub` or assumed-role ARN?
3. **Which resource?** Application project row or AWS ARN?
4. **Which action?** API operation or precise IAM action?
5. **Which decision point?** JWT middleware, project check, IAM, or KMS?
6. **Which evidence?** API logs, CloudTrail, policy simulator, or authorization tests?

