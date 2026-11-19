# 4. Advanced IAM: least privilege, ABAC, and federation

## RBAC and ABAC

Role-based access control (RBAC) uses separate roles or application permissions for job functions such as reader, editor, upload worker, and deployment operator. With an Identity Pool, user attributes or group claims can influence IAM role mapping. With a backend-only design, group claims alone do not create different ECS IAM roles for each request.

Attribute-based access control (ABAC) uses conditions on principal and resource tags. Identity Pools can map trusted claims into session `aws:PrincipalTag` values. ABAC requires disciplined attribute issuance, validation, tag governance, and denial when required tags are missing.

Illustrative policy: allow reading objects whose `department` tag matches the principal's department tag.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::example-dept-files/*",
    "Condition": {
      "StringEquals": {
        "s3:ExistingObjectTag/department": "${aws:PrincipalTag/department}"
      },
      "Null": {"aws:PrincipalTag/department": "false"}
    }
  }]
}
```

Tag patterns require compatible AWS actions and condition keys. Test them with the IAM policy simulator and real resources. Treat user-controlled attributes as untrusted unless their source and mapping are secured.

## Federation and cross-account roles

An external identity provider or account principal can assume an IAM role only when role trust and relevant caller-side permissions/conditions allow it. Use role-session names, external IDs where appropriate, bounded session duration, and CloudTrail for traceability. A Cognito user existing does not mean that user may assume any IAM role.

## Guardrails

- **SCP:** limits maximum AWS permissions in a member account or OU; does not directly grant API calls.
- **Permissions boundary:** limits a role/user's effective permissions; does not grant missing permissions.
- **Resource policy:** can grant or restrict access on resources such as S3 buckets and KMS keys. Same-account and cross-account evaluation differ.
- **Explicit deny:** investigate all applicable policies, including bucket, endpoint, organization, and key policies.

