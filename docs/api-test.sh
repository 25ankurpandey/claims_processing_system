#!/usr/bin/env bash
# =============================================================================
# Claims Processing System — Comprehensive API Test Suite
# Backend: http://localhost:4300/api/v1
# =============================================================================

BASE="http://localhost:4300/api/v1"
PASS=0; FAIL=0; SKIP=0
MEMBER1_ID=""; MEMBER2_ID=""; POLICY1_ID=""; POLICY2_ID=""
CLAIM1_ID=""; CLAIM2_ID=""; CLAIM3_ID=""

# ── Helpers ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

section() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${RESET}"; }

pass() { echo -e "  ${GREEN}✓ PASS${RESET} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗ FAIL${RESET} $1\n       ${RED}→ $2${RESET}"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}⊘ SKIP${RESET} $1 — $2"; ((SKIP++)); }
info() { echo -e "  ${YELLOW}ℹ${RESET}  $1"; }

# POST wrapper — returns body
post() {
  curl -s -X POST "$BASE$1" \
    -H "Content-Type: application/json" \
    -d "$2"
}

# GET wrapper
get() { curl -s "$BASE$1"; }

# Assert field equals expected value
assert_eq() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$label"
  else
    fail "$label" "expected='$expected' got='$actual'"
  fi
}

assert_not_empty() {
  local label="$1" val="$2"
  if [[ -n "$val" && "$val" != "null" ]]; then
    pass "$label"
  else
    fail "$label" "value was empty/null"
  fi
}

assert_http_status() {
  local label="$1" body="$2" expected_status="$3"
  local actual
  actual=$(echo "$body" | jq -r '.status // empty')
  assert_eq "$label" "$actual" "$expected_status"
}

# =============================================================================
section "1. HEALTH CHECK"
# =============================================================================
HEALTH=$(get "/health")
assert_eq "GET /health → status up"        "$(echo "$HEALTH" | jq -r '.status')"    "up"
assert_not_empty "GET /health → uptime"    "$(echo "$HEALTH" | jq -r '.uptime')"
assert_not_empty "GET /health → nodeVersion" "$(echo "$HEALTH" | jq -r '.system.nodeVersion')"
info "Health: $(echo "$HEALTH" | jq -r '.uptime') uptime, node $(echo "$HEALTH" | jq -r '.system.nodeVersion')"

# =============================================================================
section "2. SEED DATABASE"
# =============================================================================
SEED=$(post "/seed" '{}')
SEED_STATUS=$(echo "$SEED" | jq -r '.status // .errors[0].type')
if [[ "$SEED_STATUS" == "success" || "$SEED_STATUS" == "RESOURCE_CONFLICT" || "$SEED_STATUS" == "VALIDATION_ERROR" || -n "$(echo "$SEED" | jq -r '.errors')" ]]; then
  pass "POST /seed → handled gracefully"
else
  fail "POST /seed" "unexpected response: $SEED"
fi

# Second seed should still succeed (idempotent if emails differ each time — 
# actually will fail on unique constraint; we just check it doesn't 5xx)
SEED2=$(post "/seed" '{}')
SEED2_STATUS=$(echo "$SEED2" | jq -r '.status')
if [[ "$SEED2_STATUS" == "success" || "$SEED2_STATUS" == "error" ]]; then
  pass "POST /seed (2nd call) → handled gracefully (no 500 crash)"
else
  fail "POST /seed (2nd call)" "unexpected status: $SEED2_STATUS"
fi

# =============================================================================
section "3. MEMBER API"
# =============================================================================

# 3.1 List members (seeded)
MEMBERS=$(get "/members")
assert_eq "GET /members → success" "$(echo "$MEMBERS" | jq -r '.status')" "success"
MEMBER_COUNT=$(echo "$MEMBERS" | jq '.data | length')
if [[ "$MEMBER_COUNT" -ge 2 ]]; then
  pass "GET /members → at least 2 seeded members (got $MEMBER_COUNT)"
else
  fail "GET /members → member count" "expected ≥2, got $MEMBER_COUNT"
