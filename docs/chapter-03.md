# Chapter 3: Cognito User Pools, explained

*Authentication and application-facing tokens*

Think of a User Pool as an application identity provider and token issuer, not an AWS-role permission engine.

## 3.1 User Pool components

- User Pool: directory of users, authentication policies, MFA configuration, federation and token issuer.

- App client: represents your application, with OAuth grant types, callback URLs, allowed scopes and optional client secret. A browser SPA is a public client and must not contain a client secret.

- Managed login / hosted endpoints: redirect-based sign-in and OAuth 2.0 / OpenID Connect support.

- Groups: a way to encode broad app roles in token claims; groups do not automatically authorise every endpoint or create AWS permissions.

- Resource servers and scopes: define API permissions such as projects/read and projects/write for access tokens.

## 3.2 Choose the right token

Token | What it answers | Typical audience / use

ID token | Who signed in? User identity claims | Frontend user profile / sign-in — context

Access token | What API scopes does this client | Your resource API; verify signature, — session carry?                             issuer, client, token use and scopes

Refresh token | How can the client obtain new | Token endpoint / SDK; do not use as — tokens?                                    API bearer token

Illustrative signed JWT payload; do not trust decoded claims before verifying the JWT.

// Illustrative access token CLAIMS (not a complete JWT) { "iss": "https://cognito-idp.eu-west-2.amazonaws.com/POOL_ID", "sub": "8f70...", "token_use": "access", "client_id": "APP_CLIENT_ID", "scope": "openid projects/read projects/write", "cognito:groups": ["reviewer"], "exp": 1790000000 }

