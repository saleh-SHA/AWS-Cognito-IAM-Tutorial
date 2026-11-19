# Chapter 9: Advanced authorisation and tenancy

*Scopes, groups, ABAC and permissions boundaries*

This chapter puts policy design in the right layer, especially for subscriptions, organisations and shared resources.

## 9.1 Three policy layers in a SaaS product

Layer | Example rule | Who enforces?

Authentication | This bearer token was issued by our | Cognito signs; API or API Gateway — User Pool and is unexpired            validates

API / product entitlement | User can edit records for an active | FastAPI / authorisation engine / — project membership                    database

AWS infrastructure | ECS task may read only the reports | IAM and S3 — bucket prefix

The second layer usually requires a relational model: users , organisations , memberships , projects , project_memberships , subscriptions and documents . Cognito can supply a stable subject; it does not replace these tables.

## 9.2 RBAC, ABAC and scopes are different tools

- RBAC: roles such as owner, editor and viewer. Good for understandable product-level permission bundles. User Pool groups can be one input, but project-specific roles commonly live in your app database.

- ABAC: conditions based on attributes or tags. IAM examples include aws:PrincipalTag/team matched with resource tags; Cognito Identity Pools can pass selected claims as principal tags.

- OAuth scopes: token-delegated API privileges such as projects/read ; they are usually coarse-grained compared with item ownership checks.

- Verified Permissions: an optional centralised, policy-based authorisation engine for resource and action decisions beyond groups/scopes. It integrates with Cognito but does not replace IAM for AWS API operations. [18](chapter-12.md#ref-18)

## 9.3 Example: why IAM does not protect your PostgreSQL rows

Assume the ECS role may read the projects/ prefix in S3, and the FastAPI service has a PostgreSQL database connection. Alice requests Bob’s project by guessing its numeric ID. IAM checks whether the ECS role is allowed to call S3; it does not know whether Alice is a member of Bob’s project. Your API needs object-level authorisation, consistent database queries and, where useful, PostgreSQL row-level security as defence in depth.

## 9.4 Permissions boundaries, SCPs and session policies

Control | Role in design | Common misunderstanding

Permissions boundary | Limits maximum permissions identity | A boundary does not itself grant any — policies can grant an IAM user/role         action

Service control policy (SCP) | Sets permission limits for principals | An SCP Allow does not give the role — in member accounts / OUs                    that permission

Session policy | Limits an assumed-role session’s | A session policy cannot elevate the — effective permissions                       role

S3 bucket / KMS key policies | Resource-side permissions and | They can affect access even if role — restrictions                                policy appears permissive

Fine-grained IAM policies are powerful, but policy evaluation depends on which principal form is used and which policies apply. Use the IAM Policy Simulator and IAM Access Analyzer to validate assumptions instead of relying on memory. [10](chapter-12.md#ref-10)[17](chapter-12.md#ref-17)

## 9.5 Build an explicit authorisation matrix

Good security policies begin with a plain-language definition of business actions. An owner may manage collaborators; an editor may submit reviews; a viewer may read results; a user with no membership may access nothing. Once written down, you can map each action to a FastAPI dependency, a database query, and automated tests. This reduces the temptation to rely solely on broad Cognito groups.

Action | Owner | Editor | Viewer | Non-member

Read project | Allow | Allow | Allow | Deny — metadata

Read document and | Allow | Allow | Allow | Deny — screening output

Upload and screen a | Allow | Allow | Deny | Deny — new document

Invite/remove | Allow | Deny | Deny | Deny — collaborators

Delete project | Allow | Deny | Deny | Deny

The table is an example, not a universal standard. Your application might add a billing_admin or organisation_owner role and separate subscription eligibility from project membership. A useful decision can be expressed as Allow if the caller is authenticated, their tenant account is active, their membership is active, their role permits the action, and the target object belongs to the requested project.

## 9.6 Formalise permissions without overloading JWT claims

For example, do not put a list of hundreds of project IDs into a token and assume it remains current forever. JWTs are snapshots taken at issuance. For fast-changing project membership, query the database or a central policy service at request time, using a narrowly scoped cache if performance requires it. Cognito groups are well suited to global or coarse classifications; resource-specific permissions belong in a system that can observe resource changes.

**Example API permission function (application-level pseudocode)**

```python
def can(user, action, project, membership, subscription):
    if not user.is_active or not subscription.is_active:
        return False
    if membership is None or not membership.active:
        return False
    if membership.project_id != project.id:
        return False
    if membership.organization_id != project.organization_id:
        return False
    return action in ALLOWED_ACTIONS[membership.role]
```

```python
# Both permission and data queries must be tenant-scoped.
# Do not accept organization_id solely from an untrusted request body.
```

## 9.7 RBAC, ABAC and ReBAC - when to use each

Model | Rule example | Where useful

RBAC (role-based) | An editor may upload documents | Simple project owner/editor/viewer — matrix

ABAC (attribute-based) | Allow if classification=public and | Context, resource labels, environment — team=research                            constraints

ReBAC (relationship-based) | Alice is a member of the project that | Deep object hierarchies, sharing and — owns Document 88                         collaboration

OAuth scopes | Bearer token has screening/write | Coarse API capability gate

IAM ABAC | Principal tag team equals resource tag | AWS resource access, not arbitrary DB — team                                     rows

These models can be combined. A user may require an OAuth scope and project RBAC membership, and the project may additionally be classified as restricted. If policy logic becomes large or shared across many services, Amazon Verified Permissions can centralise decisions using policies and attributes. Your API still has to provide trustworthy principal, action and resource context to that engine. [18](chapter-12.md#ref-18)

## 9.8 A three-layer threat model for multi-tenant SaaS

Threat | What must stop it | Typical test

Bob guesses Alice’s project URL | FastAPI membership / resource | GET another tenant’s object ID returns — ownership                                403/404

Compromised app container reads all | Narrow ECS task role, bucket/KMS | GetObject outside expected task — customer buckets                               policy, isolation                        prefix denied

Developer mistakenly grants admin | Permissions review, Access Analyzer, | Detect unexpected * actions or — permissions                                    CI policy checks                         resources

User removed from project retains | Request-time database check and | Revoked membership denied — stale token claims                             short token lifetime                     immediately

Leaked presigned upload URL reused | Short expiry and tightly scoped signed | After expiry request fails; invalid object — request                                  rejected

For regulated document workflows, also think about audit logs, encrypted storage, tenancy boundaries, data retention, incident response and environments. IAM is powerful, but it cannot compensate for weak application-data isolation or insecure tenant queries.