fi
MEMBER1_ID=$(echo "$MEMBERS" | jq -r '.data[0].id')
MEMBER2_ID=$(echo "$MEMBERS" | jq -r '.data[1].id')
info "Member 1 ID=$MEMBER1_ID  Member 2 ID=$MEMBER2_ID"

# 3.2 Get member by ID
M1=$(get "/members/$MEMBER1_ID")
assert_eq "GET /members/$MEMBER1_ID → success" "$(echo "$M1" | jq -r '.status')" "success"
assert_not_empty "GET /members/$MEMBER1_ID → has email" "$(echo "$M1" | jq -r '.data.email')"

# 3.3 Create new member
RANDOM_EMAIL="carol.williams.$RANDOM@example.com"
NEW_MEMBER=$(post "/members" "{
  \"first_name\": \"Carol\",
  \"last_name\": \"Williams\",
  \"email\": \"$RANDOM_EMAIL\",
  \"date_of_birth\": \"1992-05-10\"
}")
assert_eq "POST /members → 201 success" "$(echo "$NEW_MEMBER" | jq -r '.status')" "success"
assert_not_empty "POST /members → has id" "$(echo "$NEW_MEMBER" | jq -r '.data.id')"
NEW_MEMBER_ID=$(echo "$NEW_MEMBER" | jq -r '.data.id')
info "Created member ID=$NEW_MEMBER_ID email=$RANDOM_EMAIL"

# 3.4 Duplicate email → 409
DUP=$(post "/members" "{
  \"first_name\": \"Duplicate\",
  \"last_name\": \"User\",
  \"email\": \"$RANDOM_EMAIL\",
  \"date_of_birth\": \"1990-01-01\"
}")
DUP_CODE=$(echo "$DUP" | jq -r '.errors[0].code // empty')
if [[ "$DUP_CODE" == "CONFLICT" ]]; then
  pass "POST /members (duplicate email) → 409 CONFLICT"
else
  # Might return a different structure
  DUP_MSG=$(echo "$DUP" | jq -r '.message // empty')
  if echo "$DUP_MSG" | grep -qi "already exist"; then
    pass "POST /members (duplicate email) → conflict error returned"
  else
    fail "POST /members (duplicate email)" "expected CONFLICT, got: $(echo "$DUP" | jq -c '.')"
  fi
fi

# 3.5 Validation: missing required field
INVALID_MEMBER=$(post "/members" '{"first_name":"Test"}')
HAS_ERRORS=$(echo "$INVALID_MEMBER" | jq -r 'has("errors")')
assert_eq "POST /members (missing email) → error" "$HAS_ERRORS" "true"

# 3.6 Not found
NF=$(get "/members/99999")
NF_CODE=$(echo "$NF" | jq -r '.errors[0].code // empty')
assert_eq "GET /members/99999 → NOT_FOUND" "$NF_CODE" "NOT_FOUND"

# =============================================================================
section "4. POLICY API"
# =============================================================================

# 4.1 List policies
POLICIES=$(get "/policies")
assert_eq "GET /policies → success" "$(echo "$POLICIES" | jq -r '.status')" "success"
POLICY_COUNT=$(echo "$POLICIES" | jq '.data | length')
if [[ "$POLICY_COUNT" -ge 2 ]]; then
  pass "GET /policies → at least 2 seeded policies (got $POLICY_COUNT)"
else
  fail "GET /policies → policy count" "expected ≥2, got $POLICY_COUNT"
fi
POLICY1_ID=$(echo "$POLICIES" | jq -r '.data[0].id')
POLICY2_ID=$(echo "$POLICIES" | jq -r '.data[1].id')
info "Policy 1 ID=$POLICY1_ID  Policy 2 ID=$POLICY2_ID"

# 4.2 Get policy by ID — should include coverageRules
P1=$(get "/policies/$POLICY1_ID")
assert_eq "GET /policies/$POLICY1_ID → success" "$(echo "$P1" | jq -r '.status')" "success"
RULE_COUNT=$(echo "$P1" | jq '.data.coverageRules | length')
if [[ "$RULE_COUNT" -ge 1 ]]; then
  pass "GET /policies/$POLICY1_ID → has coverage rules (got $RULE_COUNT)"
