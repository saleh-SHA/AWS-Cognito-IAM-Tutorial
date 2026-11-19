# 9. Guided labs

Use test accounts and harmless data. Do not put real access tokens on shared JWT decoding sites.

## Lab A: IAM-only service call (20–30 minutes)

**Goal:** Learn how an IAM role authenticates to AWS without Cognito.

1. Create a test S3 bucket with a small harmless file.
2. Run Python in an ECS task or other AWS compute under a temporary-credential IAM role.
3. Allow exactly `s3:GetObject` for one path and call `get_object`.
4. Call `list_objects_v2`; expect denial unless `s3:ListBucket` is allowed.
5. Use `get_caller_identity` to examine the assumed-role principal and compare it with the configured role.

## Lab B: Cognito-only web login (30–45 minutes)

**Goal:** Prove a User Pool JWT can authenticate to an API but cannot sign S3 AWS API requests.

1. Create a test User Pool, public app client, and localhost callback; configure authorization-code flow with PKCE.
2. Sign in through managed login and inspect token fields locally and safely.
3. Call `/me` with an access token; try an expired or altered token and expect 401.
4. Try direct S3 SDK access using only that JWT and no AWS credentials; AWS signing cannot be performed as an IAM principal.

## Lab C: Identity Pool and scoped S3 role (30–60 minutes)

**Goal:** Connect an app-user identity to temporary AWS credentials and understand role trust.

1. Create an Identity Pool linked to the User Pool, with an authenticated IAM role.
2. Set trust conditions to the exact Identity Pool ID and authenticated state.
3. Grant reads only for the identity-specific S3 prefix in [Architecture B](architecture-s3.md).
4. Use an SDK Identity Pool credential provider; confirm own-prefix access works and another prefix fails.
5. Remove S3 permission and observe `AccessDenied` while Cognito sign-in still works.

## Lab D: business authorization (30–45 minutes)

**Goal:** Demonstrate that Cognito group `reviewer` does not imply ownership of every project.

1. Create two projects and two users; put both users in one global User Pool group.
2. Give each user membership in only one project in database records.
3. Confirm own-project access succeeds, other-project access fails, and removing membership revokes access regardless of the JWT group.
4. Test a stale token after membership changes; the backend should use current database authorization.

