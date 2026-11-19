# Chapter 6: Architecture A: React + FastAPI + ECS

*Recommended backend-mediated SaaS pattern*

A realistic SaaS architecture in which users authenticate to the product but the API owns access to AWS.

> React SPA                               FastAPI                        ECS task role                       S3 / database  
> Cognito User Pool access token   → Verify JWT + check ownership → Boto3 gets temporary credentials → IAM / database permissions  
> Recommended boundary: keep business permissions inside the API; keep AWS credentials off the browser when direct AWS access is  
> unnecessary.

## 6.1 Who authorises what, step by step?

1. React redirects to Cognito to sign in using Authorization Code + PKCE. Cognito returns tokens to the client.

2. React calls GET /projects/42/documents/7 with Authorization: Bearer <access token> .

3. FastAPI validates signature, issuer, expiry, intended app client and token_use=access . It enforces a suitable scope.

4. FastAPI looks up Alice’s active membership and permission for project_id=42 and document 7 in PostgreSQL.

5. FastAPI calls S3 with Boto3. The AWS SDK uses the ECS task role; IAM decides whether it can call s3:GetObject .

6. The API returns only the permitted content (or a constrained presigned URL) and records relevant audit events.

ECS has TWO relevant roles Task execution role: used by the ECS agent for pulling images, publishing logs, retrieving configured startup secrets. Task role: used by your application code for S3, DynamoDB, Secrets Manager and other AWS API calls. Confusing them is a common source of AccessDenied. [14](chapter-12.md#ref-14)

## 6.2 FastAPI JWT verification example (Python)

This example uses PyJWT[crypto] . A production service should cache JWKS appropriately, normalise error responses and use a standard security middleware/dependency. It deliberately validates access-token properties, not merely the signature.

Educational verification snippet. If your access tokens include a resource audience (aud), validate it for your API too.

```python
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException
```

```python
REGION = "eu-west-2"
POOL_ID = "eu-west-2_EXAMPLE"
APP_CLIENT_ID = "your_app_client_id"
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}"
JWKS = PyJWKClient(f"{ISSUER}/.well-known/jwks.json")
```

```python
def verify_access_token(raw: str, required_scope: str) -> dict:
    try:
         key = JWKS.get_signing_key_from_jwt(raw).key
         claims = jwt.decode(
             raw, key, algorithms=["RS256"], issuer=ISSUER,
             options={"verify_aud": False,
                       "require": ["exp", "iss", "sub"]}
         )
         if claims.get("token_use") != "access":
             raise ValueError("Wrong token type")
         if claims.get("client_id") != APP_CLIENT_ID:
             raise ValueError("Wrong app client")
         if required_scope not in claims.get("scope", "").split():
             raise HTTPException(403, "Insufficient scope")
         return claims
    except HTTPException:
         raise
    except (jwt.PyJWTError, ValueError):
         raise HTTPException(401, "Invalid access token")
```

## 6.3 The database authorisation step

This protects project data. An IAM policy on the ECS role does not perform this check.

```sql
-- Example server-side membership check; parameterise all values
SELECT 1
FROM project_memberships
WHERE project_id = :project_id
  AND user_cognito_sub = :verified_sub
  AND status = 'active'
  AND role IN ('owner', 'editor', 'viewer');
```

For write or delete operations, check the corresponding application permission and the exact record’s project association. Avoid accepting a claimed user_id from the request body as the authority: use the verified subject and database membership. This is particularly important for multi-tenant applications.

## 6.4 The ECS role is the AWS identity

Boto3 credential provider chain retrieves the role credentials injected for the ECS task.

```python
import boto3
```

```python
# No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in app config.
s3 = boto3.client("s3") # uses ECS task role credentials
object_bytes = s3.get_object(
    Bucket="example-private-documents",
    Key="projects/42/reports/report-7.pdf"
)["Body"].read()
```

## 6.4a Detailed sequence diagram: one user request

User | React | Cognito | FastAPI | S3

1. Open sign-in

2. Code + PKCE challenge

3. Redirect: auth code

4. Code + PKCE verifier

5. Tokens (JWTs)

6. Bearer access token

7. Verify JWT; check project membership

8. SigV4 via ECS task role

9. Object bytes (if IAM allows)

Complete flow: the JWT is consumed by FastAPI; the S3 request uses the ECS task role, not Alice’s JWT.

## 6.5 A full request trace: download an authorised project file

Assume Alice is an editor in Project 42 and Bob has no membership. The document object is s3://example- private-documents/projects/42/reports/report-7.pdf . The system should distinguish an authentication failure, an application authorisation failure, and an AWS access failure. These are not interchangeable error classes.

Hop | Alice (authorised) | Bob (not a member) | Security principal

> 1. Browser → API                      Sends current access token               Sends equally valid access          Cognito subject  
> token

> 2. API JWT check                      Valid → continue                         Valid → continue                    Token issuer + subject

> 3. Membership SQL query               Editor row found →                       No row → 403/404                    Application user + resource  
> continue

> 4. API → S3                           AWS SDK retrieves object                 No S3 request should occur          ECS task role session

> 5. S3 authorisation                   Task role allowed → bytes                Not reached                         IAM role principal  
> returned

An application bug that omits the membership query can cause data leakage even when IAM is perfectly configured: every document read uses the same valid ECS task role. Conversely, an overly restrictive IAM task policy can block Alice despite correctly granting her project-level permission. Design tests for both layers.

## 6.6 Practical FastAPI authorisation dependency

The previous chapter’s JWT verifier authenticates the user. Below, a separate dependency checks the requested project. In production, implement the query with your ORM/session, keep the tenant ID in the predicate, verify roles for the exact action, and return a deliberately uniform error if you must avoid disclosing that a resource exists.

**Illustrative FastAPI + SQLAlchemy-style dependency (focus: boundary)**

```python
from fastapi import Depends, HTTPException, Path
from sqlalchemy import text
```

```sql
# current_user validates the token and returns claims; db is a request DB session.
def require_project_reader(
    project_id: int = Path(...),
    user = Depends(current_user),
    db = Depends(get_db),
):
    membership = db.execute(
        text("""SELECT role FROM project_memberships
           WHERE project_id = :p AND user_sub = :u
              AND is_active = TRUE"""),
        {"p": project_id, "u": user["sub"]},
    ).first()
    if membership is None or membership.role not in {"owner", "editor", "viewer"}:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
```

@app.get("/projects/{project_id}/documents/{document_id}") def download_document(project_id: int, document_id: int, user=Depends(require_project_reader), db=Depends(get_db)): # Look up document with BOTH project_id and document_id scoped. # Fetch S3 object only after the authorisation check succeeds. return {"document_id": document_id}

Avoid the IDOR vulnerability Insecure Direct Object Reference (IDOR) occurs when a backend accepts arbitrary object identifiers without checking whether the current user may access the referenced object. This is why GET /documents/123 must check that document 123 belongs to a project the caller can read, not simply that the JWT is signed.

## 6.7 The server-side S3 request uses a different identity

Your FastAPI process running in ECS should normally use the SDK’s default credential provider chain. ECS makes temporary credentials for its task role available to the container; boto3 resolves them without hard- coded access keys. In CloudTrail, AWS sees an IAM role session calling S3, not Alice’s Cognito user directly. For auditability, log Alice’s Cognito subject and the authorised project ID in your application’s logs, and correlate them with backend AWS access using controlled request IDs. Do not put raw tokens into logs.

boto3 automatically uses task-role credentials when correctly configured

```python
import boto3
```

```python
# Good: credentials resolved from ECS environment credential provider.
s3 = boto3.client("s3", region_name="eu-west-2")
result = s3.get_object(
    Bucket="example-private-documents",
    Key="projects/42/reports/report-7.pdf"
)
```

```python
# Diagnostic, in secure logs only:
# boto3.client("sts").get_caller_identity()
```

## 6.8 A safer large-file upload flow: presigned URLs

For uploads, you do not need to route the entire PDF through FastAPI and you do not need an Identity Pool by default. Use a two-stage design: (1) the authenticated user asks FastAPI to initiate an upload for a particular project; (2) FastAPI checks that the user may upload and generates a short-lived, tightly scoped presigned S3 URL; (3) the browser uploads to S3 using the URL; (4) the backend validates the completed object and records it in the project database.

> React                                 FastAPI                        Presigned URL                                S3  
> POST /projects/42/uploads   → Validate membership + size →                  Short-lived S3 request       →         Direct browser upload

The browser holds a scoped presigned request, not general AWS API credentials.

**Create a scoped S3 PUT URL after business authorisation**

```python
from uuid import uuid4
import boto3
```

```python
s3 = boto3.client("s3")
```

```python
def make_upload_url(project_id: int, user_sub: str, filename: str):
    # Call only AFTER membership, subscription and file-type checks.
    key = f"projects/{project_id}/incoming/{uuid4()}.pdf"
    url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": "example-private-documents",
            "Key": key,
            "ContentType": "application/pdf",
        },
        ExpiresIn=300,
    )
    return {"upload_url": url, "object_key": key}
```

A presigned URL is a bearer capability: whoever holds it can use it until expiration or another applicable restriction applies. Your backend should control the object key, constrain request headers and content, use an appropriate upload mechanism for strong size limits, and validate the actual stored object before processing. Presigned URLs also expire when the signing temporary AWS credentials expire, even if a longer URL lifetime was requested. [19](chapter-12.md#ref-19)

## 6.9 A real multi-tenant application data model

Table | Important columns | Why Cognito alone does not replace it

users | id , cognito_sub , status | Stores app profile and stable identity — mapping

organisations | id , name, plan | Tenant and billing boundary

organisation_memberships | org_id, user_id, role, active | Who belongs to which organisation

projects | id, org_id, owner_id | Resource ownership and tenancy

project_memberships | project_id, user_id, role, active | Fine-grained roles per project

documents | id, project_id, object_key, uploaded_by | Object-level authorisation mapping

Keep authorisation decisions grounded in database state where requirements change quickly. For example, when a subscription expires, the API may deny new screening jobs immediately; you should not depend on a Cognito group changing before the next token refresh. If you add PostgreSQL row-level security, remember that it requires careful per-request session context and is a defence-in-depth layer, not an excuse to omit correct API checks.
