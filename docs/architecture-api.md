# 8. Architecture A: React + Cognito + FastAPI + PostgreSQL

Scenario: a subscription-based AI literature screening platform has users, organisations, projects, screening results, and file attachments. Users authenticate with Cognito. Projects live in PostgreSQL. The API runs on ECS and accesses private S3 objects.

| React browser | FastAPI on ECS | PostgreSQL | S3 documents |
| --- | --- | --- | --- |
| Access token in API call | Verify JWT + project access | Owner/member roles | ECS task IAM role |

*Figure 4. The user does not get IAM credentials in this design.*

## Request walkthrough: GET /projects/42/documents

1. React signs the user in through Cognito User Pool (authorisation code + PKCE).
2. React calls FastAPI with Authorization: Bearer ACCESS_TOKEN.
3. FastAPI validates JWT cryptography and required claims.
4. FastAPI checks whether `sub` belongs to project 42 and may view its documents.
5. FastAPI reads metadata from PostgreSQL; if needed it retrieves S3 using the ECS task role.
6. AWS IAM decides whether the task role may read the S3 object. The API returns only authorised content.

## The precise responsibility split

| Service/component | Responsible for |
| --- | --- |
| Cognito User Pool | User credentials, MFA, OIDC/JWT issuance |
| FastAPI JWT middleware | Validating bearer token + coarse scopes |
| FastAPI project dependency / database | Project access (owner/editor/viewer, tenant isolation) |
| ECS task role + IAM | Whether backend can access specified S3 bucket/object |
| PostgreSQL | Stores project memberships, data and permissions; DB itself does not parse Cognito JWT automatically |

## Minimal FastAPI pattern: JWT authentication

The following illustrates a verification boundary using PyJWT. In production also build resilient JWKS caching/timeouts, structured errors, monitoring, rate limiting, and an explicit token and key rotation strategy.

*Example 5. Access token validation for a known User Pool/client.*

```python
# pip install fastapi "PyJWT[crypto]"
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPBearer
import jwt

app = FastAPI()
bearer = HTTPBearer(auto_error=True)
REGION = "eu-west-2"
POOL_ID = "eu-west-2_EXAMPLE"
CLIENT_ID = "example_app_client_id"
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL_ID}"
JWKS_URL = f"{ISSUER}/.well-known/jwks.json"
JWKS = jwt.PyJWKClient(JWKS_URL)


def current_user(credentials=Depends(bearer)):
    try:
        token = credentials.credentials
        key = JWKS.get_signing_key_from_jwt(token).key
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=ISSUER,
            options={"verify_aud": False},
        )
        if claims.get("token_use") != "access":
            raise ValueError("Not an access token")
        if claims.get("client_id") != CLIENT_ID:
            raise ValueError("Wrong app client")
        return claims
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/me")
def me(user=Depends(current_user)):
    return {"sub": user["sub"]}
```

Production note: verify the access token’s required API scopes for each endpoint; do not accept arbitrary algorithms or keys from a token. If you support multiple legitimate app clients, validate against an explicit allow-list. The Cognito access token generally uses `client_id`, whereas the ID token uses `aud`.

## Project-level authorisation must be a separate check

*Example 6. User Pool identifies user; PostgreSQL decides project privilege.*

```python
from fastapi import HTTPException

# Pseudocode: DB function must scope by both project and user.
def require_project_role(
    db,
    project_id: str,
    user_sub: str,
    allowed_roles: set[str],
):
    membership = db.find_membership(project_id, user_sub)
    if membership is None or membership.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")
    return membership

# GET project -> roles viewer, editor, owner
# DELETE project -> role owner only
# POST document -> roles editor, owner
```

> **Why no Identity Pool?**\
> The browser is not making any AWS API requests. It speaks only to FastAPI. Your FastAPI service uses its own IAM task role; adding a Cognito Identity Pool would introduce credentials and policy complexity without solving project authorisation.
