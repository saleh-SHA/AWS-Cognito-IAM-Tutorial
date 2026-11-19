# 8. Secure SaaS API walkthrough

## Phase 1: identity

- Create a Cognito User Pool and public app client for React; configure managed login, PKCE, callback/logout URLs, and MFA as appropriate.
- Define a custom API resource-server scope (for example, `screening/read`) if coarse API scopes are useful. Decide which token types and claims endpoints accept.
- Store application user references by stable Cognito `sub`, not mutable email address.

## Phase 2: backend and database

- Create a FastAPI auth dependency that validates JWT signature, issuer, expiry, token type, and app client; enforce route-level scopes.
- Add PostgreSQL tables for users, organizations, projects, memberships, and roles. Check access server-side on every project/document endpoint.
- Add tests proving Tenant A cannot access Tenant B by changing a numeric ID in the path.

## Phase 3: AWS service permissions

- Create an API task role trusted by `ecs-tasks.amazonaws.com`; attach least-privilege S3/SQS/Secrets Manager permissions required by the code.
- Create a separate task execution role for ECR/logging and deployment-specific secrets handling.
- Set both role ARNs on the ECS task definition and verify the active role with `sts:GetCallerIdentity` in controlled diagnostics.

## Phase 4: secure file upload

- FastAPI checks project edit permission and allowed file parameters, creates a controlled S3 key, then returns a short-lived presigned URL or uploads the file itself.
- Use private buckets, block public access, server-side encryption, constraints, lifecycle, and post-upload validation.
- An S3 object or presigned URL does not prove that a user belongs to a project.

## Phase 5: operate

- Monitor sign-in activity, authentication failures, IAM denials, and workload events. Configure CloudTrail, CloudWatch, and alerts as appropriate.
- Review IAM Access Analyzer findings, unused roles, external trust, broad wildcards, and resource-policy exposure regularly.

