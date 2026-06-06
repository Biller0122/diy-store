# GitHub AWS OIDC Setup

GitHub Actions should deploy with short-lived AWS credentials from OIDC, not
long-lived access keys.

## 1. Create GitHub Environment

In GitHub:

1. Open the repository settings.
2. Open Environments.
3. Create `production`.
4. Add required reviewers if you want a manual approval before production
   deploys.

## 2. Create OIDC Provider In AWS

If the AWS account does not already have a GitHub OIDC provider, create one for:

```text
https://token.actions.githubusercontent.com
```

Use audience:

```text
sts.amazonaws.com
```

## 3. Create IAM Role

Create a role named something like:

```text
diy-store-github-production-deploy
```

Use this trust policy. Replace `<account-id>`, `<github-owner>`, and
`<github-repo>`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:<github-owner>/<github-repo>:environment:production"
        }
      }
    }
  ]
}
```

## 4. Attach Deploy Permission Policy

Start with this policy and tighten it after the first successful deploy.
Replace `<account-id>`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": [
        "arn:aws:ecr:ap-southeast-1:<account-id>:repository/diy-store-server",
        "arn:aws:ecr:ap-southeast-1:<account-id>:repository/diy-store-web"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::<account-id>:role/*ecs*",
        "arn:aws:iam::<account-id>:role/*ECS*",
        "arn:aws:iam::<account-id>:role/diy-store-*"
      ]
    }
  ]
}
```

## 5. Add GitHub Secret

In GitHub Environment `production`, add:

```text
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/diy-store-github-production-deploy
```

## 6. Add GitHub Variables

Add these as repository variables or production environment variables:

```text
AWS_REGION=ap-southeast-1
ECS_CLUSTER=diy-store-prod
SERVER_SERVICE=diy-store-server
CUSTOMER_WEB_SERVICE=diy-store-web-customer
ADMIN_WEB_SERVICE=diy-store-web-admin
DRIVER_WEB_SERVICE=diy-store-web-driver
MERCHANT_WEB_SERVICE=diy-store-web-merchant
SERVER_ECR_REPOSITORY=diy-store-server
WEB_ECR_REPOSITORY=diy-store-web
SERVER_CONTAINER_NAME=server
WEB_CONTAINER_NAME=web
PRODUCTION_BASE_URL=http://diy-store-alb-418459496.ap-southeast-1.elb.amazonaws.com
```

If the first deploy says it cannot find container `server` or `web`, inspect the
current ECS task definition container names and update `SERVER_CONTAINER_NAME`
or `WEB_CONTAINER_NAME`.

## 7. First Deploy Test

In GitHub Actions:

1. Open `Deploy Production`.
2. Click `Run workflow`.
3. Set `deploy_server` to `true`.
4. Set `deploy_web` to `true`.
5. Run it.

The workflow should build images, update ECS, wait for stability, and smoke test
the public routes.

## Current AWS Setup

The AWS side has been created for this repo:

```text
AWS account: 235951409953
OIDC provider: arn:aws:iam::235951409953:oidc-provider/token.actions.githubusercontent.com
Deploy role: arn:aws:iam::235951409953:role/diy-store-github-production-deploy
GitHub trust subject: repo:Biller0122/diy-store:environment:production
```

Use this exact GitHub environment secret:

```text
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::235951409953:role/diy-store-github-production-deploy
```
