<div class="book-hero">
  <div class="book-hero__inner">
    <div class="book-hero__eyebrow">AWS Identity &amp; Security · Updated 19 November 2026</div>
    <h1 class="book-hero__title">Amazon Cognito <span>vs</span> AWS IAM</h1>
    <p class="book-hero__lede">An in-depth course from first principles to production architecture: detailed reasoning, fully traced requests, annotated policies and security exercises.</p>
    <div class="book-hero__rule"></div>
    <ol class="book-hero__steps">
      <li><b>01</b><span>Understand the boundary</span></li>
      <li><b>02</b><span>Follow the request</span></li>
      <li><b>03</b><span>Build securely</span></li>
    </ol>
    <div class="book-hero__actions">
      <a class="btn-primary" href="chapter-01/">Start reading</a>
      <a class="btn-ghost" href="AWS_Cognito_vs_IAM_Expanded_Deep_Dive_Tutorial.pdf">Download the PDF</a>
    </div>
  </div>
  <div class="book-hero__ring" aria-hidden="true"></div>
</div>

<p class="home-note">Expanded edition · Detailed architecture sequences · Realistic React/FastAPI/ECS scenarios · Policy walkthroughs · Hands-on labs with expected results</p>

<p class="path-eyebrow">Learning path</p>

## Contents

Expanded learning edition: work through Chapters 1-5 for the fundamental boundaries, Chapters 6-9 for production implementation, and Chapters 10-12 for guided labs and scenario-based review.

<div class="toc-list">
  <a class="toc-row" href="chapter-01/"><span class="toc-num">01</span><span class="toc-text"><b>The boundary in 60 seconds</b><small>The correct mental model</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-02/"><span class="toc-num">02</span><span class="toc-text"><b>The four identities you must distinguish</b><small>Users, roles, tokens and credentials</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-03/"><span class="toc-num">03</span><span class="toc-text"><b>Cognito User Pools, explained</b><small>Authentication and application-facing tokens</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-04/"><span class="toc-num">04</span><span class="toc-text"><b>IAM fundamentals and advanced controls</b><small>AWS principals and policy decisions</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-05/"><span class="toc-num">05</span><span class="toc-text"><b>Cognito Identity Pools and STS</b><small>Why Cognito can lead to IAM permissions</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-06/"><span class="toc-num">06</span><span class="toc-text"><b>Architecture A: React + FastAPI + ECS</b><small>Recommended backend-mediated SaaS pattern</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-07/"><span class="toc-num">07</span><span class="toc-text"><b>Architecture B: browser-to-S3 access</b><small>Using identity pools and IAM together</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-08/"><span class="toc-num">08</span><span class="toc-text"><b>Workloads, staff access and federation</b><small>ECS, machine-to-machine and Identity Center</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-09/"><span class="toc-num">09</span><span class="toc-text"><b>Advanced authorisation and tenancy</b><small>Scopes, groups, ABAC and permissions boundaries</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-10/"><span class="toc-num">10</span><span class="toc-text"><b>Hands-on learning labs</b><small>Build and test the concepts</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-11/"><span class="toc-num">11</span><span class="toc-text"><b>Common mistakes and troubleshooting</b><small>Diagnose AccessDenied and token errors</small></span><span class="toc-go">→</span></a>
  <a class="toc-row" href="chapter-12/"><span class="toc-num">12</span><span class="toc-text"><b>Decision framework and knowledge check</b><small>Select the right identity mechanism</small></span><span class="toc-go">→</span></a>
</div>

<p class="home-note">All identifiers, account numbers and bucket names in this guide are illustrative. Replace placeholders with your own AWS resources when practising.</p>
