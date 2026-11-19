# 3. Cognito User Pools: the application login system

A User Pool is a managed user directory and an OAuth 2.0 / OpenID Connect identity provider. It can manage local users; federate Google, Microsoft, SAML and OIDC identities; issue JWTs; and apply MFA, account lifecycle and app-client configuration.

## The three important tokens

| Token | Purpose | Important caution |
| --- | --- | --- |
| ID token | Identity claims for the client (e.g., `sub`, email, groups) | Do not treat an ID token as a universal API permission grant. |
| Access token | Authorise access to protected APIs / OAuth scopes | Validate `token_use=access`, issuer, `client_id`, signature and time. |
| Refresh token | Obtains fresh tokens subject to session rules | Store/handle securely; do not send as API bearer token. |

A User Pool app client identifies the application, not a human. For public browser/mobile clients, use a public client without a client secret and prefer the authorisation-code flow with PKCE. For confidential backend clients, the client secret can be held securely server-side.

| User signs in | Cognito User Pool | React application | FastAPI backend |
| --- | --- | --- | --- |
| Managed login + PKCE | Authenticates and issues JWT | Calls API with access token | Verifies token and checks DB |

*Figure 1. App-user sign-in without a Cognito Identity Pool.*

## Scopes vs groups vs database roles

- OAuth scopes express broad API permission claims, such as `screening/read`. They are not normally per-project entitlements.
- User Pool groups label users as, for example, “reviewer” or “admin”, and may be emitted as token claims. Group names do not automatically grant S3 rights or database-row access.
- Database membership usually decides resource-level rules: Alice may edit Project A but only view Project B. The backend must check the requested project and action.

> **An anti-pattern**\
> Never decide that a user may read any project merely because they have successfully signed in or because their token contains a broad role such as “reviewer”.

# 4. Cognito Identity Pools: the bridge to AWS credentials

An Identity Pool is different from a User Pool. It can accept a User Pool token or other supported identity-provider evidence, select a role, and obtain temporary AWS credentials for the app (commonly through AWS STS). These credentials are used to sign AWS API requests, which IAM evaluates.

| Cognito User Pool | Cognito Identity Pool | AWS STS | S3 / AWS service |
| --- | --- | --- | --- |
| Valid app-user JWT | Map identity to IAM role | Temporary role credentials | Checks IAM authorisation |

*Figure 2. Identity Pools issue AWS credentials; User Pools do not.*

## When do you need an Identity Pool?

- Yes: your mobile/web client should call selected AWS services directly, under tightly scoped per-user AWS credentials.
- No: your browser only calls your FastAPI backend and the backend calls AWS services using its own ECS task role. This is often the simpler design.
- Not automatically: file upload itself does not require an Identity Pool. Your backend can issue short-lived S3 presigned URLs after performing its own user and project authorisation checks.

## Temporary AWS credentials are not Cognito JWTs

| JWT from User Pool | AWS temporary credentials |
| --- | --- |
| Usually Bearer token sent to APIs | Access key ID + secret access key + session token |
| Signed by Cognito (JWK/JWKS) | Used to sign AWS requests with SigV4 |
| Verifies identity/claim context | Represents an IAM role session |
| Can be exchanged via Identity Pool | Checked by IAM on AWS service request |

Subtle point: the `sub` in a User Pool token identifies a user in that User Pool. The policy variable `${cognito-identity.amazonaws.com:sub}` identifies an Identity Pool identity. They are not interchangeable.
