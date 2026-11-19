# 5. IAM foundations: principal, action, resource, condition

IAM policies commonly answer four questions: who (principal), can do what (action), to what (resource ARN), under which conditions (condition). Authorization is deny by default unless an applicable allow exists; an explicit deny overrides an allow.

## The anatomy of a permissions policy

*Example 1. Attach to an IAM role as an identity-based permissions policy.*

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportsOnly",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::example-reports/private/*"]
    }
  ]
}
```

This grants `s3:GetObject` for objects under one S3 prefix. It does not grant `s3:ListBucket`, does not bypass explicit denies, and does not allow every possible AWS action.

## Five IAM concepts that are often confused

| Concept | What it means |
| --- | --- |
| Principal | The entity making the request: role session, IAM user, federated principal or service. |
| Identity-based policy | Permissions attached to a role/user/group. Usually no `Principal` field. |
| Resource-based policy | Permissions attached to a resource, e.g., S3 bucket policy, specifying `Principal`. |
| Role trust policy | A resource-based policy on a role: who may assume it via STS. |
| Permissions boundary | Caps permissions available to IAM users/roles; does not independently grant access. |

## Why roles have TWO kinds of policy

A role’s trust policy says who may obtain role sessions. The role’s permissions policy says what those sessions can do once obtained. Trust alone does not grant S3 access; S3 permission alone does not allow an unrelated identity to assume the role.

# 6. IAM role assumption: trust policy vs permissions policy

## Example: a FastAPI service on ECS

*Example 2. ECS task role trust relationship.*

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
```

*Example 3. Attach this separate permission policy to the ECS task role.*

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::example-review-docs/private/*"
    }
  ]
}
```

Your container inherits its task-role credentials via the ECS credential endpoint and SDK credential provider chain. You do not embed IAM access keys in React, source code, environment variables or Docker images.

## ECS task role vs task execution role

| Role | Who uses it | Examples |
| --- | --- | --- |
| Task role | Your application code inside the container | S3 objects, Secrets Manager secret reads, SQS sends |
| Task execution role | ECS/Fargate agent launching and operating the task | Pull ECR image, send supported logs, resolve task-definition secrets |

These are often configured as two separate ARNs in the task definition. If boto3 gets “AccessDenied” when your FastAPI code reads S3, inspect the task role first, not the task execution role.

## Example: verify which AWS identity your code uses

*Example 4. Diagnostic and SDK credential-chain behaviour.*

```python
import boto3

sts = boto3.client("sts")
print(sts.get_caller_identity())  # Account, ARN, UserId

s3 = boto3.client("s3")  # Picks up task-role creds automatically
obj = s3.get_object(
    Bucket="example-review-docs",
    Key="private/report-123.pdf",
)
```

> **Operational caution**\
> Do not expose the caller identity, exception details or credentials to end users. Use controlled application logs; never print environment secrets or the AWS session token.

# 7. IAM evaluation: why an Allow may still be denied

AWS combines several policy layers. The complete rules have service- and principal-specific subtleties, but this decision flow is useful when debugging:

| Authenticate | Gather policies | Evaluate | Service responds |
| --- | --- | --- | --- |
| Identify AWS principal | Identity + resource + guardrails | Allow / explicit deny | Authorised or denied |

*Figure 3. Simplified AWS IAM decision path.*

- Implicit deny: no applicable policy grants the action (default deny).
- Explicit deny: an applicable Deny overrides an Allow.
- Permissions boundaries and session policies: constrain permissions available to the relevant role/user session, subject to documented resource-policy exceptions.
- SCPs / RCPs: organisation-level limits; an allow in a role policy is insufficient if an applicable organisational guardrail blocks the action.
- Resource policies / KMS / VPC endpoint policies: may impose additional gates; cross-account requests require special care.

## Concrete failure cases

| What you see | Likely reason | What to inspect |
| --- | --- | --- |
| S3 `GetObject` AccessDenied | Wrong role, missing allow, bucket policy deny, KMS decrypt missing | STS caller ARN, task policy, bucket policy, key policy |
| STS `AssumeRole` AccessDenied | Role trust excludes principal or caller-side policy missing | Target role trust, `sts:AssumeRole` policy, conditions |
| User can sign in but API 403 | Valid identity, insufficient app role/project membership | Scopes, DB membership, resource ownership |
| Browser S3 call fails despite JWT | JWT is not AWS credentials or wrong identity-pool role | Identity Pool mapping, temporary credentials, SigV4 |

Do not treat “logged in to Cognito” as proof that an AWS resource call should succeed. Each enforcement layer makes a separate decision.
