# 16. Security checklist and common mistakes

| Mistake | Better practice |
| --- | --- |
| Creating an IAM user for every SaaS customer | Use Cognito User Pool for customers, not IAM users. |
| Believing IAM is authorisation only | IAM also authenticates signed AWS requests. |
| Believing User Pool group automatically grants S3 access | Only appropriate identity-pool/role or workload IAM policy grants AWS permissions. |
| Putting AWS keys in a React bundle | Use backend/task roles, presigned URLs, or scoped Identity Pool credentials. |
| Reusing task execution role for application permissions | Use separate task role for app AWS API calls. |
| Trusting token claims without verifying signature | Validate signature, issuer, audience/client ID, token type, expiry and required scope. |
| Treating global “editor” group as project membership | Enforce per-project membership, tenant isolation and object-level checks. |
| Allowing `s3:*` on `*` in production | Scope actions/resources, use conditions, log and test denials. |
| Ignoring role trust policy in AccessDenied investigations | Check assume-role trust, `aud`/`amr`, account, conditions and caller grants. |
| Using IAM Identity Center for public app user registration | Prefer Cognito User Pool (or a suitable customer IdP) for external app users. |
