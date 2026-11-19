# Chapter 4: IAM fundamentals and advanced controls

*AWS principals and policy decisions*

IAM governs AWS principals: what they may call, on which AWS resources, and subject to which conditions.

## 4.1 Identity types: avoid the old “create an IAM user for everyone” model

Mechanism | Use it for | Typical credential

IAM Identity Center | Workforce / admin access across | Federated sign-in and temporary — AWS accounts                                credentials

IAM role | ECS task, Lambda, EC2, cross- | Short-lived STS credentials — account, workload identity

IAM user | Uncommon cases where a long-lived | Long-term access keys or console — IAM identity is required                    sign-in; avoid for routine workloads

IAM group | Collect permissions for IAM users | No independent principal or — credentials

Modern AWS guidance prefers temporary credentials for humans and workloads. Roles are not merely collections of permissions: they are assume-able identities with a trust policy plus permissions policies. [7](chapter-12.md#ref-7)[8](chapter-12.md#ref-8)

## 4.2 How an IAM permission policy reads

Identity-based permission policy attached to a role: allow only GetObject in a prefix.

```json
{
    "Version": "2012-10-17",
    "Statement": [{
       "Sid": "ReadReportsOnly",
       "Effect": "Allow",
       "Action": ["s3:GetObject"],
       "Resource": [
         "arn:aws:s3:::example-reports/reports/*"
       ]
    }]
}
```

Effect is Allow or Deny; Action is an AWS API action; Resource identifies target ARNs; Condition adds context. A missing allow means implicit deny; explicit deny always overrides relevant allows. Note that s3:ListBucket applies to the bucket ARN, while s3:GetObject applies to object ARNs.

## 4.3 Trust policy vs permissions policy

Policy type | Question it answers | Example

Role trust policy | Who is allowed to assume this role? | ECS service ecs- — tasks.amazonaws.com

Role permissions policy | What may the resulting role session | s3:GetObject for a bucket prefix — do?

Resource policy | Who may access this resource? | An S3 bucket policy permitting a — cross-account role

Illustrative ECS task-role trust policy. This grants no S3 access by itself.

```json
{
    "Version": "2012-10-17",
    "Statement": [{
       "Effect": "Allow",
       "Principal": {"Service": "ecs-tasks.amazonaws.com"},
       "Action": "sts:AssumeRole"
    }]
}
```

Mental shortcut Trust policy = who can become the role. Permissions policy = what the role can do. In cross-account setups, also evaluate permissions on the calling side and any applicable resource policy. [9](chapter-12.md#ref-9)

## 4.4 IAM policy evaluation, simplified

1. Authenticate                                                               2. Look for deny AWS identifies the requesting principal and request                           Any applicable explicit deny wins. context.

3. Find an allow                                                              4. Apply ceilings A relevant allow is required in the applicable policy                         Boundaries, SCPs/RCPs, session policies and cross- evaluation model.                                                             account rules may further limit access.

For a common same-account request, an identity-based policy or applicable resource-based policy can provide an allow, subject to the AWS policy evaluation rules. Permissions boundaries are maximums, not grants. SCPs limit permissions in an organisation; they do not grant them. Resource policies and assumed-role session principals have subtleties: do not assume a simple universal “intersection of everything” formula. [10](chapter-12.md#ref-10)

## 4.5 Quick example: explicit deny

Simplified teaching example only; do not deploy broad s3:* grants.

```json
{
    "Version": "2012-10-17",
    "Statement": [
      {"Effect": "Allow", "Action": "s3:*", "Resource": "*"},
      {"Effect": "Deny", "Action": "s3:DeleteObject",
       "Resource": "*"}
    ]
}
```

The role can call s3:GetObject when no other policy blocks it, but cannot call s3:DeleteObject , regardless of another Allow in the request’s applicable policies.

## 4.6 Read IAM JSON as a sentence

Take the following permission policy and translate it literally: The role is allowed to retrieve objects from the projects/ prefix of one bucket, but it does not receive permission to list all bucket names or write objects. A permissions policy usually omits Principal because it is attached to the identity being granted permissions.

**A minimal identity-based policy - read-only objects, not bucket listing**

```json
{
    "Version": "2012-10-17",
    "Statement": [{
       "Sid": "ReadProjectArtifacts",
       "Effect": "Allow",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::example-review-docs/projects/*"
    }]
}
```

Request | Result from this policy alone | Reason

GetObject projects/42/a.pdf | Potentially allowed | Matches action and object resource; — other controls can still deny

PutObject projects/42/a.pdf | Not allowed | No PutObject allow

GetObject private/salary.pdf | Not allowed | Different key prefix

ListBucket | Not allowed | Bucket-level action requires bucket — ARN permission

ListAllMyBuckets | Not allowed | Not granted by GetObject

## 4.7 ARN anatomy and the bucket/object distinction

An Amazon Resource Name (ARN) identifies a resource, typically with structure arn:partition:service:region:account-id:resource , although some services omit fields. S3 bucket ARNs look like arn:aws:s3:::bucket-name , while standard S3 object ARNs look like arn:aws:s3:::bucket-name/key . The distinction matters because s3:ListBucket targets the bucket resource and s3:GetObject targets object resources.

**Separate bucket listing from object access; prefix condition is on ListBucket**

```json
{
    "Version": "2012-10-17",
    "Statement": [
      {
         "Sid": "ListOnlyProjectKeys",
         "Effect": "Allow",
         "Action": "s3:ListBucket",
         "Resource": "arn:aws:s3:::example-review-docs",
         "Condition": {
           "StringLike": {"s3:prefix": ["projects/42/*"]}
         }
      },
      {
         "Sid": "ReadOnlyProjectObjects",
         "Effect": "Allow",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::example-review-docs/projects/42/*"
      }
    ]
}
```

A prefix is a key-naming convention rather than an automatically isolated filesystem directory. Policy matching is string-based. The list permission is optional if you already know exact keys and will only use GetObject. Do not add ListBucket casually; giving users a way to enumerate names can itself leak information.

## 4.8 Role trust policy and permission policy answer different questions

Consider an analytics role that should be assumable by one application role. The trust policy on the target role answers Who may obtain this role session? Its permissions policy answers Which AWS API calls can a session make? For cross-account delegation, the caller also usually needs an identity-based permission allowing sts:AssumeRole on the target role, and applicable organisation guardrails must allow the operation.

**Target role trust policy (illustrative account/role ARN)**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
     "Effect": "Allow",
     "Principal": {"AWS": "arn:aws:iam::111122223333:role/review-api-task"},
     "Action": "sts:AssumeRole"
  }]
}
```

**Caller permission to assume the target role; separate document**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
     "Effect": "Allow",
     "Action": "sts:AssumeRole",
     "Resource": "arn:aws:iam::444455556666:role/report-reader"
  }]
}
```