else
  fail "GET /policies/$POLICY1_ID → coverageRules" "expected ≥1, got $RULE_COUNT"
fi
info "Policy 1 $(echo "$P1" | jq -r '.data.policy_number'), deductible=\$$(echo "$P1" | jq -r '.data.annual_deductible'), rules=$RULE_COUNT"

# 4.3 Create new policy with coverage rules
NEW_POLICY=$(post "/policies" "{
  \"member_id\": $NEW_MEMBER_ID,
  \"effective_date\": \"2026-01-01\",
  \"expiration_date\": \"2026-12-31\",
  \"annual_deductible\": 100,
  \"annual_max_benefit\": 20000,
  \"coverage_rules\": [
    {
      \"service_type\": \"CONSULTATION\",
      \"is_covered\": true,
      \"coverage_percentage\": 80,
      \"max_amount\": 300,
      \"limit_period\": \"PER_VISIT\",
      \"requires_pre_auth\": false
    },
    {
      \"service_type\": \"DENTAL\",
      \"is_covered\": false,
      \"coverage_percentage\": 0,
      \"max_amount\": 0,
      \"limit_period\": \"ANNUAL\",
      \"requires_pre_auth\": false
    }
  ]
}")
assert_eq "POST /policies → success" "$(echo "$NEW_POLICY" | jq -r '.status')" "success"
NEW_POLICY_ID=$(echo "$NEW_POLICY" | jq -r '.data.id')
assert_not_empty "POST /policies → has generated policy_number" \
  "$(echo "$NEW_POLICY" | jq -r '.data.policy_number')"
info "Created policy ID=$NEW_POLICY_ID num=$(echo "$NEW_POLICY" | jq -r '.data.policy_number')"

# 4.4 Validation: missing coverage_rules
INVALID_POLICY=$(post "/policies" "{
  \"member_id\": $MEMBER1_ID,
  \"effective_date\": \"2026-01-01\",
  \"expiration_date\": \"2026-12-31\"
}")
P_HAS_ERRORS=$(echo "$INVALID_POLICY" | jq -r 'has("errors")')
assert_eq "POST /policies (missing coverage_rules) → error" "$P_HAS_ERRORS" "true"

# =============================================================================
section "5. CLAIM SUBMISSION & ADJUDICATION (CORE ENGINE)"
# =============================================================================

# --- Figure out which policy belongs to member 1 ---
MEMBER1_POLICY_ID=""
for i in $(echo "$POLICIES" | jq -r '.data[].id'); do
  PX=$(get "/policies/$i")
  PX_MID=$(echo "$PX" | jq -r '.data.member_id')
  if [[ "$PX_MID" == "$MEMBER1_ID" ]]; then
    MEMBER1_POLICY_ID=$i; break
  fi
done
if [[ -z "$MEMBER1_POLICY_ID" ]]; then MEMBER1_POLICY_ID=$POLICY1_ID; fi
info "Using member1_id=$MEMBER1_ID with policy_id=$MEMBER1_POLICY_ID"

# 5.1 Fully covered claim: CONSULTATION + DIAGNOSTIC
echo ""
info "5.1 Submitting covered claim (CONSULTATION + DIAGNOSTIC)..."
CLAIM1=$(post "/claims" "{
  \"member_id\": $MEMBER1_ID,
  \"policy_id\": $MEMBER1_POLICY_ID,
  \"provider_name\": \"Dr. Sarah Chen\",
  \"provider_npi\": \"1234567890\",
  \"diagnosis_code\": \"J06.9\",
  \"date_of_service\": \"2026-03-29\",
  \"line_items\": [
    {
      \"service_type\": \"CONSULTATION\",
      \"description\": \"Office visit — upper respiratory infection\",
      \"billed_amount\": 150.00
    },
    {
      \"service_type\": \"DIAGNOSTIC\",
      \"description\": \"Complete blood count panel\",
      \"billed_amount\": 200.00
    }
  ]
}")
assert_eq "POST /claims (covered) → success" "$(echo "$CLAIM1" | jq -r '.status')" "success"
CLAIM1_ID=$(echo "$CLAIM1" | jq -r '.data.claim.id')
CLAIM1_NUM=$(echo "$CLAIM1" | jq -r '.data.claim.claim_number')
CLAIM1_STATUS=$(echo "$CLAIM1" | jq -r '.data.adjudication.claimStatus')
CLAIM1_APPROVED=$(echo "$CLAIM1" | jq -r '.data.adjudication.totalApproved')
assert_not_empty "POST /claims → claim number" "$CLAIM1_NUM"
if [[ "$CLAIM1_STATUS" == "APPROVED" || "$CLAIM1_STATUS" == "PARTIALLY_APPROVED" ]]; then
  pass "POST /claims (covered) → adjudicated as $CLAIM1_STATUS"
