# 9. Architecture B: direct S3 access with Identity Pools

Scenario: a web app lets authenticated users read and upload files directly to a private S3 prefix. This can reduce traffic through your API, but requires explicit browser-side AWS credential handling, carefully scoped roles and CORS configuration.

| User Pool | Identity Pool | STS IAM session | Amazon S3 |
| --- | --- | --- | --- |
| User signs in; obtains JWT | Exchanges token; role mapping | Short-lived AWS credentials | Checks GetObject / PutObject |

*Figure 5. AWS access is performed by a role session associated with the app user.*

## Role trust policy: tightly bind it to ONE Identity Pool

*Example 7. The trust relationship of the authenticated Identity Pool role.*

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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
    }
  ]
}
```

The aud condition pins the role to the intended Identity Pool. The amr condition requires an authenticated identity. Do not remove these safeguards merely to make role assumption work.

## S3 permissions: isolate one identity per key prefix

*Example 8. Policy variables scope S3 access to an Identity Pool identity.*

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
          "s3:prefix": [
            "users/${cognito-identity.amazonaws.com:sub}/*"
          ]
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

For uploads, also enforce file size/type and ownership rules (application, bucket controls, upload workflow), encryption, lifecycle and malware handling as appropriate. Avoid assuming an IAM S3 prefix policy alone meets all product security needs. Identity IDs differ from User Pool user IDs.

## Alternative: a presigned URL from FastAPI

The more common choice for a private SaaS is to check user/project permissions in FastAPI and issue a short-lived S3 presigned upload/download URL. Then the browser talks to S3 without receiving AWS credentials. The signing IAM task role still requires the relevant S3 permission. Use key constraints, short expiries, upload verification and content limits.

| Choice | Pros | Trade-offs |
| --- | --- | --- |
| Identity Pool + client AWS SDK | Native AWS access; user-specific IAM context | More client credential and IAM policy design |
| API + presigned URLs | Centralised business checks; no browser AWS credentials | Backend issues URLs and must validate upload workflow |
| API proxies file bytes | Simple control/logging in API | Consumes API bandwidth and compute |