The second document grants the caller permission to ask STS for the role. The first document grants the target permission to trust the caller. Once the role is assumed, access to S3 is governed by the target role’s effective permissions, not automatically by the caller’s previous permissions.

## 4.9 Work the IAM evaluation by hand

Suppose a task role has an identity-policy Allow s3:GetObject on reports/* . An S3 bucket policy explicitly denies reads to that prefix unless traffic arrives via a required VPC endpoint. The role permissions look correct, yet the request from a developer laptop fails. The reason is not a broken token: an applicable explicit Deny in the bucket policy defeats the role Allow.

Control | Example impact | Think of it as

Identity-based role policy | May allow s3:GetObject | Permission grant

Resource-based policy | May allow/deny based on bucket, | Resource-side rules — principal or network

Permissions boundary | Constrains user/role identity-based | Delegation ceiling; not a grant — permissions

Session policy | May further reduce assumed-role | Temporary session ceiling — session access

SCP / RCP | Organisation-level guardrails where | Account/resource guardrail; not a — applicable                             grant

KMS key policy/grants | May be needed to decrypt a KMS- | Separate cryptographic-authorisation — encrypted S3 object                    check

Do not treat policy evaluation as a simple universal intersection formula. Resource-based grants to particular principals or sessions have documented exceptions, and cross-account requests require different checks. Use the AWS policy-evaluation documentation for those subtleties. The safe design rule is to keep grants narrow and test both successful and denied operations. [10](chapter-12.md#ref-10)

## 4.10 Two operations people overlook: iam:PassRole and sts:AssumeRole

iam:PassRole does not create role credentials for the caller. It permits an authorised caller to pass a role to an AWS service during actions such as registering a task definition; the AWS service later uses that role in its normal workflow. sts:AssumeRole is the operation for obtaining a role session directly. Excessive iam:PassRole can be a privilege escalation path, so limit both the role ARNs and the service via conditions such as iam:PassedToService where applicable.