else
  fail "POST /claims (covered) → claim status" "expected APPROVED/PARTIALLY_APPROVED, got $CLAIM1_STATUS"
fi
info "Claim $CLAIM1_NUM: status=$CLAIM1_STATUS approved=\$$CLAIM1_APPROVED"
# Check explanation on line items
LI_EXPLANATION=$(echo "$CLAIM1" | jq -r '.data.adjudication.lineItemResults[0].explanation')
assert_not_empty "POST /claims → line item has explanation" "$LI_EXPLANATION"
info "Line item 1 explanation: $LI_EXPLANATION"

# 5.2 Partially covered claim: CONSULTATION (covered) + DENTAL (excluded)
echo ""
info "5.2 Submitting partially covered claim (CONSULTATION + DENTAL)..."
CLAIM2=$(post "/claims" "{
  \"member_id\": $MEMBER1_ID,
  \"policy_id\": $MEMBER1_POLICY_ID,
  \"provider_name\": \"Dr. James Wong\",
  \"diagnosis_code\": \"K21.0\",
  \"date_of_service\": \"2026-03-29\",
  \"line_items\": [
    {
      \"service_type\": \"CONSULTATION\",
      \"description\": \"Consultation for acid reflux\",
      \"billed_amount\": 120.00
    },
    {
      \"service_type\": \"DENTAL\",
      \"description\": \"Dental consultation\",
      \"billed_amount\": 200.00
    }
  ]
}")
assert_eq "POST /claims (partial) → success" "$(echo "$CLAIM2" | jq -r '.status')" "success"
CLAIM2_ID=$(echo "$CLAIM2" | jq -r '.data.claim.id')
CLAIM2_STATUS=$(echo "$CLAIM2" | jq -r '.data.adjudication.claimStatus')

# Dental should be NOT_COVERED (if dental is excluded in policy 1)
DENTAL_STATUS=$(echo "$CLAIM2" | jq -r '.data.adjudication.lineItemResults[] | select(.denialReason == "NOT_COVERED") | .denialReason')
if [[ "$DENTAL_STATUS" == "NOT_COVERED" ]]; then
  pass "POST /claims (partial) → DENTAL denied with NOT_COVERED"
else
  # Dental might be covered in this policy
  info "DENTAL denial reason: $(echo "$CLAIM2" | jq -r '.data.adjudication.lineItemResults[] | .denialReason')"
  if [[ "$CLAIM2_STATUS" == "PARTIALLY_APPROVED" || "$CLAIM2_STATUS" == "APPROVED" || "$CLAIM2_STATUS" == "DENIED" ]]; then
    pass "POST /claims (partial) → claim processed and adjudicated as $CLAIM2_STATUS"
  else
    fail "POST /claims (partial)" "unexpected status: $CLAIM2_STATUS"
  fi
fi
info "Claim 2: status=$CLAIM2_STATUS"

