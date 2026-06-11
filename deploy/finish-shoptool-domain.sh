#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
CERT_ARN="arn:aws:acm:ap-southeast-1:235951409953:certificate/3b461dfd-ecce-414e-88f0-e44f69634f46"
ALB_ARN="arn:aws:elasticloadbalancing:ap-southeast-1:235951409953:loadbalancer/app/diy-store-alb/8a56d0cadcdb42d2"
HTTP_LISTENER_ARN="arn:aws:elasticloadbalancing:ap-southeast-1:235951409953:listener/app/diy-store-alb/8a56d0cadcdb42d2/2f3617426e5dcf30"

cert_status="$(aws acm describe-certificate \
  --region "$REGION" \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.Status' \
  --output text)"

if [[ "$cert_status" != "ISSUED" ]]; then
  echo "ACM certificate is $cert_status. Set registrar nameservers first, then rerun."
  exit 1
fi

target_group_arn() {
  aws elbv2 describe-target-groups \
    --region "$REGION" \
    --names "$1" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text
}

server_tg="$(target_group_arn diy-store-server-tg)"
customer_tg="$(target_group_arn diy-web-customer-tg)"
admin_tg="$(target_group_arn diy-web-admin-tg)"
driver_tg="$(target_group_arn diy-web-driver-tg)"
merchant_tg="$(target_group_arn diy-web-merchant-tg)"

https_listener_arn="$(aws elbv2 describe-listeners \
  --region "$REGION" \
  --load-balancer-arn "$ALB_ARN" \
  --query 'Listeners[?Port==`443`].ListenerArn | [0]' \
  --output text)"

if [[ "$https_listener_arn" == "None" ]]; then
  https_listener_arn="$(aws elbv2 create-listener \
    --region "$REGION" \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn="$CERT_ARN" \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions Type=forward,TargetGroupArn="$customer_tg" \
    --query 'Listeners[0].ListenerArn' \
    --output text)"
fi

ensure_rule() {
  local priority="$1"
  local tg_arn="$2"
  shift 2

  local existing
  existing="$(aws elbv2 describe-rules \
    --region "$REGION" \
    --listener-arn "$https_listener_arn" \
    --query "Rules[?Priority=='$priority'].RuleArn | [0]" \
    --output text)"

  if [[ "$existing" == "None" ]]; then
    aws elbv2 create-rule \
      --region "$REGION" \
      --listener-arn "$https_listener_arn" \
      --priority "$priority" \
      --conditions "Field=path-pattern,Values=$(IFS=,; echo "$*")" \
      --actions Type=forward,TargetGroupArn="$tg_arn" >/dev/null
  fi
}

ensure_rule 5 "$server_tg" /health
ensure_rule 10 "$server_tg" /shop-api /shop-api/*
ensure_rule 20 "$server_tg" /admin-api /admin-api/*
ensure_rule 30 "$server_tg" /assets /assets/*
ensure_rule 40 "$server_tg" /mailbox /mailbox/*
ensure_rule 100 "$admin_tg" /admin /admin/*
ensure_rule 110 "$driver_tg" /driver /driver/*
ensure_rule 120 "$merchant_tg" /supplier /supplier/*

http_rule_arns="$(aws elbv2 describe-rules \
  --region "$REGION" \
  --listener-arn "$HTTP_LISTENER_ARN" \
  --query 'Rules[?Priority!=`default`].RuleArn' \
  --output text)"

for rule_arn in $http_rule_arns; do
  aws elbv2 delete-rule \
    --region "$REGION" \
    --rule-arn "$rule_arn" >/dev/null
done

aws elbv2 modify-listener \
  --region "$REGION" \
  --listener-arn "$HTTP_LISTENER_ARN" \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' >/dev/null

echo "HTTPS listener is ready for shoptool.mn. Verify with:"
echo "curl -I https://shoptool.mn/health"
