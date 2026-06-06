# CI/CD Guide

This repo deploys production from GitHub Actions to AWS ECS Fargate. The goal is
simple: a teammate can make a safe code change, open a pull request, and let the
pipeline test and deploy it.

## Current Production Shape

Production already runs on:

- ECS cluster: `diy-store-prod`
- Backend service: `diy-store-server`
- Web services: `diy-store-web-customer`, `diy-store-web-admin`,
  `diy-store-web-driver`, `diy-store-web-merchant`
- ECR repositories: `diy-store-server`, `diy-store-web`
- Public entrypoint:
  `http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com`
- Backend routes: `/health`, `/shop-api`, `/admin-api`, `/assets`, `/mailbox`
- Web routes: `/`, `/admin`, `/driver`, `/supplier`

## Workflows

### `.github/workflows/ci.yml`

Runs on pull requests and pushes to `main`.

It does:

- install dependencies with `npm ci --legacy-peer-deps`
- lint `apps/server` and `apps/web`
- build the deployable apps
- run server and web unit tests

This workflow is the safety gate. A beginner should only merge a pull request
after CI is green.

### `.github/workflows/deploy-prod.yml`

Runs after a push to `main` when production code changed, or manually from the
GitHub Actions tab.

It does:

- authenticate to AWS with GitHub OIDC
- build and push Docker images to ECR
- update ECS task definitions
- update the affected ECS services
- wait for ECS stability
- smoke test production routes

The workflow deploys only what changed:

| Changed path | Deployment |
| --- | --- |
| `apps/server/**` | backend ECS service |
| `apps/web/**` | all four web portal ECS services |
| `packages/**` | backend and web services |
| `package.json`, `package-lock.json`, `turbo.json` | backend and web services |
| Markdown/docs/progress files only | no production deploy |

## GitHub Setup

Create a GitHub Environment named `production`.

Detailed AWS OIDC setup is in [GITHUB_AWS_OIDC.md](GITHUB_AWS_OIDC.md).

Add this environment secret:

| Name | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN that GitHub Actions can assume |

Add these repository or environment variables:

| Name | Default | Purpose |
| --- | --- | --- |
| `AWS_REGION` | `ap-southeast-1` | AWS region |
| `ECS_CLUSTER` | `diy-store-prod` | ECS cluster |
| `SERVER_SERVICE` | `diy-store-server` | Backend service |
| `CUSTOMER_WEB_SERVICE` | `diy-store-web-customer` | Customer portal service |
| `ADMIN_WEB_SERVICE` | `diy-store-web-admin` | Admin portal service |
| `DRIVER_WEB_SERVICE` | `diy-store-web-driver` | Driver portal service |
| `MERCHANT_WEB_SERVICE` | `diy-store-web-merchant` | Merchant portal service |
| `SERVER_ECR_REPOSITORY` | `diy-store-server` | Backend ECR repository |
| `WEB_ECR_REPOSITORY` | `diy-store-web` | Web ECR repository |
| `SERVER_CONTAINER_NAME` | `server` | Backend container name in the ECS task definition |
| `WEB_CONTAINER_NAME` | `web` | Web container name in the ECS task definition |
| `PRODUCTION_BASE_URL` | ALB URL | Public base URL for smoke tests and web rewrites |
| `NEXT_PUBLIC_SOCKET_URL` | empty | Socket URL if realtime is public |

After custom domains are added, change `PRODUCTION_BASE_URL` to the production
domain. The workflow will build web rewrites against the new base URL.

## AWS OIDC Role

Use GitHub OIDC instead of long-lived AWS keys.

The IAM role needs permission to:

- push images to the two ECR repositories
- describe, register, and update ECS task definitions and services
- pass the existing ECS task execution/task roles

Keep the trust policy restricted to this repository and the `production`
GitHub environment.

## Beginner Release Process

1. Create a branch from `main`.
2. Change code locally.
3. Run `npm run lint`, `npm run build:prod`, and `npm run test:ci`.
4. Push the branch.
5. Open a pull request into `main`.
6. Wait for CI to pass.
7. Ask for review.
8. Merge to `main`.
9. Watch `Deploy Production` in GitHub Actions.
10. Confirm the smoke test step passed.

If the deploy fails, do not keep merging more changes. Open the failed workflow,
read the first failed step, and roll back or fix forward.

## Manual Deploy

Use manual deploy when CI/CD setup changes or when a previous deploy was skipped.

In GitHub:

1. Open Actions.
2. Choose `Deploy Production`.
3. Click `Run workflow`.
4. Choose whether to force backend deploy, web deploy, or both.

## Rollback

The fastest rollback is to redeploy the previous ECS task definition revision.

Example:

```bash
aws ecs update-service \
  --cluster diy-store-prod \
  --service diy-store-server \
  --task-definition diy-store-server:<previous-revision>
```

Then wait for stability:

```bash
aws ecs wait services-stable \
  --cluster diy-store-prod \
  --services diy-store-server
```

For web rollback, repeat the same pattern for each web service.

## Production Rules

- Do not source `.env.aws-local` before AWS CLI commands.
- Do not put production secrets in GitHub repository files.
- Keep production secrets in AWS SSM Parameter Store.
- Do not deploy directly from a laptop unless GitHub Actions is unavailable.
- Keep `progress.md` updated after meaningful production changes.