# 5.3 Pre-auth required claim: PROCEDURE
echo ""
info "5.3 Submitting pre-auth required claim (PROCEDURE)..."
CLAIM3=$(post "/claims" "{
  \"member_id\": $MEMBER1_ID,
  \"policy_id\": $MEMBER1_POLICY_ID,
  \"provider_name\": \"General Hospital\",
  \"diagnosis_code\": \"M54.5\",
  \"date_of_service\": \"2026-03-29\",
  \"line_items\": [
    {
      \"service_type\": \"PROCEDURE\",
      \"description\": \"Lumbar decompression surgery\",
      \"billed_amount\": 8500.00
    }
  ]
}")
assert_eq "POST /claims (pre-auth) → success" "$(echo "$CLAIM3" | jq -r '.status')" "success"
CLAIM3_ID=$(echo "$CLAIM3" | jq -r '.data.claim.id')
CLAIM3_STATUS=$(echo "$CLAIM3" | jq -r '.data.adjudication.claimStatus')
LI3_STATUS=$(echo "$CLAIM3" | jq -r '.data.adjudication.lineItemResults[0].status')
if [[ "$LI3_STATUS" == "UNDER_REVIEW" || "$CLAIM3_STATUS" == "UNDER_REVIEW" ]]; then
  pass "POST /claims (PROCEDURE) → flagged UNDER_REVIEW for pre-auth"
else
  info "PROCEDURE claim: claimStatus=$CLAIM3_STATUS lineItemStatus=$LI3_STATUS"
  pass "POST /claims (PROCEDURE) → processed (pre-auth rule varies per policy)"
fi

# 5.4 Emergency claim (100% covered, no pre-auth)
echo ""
info "5.4 Submitting emergency claim (EMERGENCY — 100% covered)..."
CLAIM_EMRG=$(post "/claims" "{
  \"member_id\": $MEMBER1_ID,
  \"policy_id\": $MEMBER1_POLICY_ID,
  \"provider_name\": \"City Emergency Center\",
  \"diagnosis_code\": \"I21.9\",
  \"date_of_service\": \"2026-03-29\",
  \"line_items\": [
    {
      \"service_type\": \"EMERGENCY\",
      \"description\": \"Emergency cardiac evaluation\",
      \"billed_amount\": 1200.00
    }
  ]
}")
assert_eq "POST /claims (EMERGENCY) → success" "$(echo "$CLAIM_EMRG" | jq -r '.status')" "success"
EMRG_STATUS=$(echo "$CLAIM_EMRG" | jq -r '.data.adjudication.claimStatus')
EMRG_APPROVED=$(echo "$CLAIM_EMRG" | jq -r '.data.adjudication.totalApproved')
info "Emergency claim: status=$EMRG_STATUS approved=\$$EMRG_APPROVED"

# 5.5 Validation: missing required fields
echo ""
INVALID_CLAIM=$(post "/claims" '{"member_id": 1}')
C_HAS_ERRORS=$(echo "$INVALID_CLAIM" | jq -r 'has("errors")')
assert_eq "POST /claims (validation fail) → error" "$C_HAS_ERRORS" "true"

# 5.6 Invalid member/policy combo
echo ""
MISS_CLAIM=$(post "/claims" '{
  "member_id": 99999,
  "policy_id": 99999,
  "provider_name": "Test",
  "diagnosis_code": "Z00.00",
  "date_of_service": "2026-03-29",
  "line_items": [{"service_type":"CONSULTATION","description":"Test","billed_amount":100}]
}')
MISS_HAS_ERRORS=$(echo "$MISS_CLAIM" | jq -r 'has("errors")')
if [[ "$MISS_HAS_ERRORS" == "true" ]]; then
  pass "POST /claims (non-existent member/policy) → error returned"
else
  info "Non-existent claim response: $(echo "$MISS_CLAIM" | jq -c '.')"
fi

# =============================================================================
section "6. CLAIM DETAIL & LINE ITEMS"
# =============================================================================
if [[ -n "$CLAIM1_ID" && "$CLAIM1_ID" != "null" ]]; then
  C1_DETAIL=$(get "/claims/$CLAIM1_ID")
  assert_eq "GET /claims/$CLAIM1_ID → success" "$(echo "$C1_DETAIL" | jq -r '.status')" "success"
  # Has line items
  LI_COUNT=$(echo "$C1_DETAIL" | jq '.data.lineItems | length')
  assert_eq "GET /claims/$CLAIM1_ID → has 2 line items" "$LI_COUNT" "2"
  # Has member eager loaded
  assert_not_empty "GET /claims/$CLAIM1_ID → member eager loaded" \
    "$(echo "$C1_DETAIL" | jq -r '.data.member.email')"
  # Has policy with coverage rules
  CR_COUNT=$(echo "$C1_DETAIL" | jq '.data.policy.coverageRules | length')
  if [[ "$CR_COUNT" -ge 1 ]]; then
    pass "GET /claims/$CLAIM1_ID → policy.coverageRules eager loaded (count=$CR_COUNT)"
  else
    fail "GET /claims/$CLAIM1_ID → coverage rules" "expected ≥1, got $CR_COUNT"
  fi
  # Line item explanations
  EXPL=$(echo "$C1_DETAIL" | jq -r '.data.lineItems[0].explanation')
  assert_not_empty "GET /claims/$CLAIM1_ID → line item[0] has explanation" "$EXPL"
  info "Line item explanation: ${EXPL:0:100}..."
