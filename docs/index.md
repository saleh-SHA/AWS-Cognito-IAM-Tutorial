<div class="home-hero">
  <div class="hero-copy">
    <div class="eyebrow">Technical learning guide | 19 November 2026</div>
    <h1>AWS Cognito<br><span>vs AWS IAM</span></h1>
    <p class="hero-subtitle">A complete practical tutorial</p>
    <p class="hero-lede">Understand exactly where authentication ends, where authorisation begins, and how identity, tokens, roles, policies, and application-level permissions work together.</p>
  </div>
  <div class="hero-visual">
    <div class="visual-top">Built around three realistic deployments</div>
    <ol class="deployment-list">
      <li>React + FastAPI + Cognito User Pool + PostgreSQL + S3</li>
      <li>Direct browser-to-S3 access through Cognito Identity Pool + IAM</li>
      <li>FastAPI on AWS ECS using task IAM roles to access AWS services</li>
    </ol>
  </div>
</div>

From fundamentals to production patterns, with architecture diagrams, working policy patterns, debugging strategies, review questions, and guided exercises.

## Contents

Begin with chapters 1–5 for the essential mental model; then choose the architecture and lab most relevant to your application. All code contains illustrative placeholders.

- [Contents](#contents) 2
- [1. The boundary: authentication is not the same as authorisation](foundations.md#1-the-boundary-authentication-is-not-the-same-as-authorisation) 3
- [2. Who uses which AWS identity service?](foundations.md#2-who-uses-which-aws-identity-service) 4
- [3. Cognito User Pools: the application login system](cognito.md#3-cognito-user-pools-the-application-login-system) 4
- [4. Cognito Identity Pools: the bridge to AWS credentials](cognito.md#4-cognito-identity-pools-the-bridge-to-aws-credentials) 5
- [5. IAM foundations: principal, action, resource, condition](iam.md#5-iam-foundations-principal-action-resource-condition) 6
- [6. IAM role assumption: trust policy vs permissions policy](iam.md#6-iam-role-assumption-trust-policy-vs-permissions-policy) 7
- [7. IAM evaluation: why an Allow may still be denied](iam.md#7-iam-evaluation-why-an-allow-may-still-be-denied) 8
- [8. Architecture A: React + Cognito + FastAPI + PostgreSQL](architecture-api.md#8-architecture-a-react-cognito-fastapi-postgresql) 9
- [9. Architecture B: direct S3 access with Identity Pools](architecture-s3.md#9-architecture-b-direct-s3-access-with-identity-pools) 12
- [10. Architecture C: roles for AWS workloads and microservices](architecture-workloads.md#10-architecture-c-roles-for-aws-workloads-and-microservices) 13
- [11. Advanced IAM: least privilege, ABAC, and federation](advanced-iam.md#11-advanced-iam-least-privilege-abac-and-federation) 14
- [12. Advanced application authorisation: groups are not enough](application-authorization.md#12-advanced-application-authorisation-groups-are-not-enough) 15
- [13. Realistic setup walkthrough: secure SaaS API](walkthrough.md#13-realistic-setup-walkthrough-secure-saas-api) 16
- [14. Guided labs: learn by doing](labs.md#14-guided-labs-learn-by-doing) 17
- [15. Troubleshooting playbook](troubleshooting.md#15-troubleshooting-playbook) 19
- [16. Security checklist and common mistakes](security.md#16-security-checklist-and-common-mistakes) 20
- [17. Knowledge check: 12 questions with answers](knowledge-check.md#17-knowledge-check-12-questions-with-answers) 20
- [18. Decision matrix, glossary, and official reading](reference.md#18-decision-matrix-glossary-and-official-reading) 21
