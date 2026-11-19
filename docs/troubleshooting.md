# 15. Troubleshooting playbook

| Failure / symptom | First questions |
| --- | --- |
| 401 on your FastAPI endpoint | Was the access token sent? Issuer, `token_use`, expiration, JWKS `kid`, `client_id`, signature, clock? |
| 403 from the API | Is user authenticated but lacking scope, organisation membership, plan entitlement or project role? |
| STS AssumeRoleWithWebIdentity denied | Is the correct identity pool ID in trust? Is `amr` authenticated? Role mapping? |
| S3 AccessDenied from browser | Did Identity Pool issue credentials? Which assumed role? Is object ARN/prefix correct? Bucket/KMS deny? |
| S3 AccessDenied from ECS | Is app using TASK role (not execution role)? Wrong region/bucket/key? Resource policy/KMS? |
| IAM allows S3 but API still 403 | IAM checks backend AWS permissions; API independently checks customer/project permissions. |
| Policy simulator says Allow, runtime Deny | Check real context, resource policies, SCP/boundary/session/endpoint policies and KMS key policy. |

## A disciplined 6-question diagnostic sequence

1. Which caller? Browser JWT or AWS SigV4 request?
2. Which principal? User Pool `sub` or assumed-role ARN?
3. Which resource? App project row or AWS ARN?
4. Which action? API operation or precise IAM action?
5. Which decision point? JWT middleware, project check, IAM, KMS?
6. Which evidence? API logs, CloudTrail, policy simulator, authorisation tests?
