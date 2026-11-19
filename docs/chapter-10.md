# Chapter 10: Hands-on learning labs

*Build and test the concepts*

Use a sandbox AWS account; expect small charges for test infrastructure. Use placeholders and clean up resources afterwards.

## Lab 1 — Trace the active AWS identity (15–20 minutes)

**Objective:** demonstrate that the credentials used by your terminal are an AWS principal, separate from any Cognito app-user token.

1. Authenticate to a sandbox AWS account with IAM Identity Center / your approved role-based AWS CLI profile.

2. Run the commands below and inspect the assumed-role ARN.

3. Compare the role ARN with the Cognito sub in an app JWT. They identify different things.

4. Try reading an S3 object outside your permitted bucket/prefix and observe `AccessDenied` (do not use sensitive data).

```bash title="Change profile and bucket to your own sandbox values."
aws sts get-caller-identity --profile sandbox
aws s3 ls s3://example-reports/ --profile sandbox
```

## Lab 2 — Prove a permission policy does not grant role assumption

1. Create a sandbox IAM role with an EC2 or ECS trust policy and a narrow S3 read permissions policy.

2. Try `sts:AssumeRole` using a principal that is **not** trusted: the attempt fails, despite the role containing S3 permissions.

3. Update the trust relationship appropriately for a trusted testing principal; ensure caller-side permissions are also correct.

4. Assume the role successfully and run `aws sts get-caller-identity` and a permitted S3 read.

```bash title="Only succeeds if the role trust and applicable caller permissions permit assumption."
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/DemoReadRole \
  --role-session-name test-demo
```

## Lab 3 — User Pool login without AWS access

1. Create a User Pool with one test user and a public app client for a local test app.

2. Configure an OAuth callback and Authorization Code + PKCE; sign in and retrieve an access token.

3. Inspect the untrusted payload in a JWT viewer, then verify it with the pool’s published JWKS.

4. Observe that no AWS access key, secret key or STS session token was issued merely by signing in.

## Lab 4 — Add an Identity Pool and test S3 isolation

1. Create an Identity Pool that trusts the User Pool.

2. Attach the narrowly scoped authenticated role from Chapter 7 (with a real single-string Resource ARN).

3. Sign in as two sandbox users, acquire temporary role credentials and upload objects under each identity-specific prefix.

4. Verify that user A cannot read the object under user B’s prefix. Check role policies, any bucket policy, KMS and CORS if a request fails.

## Lab 5 — Test an application-level authorisation failure

1. Use your API to create two projects assigned to different test users.

2. Make sure both users have `projects/read` scope in their tokens.

3. Attempt to read user B’s project from user A’s session.

4. The API should return `403 Forbidden` (or 404 if your disclosure policy hides existence), even when the ECS task role can read S3 objects for both projects.

!!! note "Sandbox safety"
    Do not attach `AdministratorAccess` to identity-pool roles. Avoid deploying intentionally broad teaching examples. Delete test identity pools, IAM policies/roles, buckets, app clients and user pools when finished.

## 10.1 Before the labs: choose a safe sandbox

Use a disposable AWS account or development environment without production data. Apply permissions to a single temporary role or resource. Decide who can clean up the IAM roles, identity pools, bucket objects and log artefacts. Do not create permanent IAM user access keys just to run these exercises; prefer AWS IAM Identity Center or another approved role-based CLI session. AWS charges may apply to some resources and logs.

| Lab | Learning goal | How you know it worked |
| --- | --- | --- |
| A: Resolve caller identity | See your active AWS principal | `get-caller-identity` shows role session ARN |
| B: Prove trust ≠ permissions | Understand both role policies | AssumeRole fails until trust/caller conditions are satisfied |
| C: Verify JWT validation | Separate access from ID token | ID token rejected at access-only endpoint |
| D: Direct-S3 isolation | Understand Identity Pool role credentials | Cross-user object request denied |
| E: Resource-level membership | Understand backend authorisation | Valid token from non-member yields 403/404 |
| F: ECS task-role diagnosis | Understand workload roles | Correct role ARN in logs; S3 action allowed only under intended key |

## 10.2 Lab A: see the principal AWS really recognises

1. Sign in to your developer account using workforce federation or an approved short-lived session.

