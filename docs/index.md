<div class="home-hero">
  <div class="hero-copy">
    <div class="eyebrow"><span class="eyebrow-dot"></span> FIELD GUIDE&nbsp; / &nbsp;IDENTITY + ACCESS</div>
    <h1>AWS Cognito<br><span>vs AWS IAM</span></h1>
    <p class="hero-subtitle">A complete practical tutorial</p>
    <p class="hero-lede">Understand exactly where authentication ends, where authorisation begins, and how identity, tokens, roles, policies, and application-level permissions work together.</p>
    <div class="hero-actions">
      <a class="action-primary" href="foundations/">Start with the fundamentals <span aria-hidden="true">↗</span></a>
      <a class="action-secondary" href="AWS_Cognito_vs_IAM_Practical_Tutorial.pdf">Get the PDF <span aria-hidden="true">↓</span></a>
    </div>
    <div class="hero-meta"><span>18 chapters</span><i></i><span>3 deployment patterns</span><i></i><span>Hands-on labs</span></div>
  </div>
  <div class="hero-visual" aria-label="Identity and access flow illustration">
    <div class="visual-top"><span>ONE REQUEST, THREE CHECKS</span><span class="live-dot"></span></div>
    <div class="flow-stack">
      <div class="flow-node"><div class="flow-icon user-icon">01</div><div><b>Person</b><small>Who is signing in?</small></div><span class="flow-tag">IDENTITY</span></div>
      <div class="flow-link"><span></span><small>JWT</small></div>
      <div class="flow-node"><div class="flow-icon app-icon">02</div><div><b>Your application</b><small>Can they access this project?</small></div><span class="flow-tag">BUSINESS RULES</span></div>
      <div class="flow-link"><span></span><small>task role</small></div>
      <div class="flow-node"><div class="flow-icon aws-icon">03</div><div><b>AWS service</b><small>Can this role read this object?</small></div><span class="flow-tag">IAM</span></div>
    </div>
    <div class="visual-foot"><span>AUTHENTICATION</span><span class="foot-line"></span><span>AUTHORIZATION</span></div>
  </div>
</div>

<div class="signal-strip">
  <div><span class="signal-number">01</span><span><b>Learn the boundary</b><small>Identity is not entitlement</small></span></div>
  <div><span class="signal-number">02</span><span><b>Choose an architecture</b><small>Backend, direct S3, or workload</small></span></div>
  <div><span class="signal-number">03</span><span><b>Build with confidence</b><small>Policies, labs, and diagnostics</small></span></div>
</div>

## Choose your architecture

<div class="path-grid">
  <a class="path-card path-featured" href="architecture-api/"><span class="card-kicker">PATTERN 01&nbsp; / &nbsp;MOST COMMON</span><span class="card-title">API-backed SaaS</span><span class="card-copy">Cognito signs users in. Your API checks project membership. An ECS task role accesses S3.</span><span class="card-bottom">React · FastAPI · PostgreSQL · S3 <b>↗</b></span></a>
  <a class="path-card" href="architecture-s3/"><span class="card-kicker">PATTERN 02</span><span class="card-title">Direct browser-to-S3</span><span class="card-copy">Exchange a trusted identity for temporary, tightly scoped AWS credentials.</span><span class="card-bottom">Identity Pool · STS · IAM <b>↗</b></span></a>
  <a class="path-card" href="architecture-workloads/"><span class="card-kicker">PATTERN 03</span><span class="card-title">AWS workloads</span><span class="card-copy">Give each service its own role and only the permissions its work requires.</span><span class="card-bottom">ECS · task roles · microservices <b>↗</b></span></a>
</div>

## The mental model

<div class="mental-model">
  <div><span class="model-index">A</span><b>Cognito User Pool</b><p>Signs a person into your application and issues tokens.</p></div>
  <div><span class="model-index">B</span><b>Your application</b><p>Decides which person can access which tenant, project, or record.</p></div>
  <div><span class="model-index">C</span><b>IAM</b><p>Authenticates AWS requests and grants access to AWS resources.</p></div>
</div>

<div class="bottom-cta"><div><span class="card-kicker">START HERE</span><h3>First, separate the two questions.</h3><p>Who is making this request? And what are they allowed to do?</p></div><a href="foundations/">Explore the fundamentals <span>↗</span></a></div>

---

<div class="home-note">Examples use illustrative resource names and policy values. Adapt and review them for your AWS account and threat model.</div>
