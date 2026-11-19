# 10. Architecture C: roles for AWS workloads and microservices

In a multi-service ECS deployment, different containers/services should ideally use different least-privilege task roles, even if all users authenticate against one Cognito User Pool.

| Web client | API ECS service | Queue / worker | Data services |
| --- | --- | --- | --- |
| Cognito access token | API task role: S3 read | Worker role: SQS + S3 | IAM checks each AWS call |

*Figure 6. User identity and AWS workload identities are distinct.*

## Example roles and policies

| Component | IAM grants | Do not grant |
| --- | --- | --- |
| API ECS task role | Read/write authorised upload bucket prefix; enqueue task | AdministratorAccess; broad unrelated buckets |
| Background worker task role | Consume specific SQS queue; read files; write results bucket | Public sign-in functions; all S3 buckets |
| Task execution role | Pull specific ECR images; emit logs; retrieve configured secrets | Business-data S3 permissions unless operationally required |
| Human CI/CD deployment role | Deploy ECS, update task definitions, constrained iam:PassRole | Permanent admin credentials in GitHub secrets |

Important nuance: IAM does not know that a task processed “Project 42” simply because FastAPI authenticated its caller. Unless you explicitly implement trusted tenant context or isolated roles/resources, a single backend role often has AWS-level access across many tenants. Enforce tenant separation in the API, data layer and object-key design.

## Machine-to-machine scenarios

If one internal service calls your private application API, use an appropriate service-to-service identity model. Cognito User Pools can support OAuth client-credentials for M2M APIs. Separately, when an AWS workload calls an AWS service, use its task/compute role and SigV4. A Cognito OAuth access token and an STS AWS credential session are different tools for different endpoints.