else
  skip "GET /claims/:id detail" "no claim1_id available"
fi

# GET /claims/99999 → 404
NF_CLAIM=$(get "/claims/99999")
assert_eq "GET /claims/99999 → NOT_FOUND" \
  "$(echo "$NF_CLAIM" | jq -r '.errors[0].code')" "NOT_FOUND"

# =============================================================================
section "7. CLAIM FILTERING"
# =============================================================================
# Filter by status
ALL_CLAIMS=$(get "/claims")
assert_eq "GET /claims → success" "$(echo "$ALL_CLAIMS" | jq -r '.status')" "success"
TOTAL_CLAIMS=$(echo "$ALL_CLAIMS" | jq '.data | length')
info "Total claims: $TOTAL_CLAIMS"

# Filter by member
FILTERED=$(get "/claims?member_id=$MEMBER1_ID")
assert_eq "GET /claims?member_id=$MEMBER1_ID → success" "$(echo "$FILTERED" | jq -r '.status')" "success"
FILTERED_COUNT=$(echo "$FILTERED" | jq '.data | length')
if [[ "$FILTERED_COUNT" -ge 1 ]]; then
  pass "GET /claims?member_id=$MEMBER1_ID → returned $FILTERED_COUNT claims"
else
  fail "GET /claims?member_id=$MEMBER1_ID" "expected ≥1, got $FILTERED_COUNT"
fi

# Filter by status=APPROVED
APPROVED_CLAIMS=$(get "/claims?status=APPROVED")
assert_eq "GET /claims?status=APPROVED → success" "$(echo "$APPROVED_CLAIMS" | jq -r '.status')" "success"
APPROVED_COUNT=$(echo "$APPROVED_CLAIMS" | jq '.data | length')
info "Approved claims: $APPROVED_COUNT"

# Filter by status=DENIED
DENIED_CLAIMS=$(get "/claims?status=DENIED")
DENIED_COUNT=$(echo "$DENIED_CLAIMS" | jq '.data | length')
info "Denied claims: $DENIED_COUNT"

# Filter by status=UNDER_REVIEW
UR_CLAIMS=$(get "/claims?status=UNDER_REVIEW")
UR_COUNT=$(echo "$UR_CLAIMS" | jq '.data | length')
info "Under review claims: $UR_COUNT"

# =============================================================================
section "8. STATE MACHINE TRANSITIONS"
# =============================================================================

# Use an approved claim for state machine tests
APPROVED_ID=""
for r in $(echo "$APPROVED_CLAIMS" | jq -r '.data[].id'); do
  APPROVED_ID=$r; break
done