Three independent checks A token may be validly signed but still be wrong for your API. Verify issuer, expiry, signature and expected client/audience; enforce token_use=access for API access tokens and require the relevant scope or entitlement. Do not confuse token validity with resource ownership. [4](chapter-12.md#ref-4)

## 3.3 Login flow for a modern SPA

> React                                 Cognito                              React                               FastAPI  
> Starts code + PKCE      →            Authenticates user       →         Redeems code for tokens    →            Checks access JWT

Authorization Code grant with PKCE is a common choice for browser SPAs; never embed client secrets in client code. [5](chapter-12.md#ref-5)

## 3.4 Cognito authorisation: real but bounded

Cognito can issue scopes and group membership and can front an API Gateway route with a JWT authorizer. For example, require projects/read for GET /projects and projects/write for POST /projects . This is API- level authorisation. A check such as “only the project owner may delete this particular record” still requires application-level or fine-grained policy evaluation.

Important nuance Cognito groups and OAuth scopes are not the same. Scopes are granted to a client/request and validated by the API; group membership can inform your application’s role rules. A group does not automatically gain a custom scope just because it has that name. [6](chapter-12.md#ref-6)

## 3.5 Dissect the OAuth 2.0 authorisation-code + PKCE flow

The original short diagram “user signs in and React receives JWTs” hides a crucial exchange. With PKCE, the browser first generates a random code_verifier , derives a SHA-256 based code_challenge , and redirects the browser to Cognito’s authorisation endpoint. The user authenticates there; Cognito redirects back with a short- lived authorisation code, not the final access token. The browser then sends the authorisation code together with the original verifier to Cognito’s token endpoint.

> Step                                            Sender → receiver                             Payload / purpose

> 1                                               React → browser redirect                      Authorisation URL with client ID,  
> redirect URI, requested scopes, state ,  
> challenge and response_type=code

> 2                                               User → Cognito managed login                  Password/passkey/federation and  
> MFA as configured

> 3                                               Cognito → React callback                      Authorisation code and original state

> 4                                               React → Cognito token endpoint                Code, matching code_verifier , client  
> ID and redirect URI

> Step                                           Sender → receiver               Payload / purpose

> 5                                              Cognito → React                 Access token, ID token and potentially  
> refresh token

> 6                                              React → FastAPI                 Authorization: Bearer  
> <access_token>

> 7                                              FastAPI → React                 Protected API response after  
> validation and business authorisation

The verifier proves that the app redeeming the code is the one that initiated the sign-in flow; state helps defend against login/redirect CSRF. PKCE does not prevent an XSS-compromised browser from misusing a token, and it does not replace strict redirect-URI configuration. For browser applications, do not embed a confidential client secret in JavaScript. [5](chapter-12.md#ref-5)

**Illustrative HTTP sequence: redacted placeholders, not runnable unmodified**

GET https://login.example.com/oauth2/authorize? response_type=code&client_id=PUBLIC_CLIENT_ID& redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback& scope=openid%20profile%20screening%2Fread& state=RANDOM_CSRF_VALUE&code_challenge=BASE64URL_SHA256& code_challenge_method=S256

```python
# Callback to SPA: /callback?code=ONE_TIME_CODE&state=...
POST https://login.example.com/oauth2/token
Content-Type: application/x-www-form-urlencoded
```

grant_type=authorization_code&client_id=PUBLIC_CLIENT_ID& code=ONE_TIME_CODE&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback& code_verifier=ORIGINAL_RANDOM_VERIFIER

## 3.6 Read the JWT claim by claim

A JWT usually has three dot-separated Base64URL-encoded parts: header.payload.signature. Encoding is not encryption; anyone holding a JWT can generally read its claims. Cryptographic verification establishes that an expected issuer signed the content, and claim checks establish that it is usable for your application. You should not put secrets in custom token claims.

**Representative access token PAYLOAD; values illustrative**

```python
{
    "iss": "https://cognito-idp.eu-west-2.amazonaws.com/eu-west-2_EXAMPLE",
    "sub": "7e111111-2222-3333-4444-abc123abc123",
    "token_use": "access",
    "client_id": "react-public-client-id",
    "scope": "openid screening/read screening/write",
    "cognito:groups": ["reviewer"],
    "iat": 1795000000,
    "exp": 1795003600
}
```

Claim | How the API should interpret it | Frequent error

iss | Approved User Pool issuer, exact | Trusting any valid Cognito-signed — match                                   token from a different pool

token_use | Expect access for an access-token | Passing an ID token to an access- — endpoint                                token validator

client_id | App client the token was issued to; | Checking aud alone when absent from — allow-list known clients                access tokens

aud | If present, resource audience to | Ignoring an audience constraint when — validate for bound access tokens        configured

exp , nbf , iat | Token lifetime and timing constraints | Decoding without cryptographic — (as applicable)                         verification

scope | Coarse API privilege granted to token | Equating screening/read with access — to every project

sub | Stable subject within the User Pool | Using email as an immutable primary — key

Nuance in current Cognito tokens Most Cognito User Pool access tokens contain client_id rather than an aud app-client claim. Cognito can also issue an aud claim when a resource-server binding is requested. Validate the audience when you have intentionally bound the token to a resource, as well as checking other mandatory claims. [4](chapter-12.md#ref-4)

## 3.7 Scopes, groups and memberships: a concrete counterexample

Suppose Alice and Bob both carry screening/read and both belong to the Cognito group reviewer . Alice is a reviewer on Project 42; Bob reviews Project 99. An API that checks only the scope or group would allow Bob to read Alice’s project. The correct decision is the intersection of three conditions: the token is valid, the token grants access to the requested API operation, and a live membership/ownership rule permits the subject to access the particular project.

Groups and scopes are useful but are often too coarse for user-generated resources. If a user is removed from a project, old access tokens may still carry old group claims until expiry; use database membership for immediate project-level changes. Cognito also supports custom claims and triggers, but that does not remove the need for resource-level checks.

## 3.8 Sessions, refresh, revocation and logout

Access tokens are short-lived bearer credentials. Refresh tokens can obtain replacement tokens until their own expiry or revocation, subject to your app-client settings. A JWT can still pass local signature/expiry verification even after a Cognito sign-out or token revocation event, because the cryptographic signature remains valid. If near-immediate revocation matters, design for short access-token lifetimes and an additional server-side session/revocation mechanism or a Cognito-aware check suited to your threat model. [4](chapter-12.md#ref-4)

A browser storage decision is also part of security architecture. Keeping tokens in browser memory reduces persistence but a hostile script can still act as the user. A backend-for-frontend (BFF) can hold tokens server- side and use secure, HttpOnly, SameSite cookies for the browser. That changes CSRF requirements and operational complexity; it does not eliminate the need to validate every protected request.
