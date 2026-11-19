# Chapter 5: Cognito Identity Pools and STS

*Why Cognito can lead to IAM permissions*

Identity Pools explain why Cognito sometimes appears to do IAM-style access control.

A Cognito **Identity Pool** (federated identities) takes proof of an authenticated or guest app identity, maps it to an appropriate IAM role, and obtains **temporary AWS credentials**. Its role-selection and attribute-mapping features are why Cognito documentation sometimes discusses “access to S3” or “AWS resource permissions.” The actual AWS API permissions still come from IAM. [3](chapter-12.md#ref-3)[11](chapter-12.md#ref-11)

## 5.1 User Pool vs Identity Pool

| Feature | User Pool | Identity Pool |
| --- | --- | --- |
| Primary job | Sign up, sign in, issue JWTs | Obtain AWS credentials for app identities |
| Stores app users? | Yes | No user directory like a User Pool |
| Typical output | ID/access/refresh tokens | Temporary AWS access key, secret key, session token |
| Authorisation mechanism | Scopes, groups, token claims | Role mapping + IAM role policies |
| Always used together? | No | No; identity pools can use other IdPs |

## 5.2 The credential exchange

<div class="flow">
  <div class="flow-step"><b>Sign in</b><span>User Pool issues token</span></div>
  <div class="flow-step"><b>Identity Pool</b><span>Maps token → IAM role</span></div>
  <div class="flow-step"><b>STS</b><span>Issues temporary AWS credentials</span></div>
  <div class="flow-step"><b>S3 / DynamoDB</b><span>Checks IAM permissions</span></div>
</div>
<p class="figure-caption">With identity pools, the app can call AWS directly without storing long-lived IAM keys. [12](chapter-12.md#ref-12)</p>

The identity pool chooses the role (possibly using token claims, role mappings and attributes); AWS STS credentials represent the **assumed role session**. The client must still protect the credentials and can only do what that session is allowed to do.

## 5.3 Two meanings of “sub”

!!! warning "Frequently missed detail"
    `UserPool sub` identifies the user in the user directory. `cognito-identity.amazonaws.com:sub` in an IAM identity-pool policy is the **identity pool identity ID** (typically Region:UUID), **not** the User Pool sub. Do not build object keys assuming they are interchangeable. [13](chapter-12.md#ref-13)

## 5.4 Identity pools are optional, not the default for every app

If React calls only your FastAPI API and FastAPI calls AWS using its ECS role, you generally do **not** need an Identity Pool. Add it when your client itself needs direct AWS API access (for example, uploading to a constrained S3 prefix with the AWS SDK). For browser uploads, also compare tightly scoped, short-lived S3 presigned URLs issued by your backend; these may be simpler when a single operation is needed.

## 5.5 The whole credential-exchange story, step by step

In the browser-to-S3 architecture, the user still begins by authenticating with Cognito User Pools. But the web application now has another requirement: it must issue **AWS-signed** requests from the browser. A User Pool JWT cannot sign an S3 API call. This is the gap that Cognito Identity Pools bridge by associating an authenticated external identity with a constrained IAM role and temporary AWS credentials.

<div class="flow">
  <div class="flow-step"><b>User Pool</b><span>JWT for signed-in Alice</span></div>
  <div class="flow-step"><b>Identity Pool</b><span>Identity + role selection</span></div>
  <div class="flow-step"><b>STS</b><span>Role session credentials</span></div>
  <div class="flow-step"><b>S3</b><span>Checks signed action and key</span></div>
</div>
<p class="figure-caption">Distinct artefacts at every stage: JWT → identity mapping → AWS credentials → SigV4 request.</p>

1. React signs Alice in with a User Pool and receives a valid User Pool token.

2. React configures an Identity Pool credential provider with the identity-pool ID and the User Pool provider/token.

3. The SDK uses the identity-pool APIs (for example `GetId` and `GetCredentialsForIdentity`, depending on flow) to resolve an identity and request credentials.

4. Identity Pool validates the configured provider relationship and selects an IAM role according to its role mapping; STS supplies temporary credentials for that role session.

5. The browser AWS SDK signs a request such as `PutObject` with the access key, secret key and session token.

6. S3 checks the role session’s effective permissions, bucket policy and any other applicable controls. It does **not** interpret the original User Pool access token as its permission policy.

## 5.6 What the identity pool knows - and what it does not

An Identity Pool can distinguish authenticated from unauthenticated identities, support more than one configured identity provider, choose different roles, and pass selected identity attributes into IAM principal tags. It does not usually know your application’s relational data model: project memberships, individual document reviewers, billing state and approval workflows. A shared authenticated role with broad S3 permissions is still dangerous even though every caller successfully signed in.

| Requirement | Identity Pool / IAM can help | Still needed in your app |
| --- | --- | --- |
| Each browser gets temporary AWS credentials | Yes - assign role and return credentials | Credential handling and UI error states |
| A user reads only objects under their identity prefix | Yes - IAM policy variable with correct identity value | Good key naming, CORS, encryption, negative tests |
| Reviewer may read Project 42 only while a member | Not automatically from basic User Pool groups | Dynamic membership check or vetted IAM attribute design |
| Editors on a paid plan can upload at most 50 MB | IAM may limit broad operations but not all product semantics | Backend/URL constraints, object validation, quota ledger |
| Remove an external collaborator immediately | Sessions may remain valid until expiry | Revocation strategy and app permission checks |

## 5.7 Understand the two “sub” values

A User Pool JWT contains a `sub` claim: a stable identifier for that subject in the User Pool. An Identity Pool creates a separate **IdentityId** for its federated identity. The policy variable `${cognito-identity.amazonaws.com:sub}` refers to the **Identity Pool identity**, not the User Pool user sub. If you create keys using the wrong identifier, a policy that appears correct may fail every request, or a manual mapping may point users at unexpected paths.

```text title="Illustrative values - intentionally different"
User Pool JWT sub:  8be7223c-a460-46a7-982b-f03b43f2389b
Identity Pool ID:   eu-west-2:1b2c3d4e-5555-6666-7777-888888888888
IdentityId:         eu-west-2:abcdef12-3456-7890-abcd-ef1234567890

S3 authorised key prefix using IdentityId:
  private/eu-west-2:abcdef12-3456-7890-abcd-ef1234567890/
```

## 5.8 Identity Pool role mapping is an authorisation decision - secure it

Cognito can select an authenticated role by default or use mappings based on token claims and provider configuration. If roles have different privilege levels, inspect how ambiguous claims, missing groups and mapping failures behave. A broad default role can erase the boundary you intended. Test a basic reviewer, an editor, a user who belongs to multiple groups and an identity that has just lost its privileged group.

!!! warning "Identity Pool trust hardening"
    Use an `aud` condition matching the exact Identity Pool ID and an `amr` condition restricting the role to authenticated identities, following AWS guidance. The fact that an IAM trust policy names `cognito-identity.amazonaws.com` alone is not sufficient isolation. [15](chapter-12.md#ref-15)

## 5.9 Browser SDK pseudocode and an isolation test

```javascript title="SDK v3 JavaScript sketch; configure real User Pool and Identity Pool IDs"
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = "eu-west-2";
const provider = `cognito-idp.${region}.amazonaws.com/eu-west-2_EXAMPLE`;
const credentials = fromCognitoIdentityPool({
  client: new CognitoIdentityClient({ region }),
  identityPoolId: "eu-west-2:IDENTITY_POOL_UUID",
  logins: { [provider]: userPoolIdToken }
});
const s3 = new S3Client({ region, credentials });

// Ensure the key is permitted by the IAM policy and maps to this identity.
await s3.send(new PutObjectCommand({
  Bucket: "example-user-files",
  Key: "private/IDENTITY_POOL_IDENTITY_ID/report.pdf",
  Body: pdfBytes,
  ContentType: "application/pdf"
}));
```

Treat the code as a reference sketch: use an SDK/auth library that handles token refresh and credential refresh, and derive the key from the resolved identity rather than arbitrary user input. Do not use the User Pool subject as a substitute for the IdentityId in the policy variable. Test by signing in as two people and trying each other’s prefixes: both legitimate uploads should work, both cross-user reads/writes should fail.
