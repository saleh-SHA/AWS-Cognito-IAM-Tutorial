# 11. Security checklist and common mistakes

| Mistake | Better practice |
| --- | --- |
| Creating an IAM user for every SaaS customer | Use Cognito User Pool for customers, not IAM users. |
| Believing IAM is authorization only | Remember IAM also authenticates signed AWS requests. |
| Believing a User Pool group grants S3 access | AWS access requires an appropriate Identity Pool/role or workload IAM policy. |
| Putting AWS keys in a React bundle | Use backend/task roles, presigned URLs, or scoped Identity Pool credentials. |
| Reusing task execution role for app permissions | Use the separate task role for application AWS calls. |
| Trusting token claims without signature verification | Validate signature, issuer, audience/client ID, token type, expiry, and required scope. |
| Treating a global `editor` group as project membership | Enforce per-project membership, tenant isolation, and object-level checks. |
| Allowing `s3:*` on `*` in production | Scope actions/resources, use conditions, and log/test denials. |
| Ignoring role trust during `AccessDenied` investigations | Check trust, `aud`/`amr`, account, conditions, and caller grants. |
| Using IAM Identity Center for public app registration | Prefer Cognito User Pool or a suitable customer identity provider. |