2. Run `aws sts get-caller-identity`. Write down the account ID and whether the ARN is an assumed role.

3. Run `aws s3api list-objects-v2 --bucket YOUR_SANDBOX_BUCKET --max-items 1` only if your identity is authorised for that test bucket.

4. Compare the permission to call STS identity inspection with permission to list S3 objects. The former succeeding does not imply the latter is allowed.

5. Switch to a different authorised role and repeat. Observe how the AWS principal changes even though the same person is at the keyboard.

```bash title="Terminal commands for Lab A"
aws sts get-caller-identity
aws configure list
aws s3api list-objects-v2 \
  --bucket YOUR_SANDBOX_BUCKET \
  --prefix sandbox/ \
  --max-items 1
```

!!! note "Lab A takeaway"
    The credential identifies a specific AWS principal or role session. AWS authenticates that session before evaluating each requested action.

## 10.3 Lab B: construct a two-policy proof

1. Create a sandbox target role, attach a narrow S3 read-only policy to it, and trust only an identified approved caller role.

2. From an unrelated caller, try to assume it. Expect denial even though the target role has S3 read permission.

3. From the approved caller, verify it has caller-side `sts:AssumeRole` permission if required.

4. Assume the target role, then request an allowed object and a disallowed object key. Expect one potential success and one denial.

5. Remove/disable trust, and confirm new role assumptions fail; remember previously issued sessions may live until they expire or are invalidated under applicable mechanisms.

This exercise isolates the two questions: *who can become this role?* and *what can a session of this role do?* Do not “fix” a trust-policy denial by granting S3 `*` permissions.

## 10.4 Lab C: inspect and verify User Pool JWTs

1. Create a sandbox User Pool, test app client and one test account; enable a browser-compatible OAuth flow with PKCE.

2. After login, examine the decoded ID-token and access-token payloads locally without publishing them. Identify `iss`, `sub`, `exp`, `token_use` and the appropriate client identifier.

3. Pass the access token to a protected FastAPI endpoint and expect a success for an authorised user.

4. Pass the ID token to the same access-token-only endpoint and expect 401.

5. Change or remove the `Authorization` header and expect 401. Change the user’s project membership and expect 403 on a project resource.

!!! warning "Do not use generic online JWT decoders for real tokens"
    A JWT is readable by its holder and may contain personal information. Inspect development tokens locally. Never paste production tokens into third-party web tools.

## 10.5 Lab D: S3 access scoped to an Identity Pool identity

1. Create a private sandbox S3 bucket with public access blocked.

2. Set up a sandbox Identity Pool linked to your User Pool and attach the exact-pool authenticated trust policy.

3. Use an authenticated IAM role with the identity-prefix S3 policy from Chapter 7.

4. Log in as Test User A; retrieve the IdentityId, upload `private/<A-IdentityId>/a.txt`.

5. Log in as Test User B; upload under B’s prefix, then attempt to fetch A’s object. Expect AccessDenied.

6. Try to list the whole bucket and inspect whether your policy deliberately allows or denies that request.

7. Delete all test objects and clean up the Identity Pool and roles when finished.

## 10.6 Lab E: test the app’s most important 403

1. Create Project 42 and Project 99. Add Alice to Project 42 as an editor and Bob to Project 99 as a viewer.

2. Sign in as both accounts and obtain valid access tokens.

3. Verify Alice can read Project 42 and Bob can read Project 99.

4. Request Project 42 with Bob’s valid token. Expect 403 or privacy-preserving 404, not a success.

5. Change Bob’s database membership to include Project 42 and verify access becomes allowed without modifying IAM.

6. Revoke his membership; make the request again using an unexpired token and confirm access is denied by the database check.

## 10.7 Lab F: catch the ECS execution-role mistake

1. Run a minimal FastAPI container with separate task and execution role ARNs.

2. Allow the execution role to pull images and send logs; allow the task role `s3:GetObject` for one test prefix.

3. Have the container call `sts:GetCallerIdentity` from boto3; record the assumed task-role name in secure logs.

4. Temporarily remove the test S3 read permission from the task role and reproduce AccessDenied.

5. Restore the narrow permission and confirm the legitimate read works.

6. Avoid adding secret values or AWS credentials to application logs; clean up the task and test objects.
