# Chapter 7: Architecture B: browser-to-S3 access

*Using identity pools and IAM together*

The end-to-end scenario where Cognito and IAM really work together to authorise an application user’s direct AWS calls.

## 7.1 End-to-end design

> User Pool                         Identity Pool                                STS                      Browser AWS SDK  
> Authenticates user     →           Maps identity to role    → Temporary AWS credentials →                 Uploads to own S3 prefix

The browser never receives permanent IAM-user access keys.

Here, S3 sees the role session associated with the client identity, not your ECS backend task. The identity pool selects a role, but the role’s permissions policy and applicable S3 policies decide which objects can be accessed.

## 7.2 Step 1: restrict the role’s trust

Identity-pool role trust policy; region and pool ID must match your identity pool.

```json
{
    "Version": "2012-10-17",
    "Statement": [{
       "Effect": "Allow",
       "Principal": {
          "Federated": "cognito-identity.amazonaws.com"
       },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
          "StringEquals": {
             "cognito-identity.amazonaws.com:aud":
               "eu-west-2:YOUR_IDENTITY_POOL_UUID"
          },
          "ForAnyValue:StringLike": {
             "cognito-identity.amazonaws.com:amr": "authenticated"
          }
       }
    }]
}
```

The aud condition limits which identity pool can use the role; amr limits it to authenticated identities. Do not use a broadly trusted, unscoped identity-pool role. [15](chapter-12.md#ref-15)

## 7.3 Step 2: scope S3 access to the identity’s prefix

Valid JSON example: per-identity S3 prefixes with an IAM policy variable.

```json
{
    "Version": "2012-10-17",
    "Statement": [
      {
         "Effect": "Allow",
         "Action": "s3:ListBucket",
         "Resource": "arn:aws:s3:::example-user-files",
         "Condition": {"StringLike": {
            "s3:prefix": [
              "private/${cognito-identity.amazonaws.com:sub}/*"
            ]
         }}
      },
      {
         "Effect": "Allow",
         "Action": ["s3:GetObject", "s3:PutObject"],
         "Resource": [
            "arn:aws:s3:::example-user-files/private/${cognito-identity.amazonaws.com:sub}/*"
         ]
      }
    ]
}
```

Deployment detail The identity-pool identity ID (not User Pool sub) is used for the folder path in this policy. Always verify the actual identity ID and a second user’s denied access. Consider bucket encryption, CORS and object-size controls separately. [13](chapter-12.md#ref-13)

## 7.4 Step 3: role mapping and client SDK

1. Create a User Pool and a public app client; configure login and obtain a signed user-pool token.

2. Create an Identity Pool and attach the User Pool as an identity provider.

3. Set a default authenticated IAM role or claim/group-based role mapping. Review ambiguous-role behaviour.

4. From the browser, use the AWS SDK Cognito identity credential provider for that Identity Pool; the SDK obtains temporary AWS credentials.

5. Call the S3 API only for the identity-specific object key. Test that another identity’s prefix returns AccessDenied .

Direct access is not always best Identity-pool credentials can be right for client-side AWS SDK use, but increase the surface area you must secure. For straightforward document uploads in a SaaS product, consider backend-authorised S3 presigned URLs instead. Keep the bucket private and scope upload keys and conditions carefully.

## 7.5 Direct S3 access and presigned URLs: two solutions to different problems

Both architectures can move large files directly between the browser and S3. The key difference is who owns the authority. With an Identity Pool, the browser gets a temporary AWS role session and can perform all AWS actions allowed by that role for its session lifetime. With a presigned URL, the browser gets authority to perform a particular signed S3 operation within a limited period. That difference changes your security model and operational complexity.

Dimension | Identity Pool + AWS SDK | Backend-issued presigned URL

Credential in browser | Temporary AWS access key, secret key, | Pre-signed HTTP URL — session token

Operations | Potentially several IAM-authorised S3 | One operation / request shape per — calls                                   URL

Product authorisation | Must be encoded in IAM claims/tags | Easy to check live membership before — or enforced before issuance             issuance

Credential refresh | Identity and AWS session refresh | Request a new URL for another upload — needed

Good fit | Rich offline/mobile S3 workflow, many | Simple upload/download in typical — AWS calls per user                      SaaS

Main risk | Over-broad role or prefix scoping | Leaked URL and weak upload — constraints

## 7.6 How to test S3 prefix isolation like an attacker

Do not stop after demonstrating one successful upload. Security is proven by the negative cases. Create two test accounts whose User Pool subjects and Identity Pool IDs you can distinguish. Upload Alice’s object under her identity prefix, then ask Bob’s credentials to read and overwrite Alice’s key. Both calls must fail. Also test object listing, unexpected prefixes, path-like key tricks, expired credentials, and an unauthenticated identity if that feature is enabled.

1. Write down the actual IdentityId returned to each account; never infer it from the User Pool JWT sub .

2. Verify role selection using the configured Identity Pool role mappings.

3. Call PutObject inside Alice’s permitted prefix and expect success.

4. Call GetObject on Alice’s key using Bob’s credentials and expect a denied action.

5. Try ListBucket with an unapproved prefix and expect denial.

6. Review CloudTrail and S3 logs/CloudTrail data events as configured; these may require explicit setup and incur charges.

## 7.7 What IAM cannot validate about an upload

S3 sees a signed request to store bytes. IAM can restrict the object ARN, operation and supported condition keys, but it cannot infer that the file is a genuine scientific PDF, malware-free, uncorrupted, licensed for processing, or within a user’s SaaS quota. These are application-level controls. Use upload completion validation, malware scanning where required, content-type/content inspection, quotas, and a private quarantine/processing workflow. S3 CORS controls browser cross-origin behaviour; CORS is not an authorisation policy.

Avoid the “one role per user” reflex You do not normally create thousands of IAM roles for every end user. Identity Pools often use shared roles plus narrow, identity-scoped policies, or roles based on a small number of privilege classes. Your application database remains the source for fine-grained project permissions.
