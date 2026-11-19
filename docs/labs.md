# 14. Guided labs: learn by doing

## Lab A: an IAM-only service call (20–30 minutes)

**Goal:** learn how an IAM role authenticates to AWS without Cognito.

- Create a test S3 bucket with a small harmless file (avoid real sensitive data).
- Run Python in an ECS task or another AWS compute service under a temporary-credential IAM role.
- Allow exactly `s3:GetObject` for a single path and call `get_object`.
- Call `list_objects_v2` on the bucket: expect an access denial unless `s3:ListBucket` is allowed.
- Use `get_caller_identity` to examine the assumed-role principal; compare it with the configured role.

## Lab B: Cognito-only web login (30–45 minutes)

**Goal:** prove a User Pool JWT is enough for API login but not S3 AWS API signing.

- Create a test User Pool, public app client and localhost callback; configure authorisation-code flow with PKCE.
- Log in via managed login; inspect token fields (locally and safely). Never post real tokens to shared JWT decoding sites.
- Call `/me` using an access token; try an expired or altered token: expect 401.
- Try direct S3 AWS SDK access with only that JWT and no AWS credentials: signing cannot be performed as an IAM principal.

## Lab C: add an Identity Pool and scoped S3 role (30–60 minutes)

**Goal:** connect an app-user identity to temporary AWS credentials and understand role trust.

- Create an Identity Pool linked to your User Pool, with an authenticated IAM role.
- Set trust conditions to the exact Identity Pool ID and authenticated state.
- Grant reads only for the identity-specific S3 prefix shown in Example 8.
- Use an SDK identity-pool credential provider to obtain temporary AWS credentials; verify own-prefix read works and other-prefix read fails.
- Remove the S3 permission and observe IAM AccessDenied while the user can still sign into Cognito.

## Lab D: add business authorisation (30–45 minutes)

**Goal:** demonstrate that Cognito group “reviewer” does not imply ownership of every project.

- Create two projects and two users; place both users in one global User Pool group.
- Grant each user membership in only one project via database records.
- Use tests: own project = allowed; other project = denied; removing membership revokes access irrespective of JWT group.
- Test a stale token after membership change: backend must reflect current database authorisation.
