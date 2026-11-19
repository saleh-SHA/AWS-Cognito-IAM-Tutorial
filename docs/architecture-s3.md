# 6. Architecture B: direct S3 access with Identity Pools

A web app can let authenticated users read and upload files directly to a private S3 prefix. This can reduce API traffic, but needs explicit browser-side AWS credential handling, tightly scoped roles, and CORS configuration.

```mermaid
flowchart LR
  UP[User Pool] -->|JWT| IP[Identity Pool]
  IP -->|role mapping| STS[STS IAM session]
  STS -->|temporary credentials / SigV4| S3[S3]
  S3 -->|IAM check: GetObject / PutObject| Result[Allow or deny]
```

## Trust one Identity Pool

Example trust relationship for an authenticated Identity Pool role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "cognito-identity.amazonaws.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "cognito-identity.amazonaws.com:aud": "eu-west-2:11111111-2222-3333-4444-555555555555"
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated"
      }
    }
  }]
}
```

The `aud` condition pins the role to the intended Identity Pool. The `amr` condition requires an authenticated identity. Keep these safeguards in place.

## Scope S3 to an identity-specific prefix

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListOnlyOwnPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::example-user-files",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["users/${cognito-identity.amazonaws.com:sub}/*"]
        }
      }
    },
    {
      "Sid": "ReadWriteOnlyOwnObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::example-user-files/users/${cognito-identity.amazonaws.com:sub}/*"
    }
  ]
}
```

For uploads, also enforce file size/type and ownership rules, encryption, lifecycle, and malware handling as appropriate. An IAM prefix policy alone does not cover every product security need. Identity Pool IDs differ from User Pool user IDs.

## Alternative: FastAPI presigned URLs

For a private SaaS, a common choice is to check user/project permissions in FastAPI and issue a short-lived S3 presigned URL. The browser talks to S3 without receiving AWS credentials. The signing task role still needs the S3 permission. Constrain keys, expiry, upload verification, and content limits.

| Choice | Pros | Trade-offs |
| --- | --- | --- |
| Identity Pool + client SDK | Native AWS access; user-specific IAM context | More client credential and IAM policy design |
| API + presigned URLs | Central business checks; no browser AWS credentials | Backend issues URLs and must validate upload workflow |
| API proxies file bytes | Simple control/logging in API | Uses API bandwidth and compute |

