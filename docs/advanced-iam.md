# 11. Advanced IAM: least privilege, ABAC, and federation

## Role-based access control (RBAC)

Use separate roles or application permissions for different job functions: reader, editor, upload worker, deployment operator. With an Identity Pool, user attributes or group claims can influence IAM role mapping. With a backend-only architecture, group claims alone do not create different ECS IAM roles for each request.

## Attribute-based access control (ABAC)

IAM conditions can check principal tags and resource tags. Identity Pools can map trusted user claims into session `aws:PrincipalTag` values. ABAC is powerful but demands disciplined attribute issuance, validation, tag governance and denial for missing tags.

*Example 9. Illustrative ABAC: read objects matching principal department tag.*

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-dept-files/*",
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/department": "${aws:PrincipalTag/department}"
        },
        "Null": {"aws:PrincipalTag/department": "false"}
      }
    }
  ]
}
```

Tag-based patterns require compatible AWS actions and condition keys; test with the IAM policy simulator and real resources. Treat user-controlled attributes as untrusted unless the source and mapping are secured.

## Federation and cross-account role use

An external identity provider or account principal can assume an IAM role only when role trust and relevant caller-side permissions/conditions allow it. Use role-session names, external IDs where appropriate, bounded session duration, and CloudTrail to maintain traceability. Never confuse “this user exists in Cognito” with “this user may assume any IAM role”.

## Additional policy guardrails

- SCP: limits maximum AWS permissions in a member account/OU; cannot directly grant an API call.
- Permissions boundary: limits a user/role’s effective permissions; cannot grant missing permissions.
- Resource policy: can grant or restrict access on resources such as S3 buckets and KMS keys; same-account and cross-account evaluation differ.
- Explicit Deny: investigate globally, including bucket policy, endpoint policy, SCP and any applicable policies.