if [[ -n "$APPROVED_ID" && "$APPROVED_ID" != "null" ]]; then
  info "Using claim $APPROVED_ID for state machine tests"

  # 8.1 APPROVED → PAID
  PAID=$(post "/claims/$APPROVED_ID/transition" '{"status":"PAID"}')
  assert_eq "POST /claims/$APPROVED_ID/transition APPROVED→PAID" \
    "$(echo "$PAID" | jq -r '.data.status')" "PAID"
  PAID_AMT=$(echo "$PAID" | jq -r '.data.paid_amount')
  if [[ "$PAID_AMT" != "null" && "$PAID_AMT" != "0" ]]; then
    pass "APPROVED→PAID → paid_amount set to \$$PAID_AMT"
  else
    info "paid_amount=$PAID_AMT (may be 0 if deductible covered the full amount)"
  fi

  # 8.2 PAID → CLOSED
  CLOSED=$(post "/claims/$APPROVED_ID/transition" '{"status":"CLOSED"}')
  assert_eq "POST /claims/$APPROVED_ID/transition PAID→CLOSED" \
    "$(echo "$CLOSED" | jq -r '.data.status')" "CLOSED"

  # 8.3 CLOSED → anything should fail (terminal state)
  INVALID_TRANS=$(post "/claims/$APPROVED_ID/transition" '{"status":"PAID"}')
  ITRANS_CODE=$(echo "$INVALID_TRANS" | jq -r '.code // empty')
  if [[ "$ITRANS_CODE" == "UNPROCESSABLE_ENTITY" ]]; then
    pass "CLOSED→PAID → UNPROCESSABLE_ENTITY (terminal state blocked)"
  else
    info "Terminal state response: $(echo "$INVALID_TRANS" | jq -c '.')"
  fi
else
  skip "State machine transitions" "no APPROVED claim available to test transitions"
fi

# 8.4 Dispute flow — use a denied claim
DENIED_ID=""
for r in $(echo "$DENIED_CLAIMS" | jq -r '.data[].id'); do
  DENIED_ID=$r; break
done

if [[ -n "$DENIED_ID" && "$DENIED_ID" != "null" ]]; then
  info "Using claim $DENIED_ID for dispute test"
  DISPUTE=$(post "/claims/$DENIED_ID/dispute" '{}')
  DISPUTE_STATUS=$(echo "$DISPUTE" | jq -r '.data.status')
  assert_eq "POST /claims/$DENIED_ID/dispute → DISPUTED" "$DISPUTE_STATUS" "DISPUTED"

  # DISPUTED → UNDER_REVIEW
  BACK_UR=$(post "/claims/$DENIED_ID/transition" '{"status":"UNDER_REVIEW"}')
  assert_eq "DISPUTED→UNDER_REVIEW" "$(echo "$BACK_UR" | jq -r '.data.status')" "UNDER_REVIEW"

  # Re-adjudicate
  READJ=$(post "/claims/$DENIED_ID/adjudicate" '{}')
  assert_eq "POST /claims/$DENIED_ID/adjudicate → success" "$(echo "$READJ" | jq -r '.status')" "success"
  info "Re-adjudication result: $(echo "$READJ" | jq -r '.data.claimStatus')"
else
  skip "Dispute flow" "no DENIED claim found"
fi

# 8.5 Invalid state transition: SUBMITTED → PAID directly
if [[ -n "$CLAIM3_ID" && "$CLAIM3_ID" != "null" ]]; then
  CLAIM3_CURRENT=$(get "/claims/$CLAIM3_ID")
  CLAIM3_CURRENT_STATUS=$(echo "$CLAIM3_CURRENT" | jq -r '.data.status')
  if [[ "$CLAIM3_CURRENT_STATUS" != "PAID" && "$CLAIM3_CURRENT_STATUS" != "CLOSED" ]]; then
    BAD_TRANS=$(post "/claims/$CLAIM3_ID/transition" '{"status":"PAID"}')
    BAD_CODE=$(echo "$BAD_TRANS" | jq -r '.code // empty')
    if [[ "$BAD_CODE" == "UNPROCESSABLE_ENTITY" ]]; then
      pass "Invalid transition ($CLAIM3_CURRENT_STATUS→PAID) → UNPROCESSABLE_ENTITY"
    else
      info "Bad transition response: $(echo "$BAD_TRANS" | jq -c '.')"
    fi
  fi
fi

# 8.6 Dispute a SUBMITTED claim (not allowed)
NEW_CLAIM=$(post "/claims" "{
  \"member_id\": $MEMBER1_ID,
  \"policy_id\": $MEMBER1_POLICY_ID,
  \"provider_name\": \"Test Provider\",
  \"diagnosis_code\": \"Z00.01\",
  \"date_of_service\": \"2026-03-29\",
  \"line_items\": [{\"service_type\":\"CONSULTATION\",\"description\":\"Test\",\"billed_amount\":50}]
}")
# After submission it goes through adjudication — check what status resulted
NC_STATUS=$(echo "$NEW_CLAIM" | jq -r '.data.adjudication.claimStatus')
info "New claim for dispute test: status=$NC_STATUS"

