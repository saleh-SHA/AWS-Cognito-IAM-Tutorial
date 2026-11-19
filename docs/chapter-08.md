# Chapter 8: Workloads, staff access and federation

*ECS, machine-to-machine and Identity Center*

“Who is the user?” is not always the right question. Sometimes the actor is a service, a CI job or an employee.

## 8.1 ECS: execution role vs application task role

| Role | Assumed/used by | Allowed actions (examples) |
| --- | --- | --- |
| ECS execution role | ECS agent | Pull ECR image, write CloudWatch Logs |
| ECS task role | Your FastAPI process | Read one S3 prefix, read a Secrets Manager secret |

Give each workload the minimum needed task-role permissions. Prefer the AWS SDK credential chain instead of storing AWS access keys as environment variables. Use distinct task roles for services with different privileges. [14](chapter-12.md#ref-14)

## 8.2 A secure employee deployment flow

<div class="flow">
  <div class="flow-step"><b>Engineer</b><span>IAM Identity Center sign-in</span></div>
  <div class="flow-step"><b>Permission set</b><span>Resolves to IAM role</span></div>
  <div class="flow-step"><b>AWS CLI</b><span>Uses temporary credentials</span></div>
  <div class="flow-step"><b>ECS control plane</b><span>Checks role policies</span></div>
</div>
<p class="figure-caption">A customer’s Cognito User Pool is not the normal way to grant staff AWS console access.</p>

AWS IAM Identity Center is the usual entry point for workforce access to AWS accounts; it federates with your corporate identity provider if needed and assigns roles via permission sets. It is separate from Cognito User Pools, whose focus is your application’s end users. [7](chapter-12.md#ref-7)

## 8.3 Machine-to-machine (M2M): decide which boundary you mean

| Scenario | Typical approach | What authorises the call? |
| --- | --- | --- |
| Partner’s server calls your product API | Cognito user-pool OAuth client credentials + custom scopes | API validates access token and its scopes, and app checks partner entitlements |
| FastAPI container calls S3 | ECS IAM task role | IAM permission and applicable resource policies |
| CI/CD job deploys to AWS | OIDC federation into IAM role / STS | IAM trust and permissions policies |
| Cross-account AWS service call | STS AssumeRole into target account | Role trust, caller permissions, target policies and org controls |

## 8.4 ECS task role vs execution role - a troubleshooting case

Your FastAPI ECS task starts, pulls its image, and writes logs to CloudWatch successfully. But on the first document request, boto3 raises `AccessDenied` for `s3:GetObject`. Why? The execution role may have all permissions needed to start the task, while the **task role**, which your code uses, lacks the required object permission. Adding S3 read to the execution role usually does not solve the application call.

| Operation | Actor / credential | IAM role to review |
| --- | --- | --- |
| Pull image from ECR | ECS agent during startup | Task execution role |
| Deliver standard task logs | ECS logging configuration/agent | Task execution role |
| FastAPI calls S3 | Your application via boto3 | Task role |
| FastAPI calls Secrets Manager at runtime | Your application via AWS SDK | Task role |
| ECS injects configured task-definition secret at launch | ECS execution process | Task execution role |

For tasks launched on EC2 capacity, isolation also depends on container and host security. A task role is not a complete defence against compromised containers. Ensure task-to-task isolation, networking and host metadata access are designed appropriately. [14](chapter-12.md#ref-14)

## 8.5 How role credentials reach your application

On ECS, task-role credentials are exposed through a container credential provider endpoint. The SDK credential chain discovers those temporary credentials. That is why code like `boto3.client("s3")` works without hard-coded keys. Credential rotation is handled by the platform/provider; do not copy the session tokens into configuration files. When troubleshooting, run `GetCallerIdentity` in a controlled environment and examine which principal you are actually using.

```python title="Small diagnostic snippet; never log secrets or share full container environment"
import boto3

identity = boto3.client("sts").get_caller_identity()
print("AWS account:", identity["Account"])
print("AWS caller ARN:", identity["Arn"])
# Example: arn:aws:sts::123456789012:assumed-role/revu-api-task/<session>
```

## 8.6 Cross-account role assumption with a real sequence

Imagine that a production API runs in Account A but must read a restricted analytics bucket in Account B. Account B creates a target IAM role whose trust policy permits Account A’s API task role. Account A grants its task role permission to call `sts:AssumeRole` for that target. The API calls STS, receives credentials for the Account B role session, and then calls S3 with those new credentials. The S3 request is evaluated for that target session in the destination account.

<div class="flow">
  <div class="flow-step"><b>ECS task role A</b><span>Caller identity</span></div>
  <div class="flow-step"><b>STS AssumeRole</b><span>Cross-account trust</span></div>
  <div class="flow-step"><b>Role session B</b><span>New temporary credentials</span></div>
  <div class="flow-step"><b>S3 bucket B</b><span>Permission evaluation</span></div>
</div>
<p class="figure-caption">Trust grants entry to the target role; permissions on the target role grant AWS operations.</p>

Use short sessions, a narrow target policy, and clear session names; consider external ID where third-party cross-account access presents a confused-deputy risk. Keep these cross-account AWS credentials separate from Cognito JWTs used for your human application users.

## 8.7 When two microservices communicate

Suppose a screening service calls an extraction service. Three different requirements may exist. For a public or partner API, OAuth client-credentials tokens can authenticate the calling client and convey custom scopes. For service-to-AWS calls such as reading SQS, use each service’s own IAM task role. If one API must act “on behalf of” a logged-in user, it needs a deliberate propagation/delegation strategy rather than blindly forwarding an all-powerful token; verify the downstream service audience, caller identity and requested resource permissions.

A strong design gives the screening and extraction services **different IAM task roles**. If screening only enqueues jobs and extraction reads documents, do not grant both roles the union of all permissions. Use correlation IDs to connect their application authorisation decisions with their individual AWS calls.
