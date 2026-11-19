# Chapter 2: The four identities you must distinguish

*Users, roles, tokens and credentials*

Many confusing diagrams become simple once you name the identity used at each hop.

## 2.1 Principal, user, role, and credential

| Thing | Meaning | Example |
| --- | --- | --- |
| App user | Person represented in your product | Alice, `sub = 8f…` in Cognito |
| IAM principal | AWS identity for an API request | `arn:aws:sts::…:assumed-role/RevUApiTask/…` |
| Role | AWS identity assumed for a session | ECS task role `RevUApiTask` |
| Credential | Proof presented to the relying service | JWT for your API; SigV4-signed AWS request |

## 2.2 Two different authentication mechanisms

- **Cognito authentication:** sign in with password, passkey, MFA or a federated provider. The user pool issues signed tokens that your application verifies.

- **AWS authentication:** AWS validates AWS credentials (for example, a SigV4-signed API request made with temporary STS access key, secret key and session token). A human can also authenticate to AWS via IAM Identity Center or, in legacy patterns, an IAM user.

- **IAM is not “authorisation only”:** IAM defines AWS identities and policies, while AWS authentication and STS establish the principal behind an AWS request. IAM Identity Center handles modern employee sign-in and federation.

## 2.3 Follow the identity, not just the user

<div class="flow">
  <div class="flow-step"><b>Alice</b><span>User Pool access JWT</span></div>
  <div class="flow-step"><b>FastAPI on ECS</b><span>Alice → app principal</span></div>
  <div class="flow-step"><b>Boto3 / S3</b><span>ECS role → AWS principal</span></div>
</div>
<p class="figure-caption">The user identity is used to decide which document to request; the task role is used to call S3.</p>

Suppose Alice requests `GET /projects/42/report`. Your API first validates Alice’s access token. It then checks whether Alice belongs to Project 42. Only then does it use its own IAM task role to fetch the object. S3 normally sees the task role, *not Alice’s Cognito user-pool sub*.

!!! note "Why a valid JWT is not enough"
    A valid token proves facts about a principal; it does not automatically prove ownership of a particular object, database row or project. Authorisation must check the requested action and resource.

## 2.4 Identity, credentials and permissions are three different things

An **identity** is a named principal or subject, such as a Cognito `sub` or an assumed IAM role. A **credential** is the evidence used to authenticate requests, such as a JWT or an access-key/secret-key/session-token triplet. A **permission** is a rule that permits an action on a resource. Different credentials can represent the same identity over time; a credential does not itself imply unlimited permissions.

| Example | Identity / principal | Credential | Policy or permission source |
| --- | --- | --- | --- |
| React user calling API | Cognito user identified by stable User Pool `sub` | Access JWT | API scopes plus project membership |
| FastAPI calling S3 | ECS task IAM role session | Temporary SigV4 credentials | IAM role policy + S3/KMS policy |
| Developer using AWS CLI | Workforce role session | Short-lived AWS credentials | IAM Identity Center permission set / role policy |
| Partner server calling product API | OAuth client (machine, not person) | OAuth access token | Custom scopes and tenant agreement |

## 2.5 What happens when a role is assumed?

1. A trusted actor begins with its own authentication. For example, an ECS task starts with a task-role configuration, or an employee signs in through workforce federation.

2. The role’s **trust policy** is consulted to determine whether the appropriate actor may request a session. For cross-account human or machine calls, the caller may also need permission to invoke `sts:AssumeRole`.

3. AWS creates a temporary **role session** with session credentials, optional session tags and applicable session restrictions.

4. The client signs each AWS request with those credentials. The AWS service evaluates its requested action and resource under the effective permission controls.

5. When credentials expire, an authorised environment or provider refreshes them. You do not create permanent access keys for the role.

A subtle but important point: the role is not the same as the **assumed-role session**. AWS CloudTrail can show an ARN such as `arn:aws:sts::123456789012:assumed-role/review-api-task/abc123`, identifying the temporary session rather than just the role definition.

## 2.6 IAM, IAM Identity Center and Cognito are not substitutes

IAM Identity Center is mainly a workforce access system. It lets an engineer or analyst authenticate via an organisation’s identity provider and receive authorised access to AWS accounts. Cognito User Pools are an application-user identity system. IAM roles are the mechanism by which AWS workloads and trusted federated users obtain AWS permissions. They can cooperate, but their audiences and enforcement points differ.

!!! note "Common confusion"
    A Cognito group named `Admin` is not the same object as an IAM group, and it does not automatically become `AdministratorAccess`. A Cognito group can influence Identity Pool role mapping if you deliberately configure that integration; it is not an intrinsic AWS-account permission.
