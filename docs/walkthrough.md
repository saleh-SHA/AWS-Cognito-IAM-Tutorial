# 13. Realistic setup walkthrough: secure SaaS API

## Phase 1: identity

- Create a Cognito User Pool and public app client for React; configure managed login, PKCE, callback/logout URLs and MFA as appropriate.
- Define a custom API resource server/scope (for example `screening/read`) if coarse API scopes are useful. Decide which token types and claims endpoints accept.
- Store application user references by stable Cognito `sub`, not by mutable email address.

## Phase 2: backend and database

- Create FastAPI auth dependency that validates JWT signature, issuer, expiry, token type and app client; enforce route-level scopes.
- Add PostgreSQL tables for users, organisations, projects, memberships and roles. Use server-side checks on every project/doc endpoint.
- Use tests that prove Tenant A cannot access Tenant B by changing a numeric ID in the path.

## Phase 3: AWS service permissions

- Create API task role trusted by `ecs-tasks.amazonaws.com`; attach least-privilege S3/SQS/Secrets Manager permissions needed by your code.
- Create a separate task execution role for ECR/logging and deployment-specific secrets handling.
- Deploy ECS service with both role ARNs correctly set; verify the actual role using `sts:GetCallerIdentity` in controlled diagnostics.

## Phase 4: secure file upload

- FastAPI checks project edit permission and allowed file parameters, creates a controlled S3 key, then returns a short-lived presigned URL or performs the upload itself.
- Use private buckets, block public access, server-side encryption, constraints, lifecycle and post-upload validation.
- Do not treat the existence of an S3 object or a presigned URL as proof that a user has project membership.

## Phase 5: operate

- Monitor sign-in activity, auth failures, IAM denials and workload events. Configure CloudTrail, CloudWatch and security alerts as appropriate.
- Periodically review IAM Access Analyzer findings, unused roles, external trust, overbroad wildcards and resource-policy exposure.