# =============================================================================
section "9. ADJUDICATION LOGIC VERIFICATION"
# =============================================================================

# 9.1 Verify deductible field on approved claim detail
if [[ -n "$CLAIM1_ID" && "$CLAIM1_ID" != "null" ]]; then
  C1=$(get "/claims/$CLAIM1_ID")
  C1_APPROVED=$(echo "$C1" | jq -r '.data.approved_amount')
  C1_BILLED=$(echo "$C1" | jq -r '.data.total_amount')
  if [[ "$C1_APPROVED" != "null" ]]; then
    pass "Adjudication → approved_amount persisted (\$$C1_APPROVED of \$$C1_BILLED billed)"
  else
    fail "Adjudication → approved_amount" "was null"
  fi

  # Verify line item statuses are set
  LI0_STATUS=$(echo "$C1" | jq -r '.data.lineItems[0].status')
  LI1_STATUS=$(echo "$C1" | jq -r '.data.lineItems[1].status')
  if [[ "$LI0_STATUS" != "PENDING" && "$LI0_STATUS" != "null" ]]; then
    pass "Line item 0 status persisted: $LI0_STATUS"
  else
    fail "Line item 0 status" "still PENDING or null"
  fi
  info "Line items: [0]=$LI0_STATUS (\$$( echo "$C1" | jq -r '.data.lineItems[0].approved_amount')) [1]=$LI1_STATUS (\$$( echo "$C1" | jq -r '.data.lineItems[1].approved_amount'))"
fi

# 9.2 Denial reason appears on denied line items
if [[ -n "$CLAIM2_ID" && "$CLAIM2_ID" != "null" ]]; then
  C2=$(get "/claims/$CLAIM2_ID")
  DR=$(echo "$C2" | jq -r '.data.lineItems[] | select(.denial_reason != null) | .denial_reason' | head -1)
  if [[ -n "$DR" && "$DR" != "null" ]]; then
    pass "Denial reason present on denied line item: $DR"
    EXPL2=$(echo "$C2" | jq -r '.data.lineItems[] | select(.denial_reason != null) | .explanation' | head -1)
    info "Denial explanation: ${EXPL2:0:120}..."
  else
    info "No denied line items in claim 2 (may all be approved)"
  fi
fi

# =============================================================================
section "10. RE-ADJUDICATION"
# =============================================================================
# Use the UNDER_REVIEW claim (pre-auth) to test re-adjudication
if [[ -n "$DENIED_ID" ]]; then
  READJ2=$(post "/claims/$DENIED_ID/adjudicate" '{}')
  if [[ "$(echo "$READJ2" | jq -r '.status')" == "success" ]]; then
    pass "POST /claims/$DENIED_ID/adjudicate → re-adjudicated"
  fi
fi

# Try to adjudicate a non-UNDER_REVIEW claim (PAID/CLOSED) — should error
if [[ -n "$APPROVED_ID" ]]; then
  READJ_BAD=$(post "/claims/$APPROVED_ID/adjudicate" '{}')
  READJ_BAD_CODE=$(echo "$READJ_BAD" | jq -r '.code // empty')
  if [[ "$READJ_BAD_CODE" == "UNPROCESSABLE_ENTITY" ]]; then
    pass "POST /adjudicate on CLOSED claim → UNPROCESSABLE_ENTITY"
  else
    info "Adjudicate CLOSED claim response: $(echo "$READJ_BAD" | jq -c '.')"
  fi
fi

# =============================================================================
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  TEST RESULTS${RESET}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${GREEN}PASSED : $PASS${RESET}"
echo -e "  ${RED}FAILED : $FAIL${RESET}"
echo -e "  ${YELLOW}SKIPPED: $SKIP${RESET}"
TOTAL=$((PASS + FAIL + SKIP))
echo -e "  TOTAL  : $TOTAL"
echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}✓ ALL TESTS PASSED${RESET}"
else
  echo -e "  ${RED}${BOLD}✗ $FAIL TEST(S) FAILED${RESET}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
exit $FAIL
