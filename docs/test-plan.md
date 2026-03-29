# Claims Processing System — Test Plan

> **Last Updated:** 2026-03-29  
> **Status:** 🟡 In Progress  
> **Environment:** Local dev — Backend: http://localhost:4300 | Frontend: http://localhost:3000

---

## Pre-Conditions

- [ ] PostgreSQL running with `claims_db` database
- [ ] Backend running (`npm run dev:backend`)
- [ ] Frontend running (`npm run dev:frontend`)
- [ ] Seed data created (POST /api/v1/seed)

---

## 1. Health Check

| # | Test | Expected | Status |
|---|------|----------|--------|
| 1.1 | `GET /api/v1/health` | `200 { status: 'up', uptime, memory, system }` | 🔲 |

---

## 2. Seed Data

| # | Test | Expected | Status |
|---|------|----------|--------|
| 2.1 | `POST /api/v1/seed` | `200 { status: 'success', message: 'Database seeded successfully' }` | 🔲 |
| 2.2 | 2 members created | Alice Johnson + Bob Smith in DB | 🔲 |
| 2.3 | 2 policies created | POL-xxx (Standard, $500 deductible) + POL-xxx (Premium, $250 deductible) | 🔲 |
| 2.4 | 16 coverage rules created | 9 rules for policy 1, 7 for policy 2 | 🔲 |

---

## 3. Member API

| # | Test | Payload | Expected | Status |
|---|------|---------|----------|--------|
| 3.1 | `GET /api/v1/members` | — | 200, array with 2 seeded members | 🔲 |
| 3.2 | `GET /api/v1/members/1` | — | 200, Alice with `policy` association | 🔲 |
| 3.3 | `POST /api/v1/members` | valid payload | 201, new member | 🔲 |
| 3.4 | `POST /api/v1/members` (duplicate email) | same email | 409 Conflict | 🔲 |
| 3.5 | `POST /api/v1/members` (validation fail) | missing `email` | 400 ValidationError | 🔲 |

---

## 4. Policy API

| # | Test | Payload | Expected | Status |
|---|------|---------|----------|--------|
| 4.1 | `GET /api/v1/policies` | — | 200, array with coverage rules eager loaded | 🔲 |
| 4.2 | `GET /api/v1/policies/1` | — | 200, policy with `coverageRules` and `member` | 🔲 |
| 4.3 | `POST /api/v1/policies` | valid policy + coverage_rules | 201, policy with generated `policy_number` | 🔲 |
| 4.4 | `POST /api/v1/policies` (no coverage_rules) | missing coverage_rules | 400 ValidationError | 🔲 |

---

## 5. Claim Submission & Adjudication (Core)

| # | Test | Scenario | Expected | Status |
|---|------|----------|----------|--------|
| 5.1 | Submit claim — all covered | Alice, CONSULTATION + DIAGNOSTIC | 201, status=APPROVED, explanation shows % + amount | 🔲 |
| 5.2 | Submit claim — partial | Alice, CONSULTATION + DENTAL | 201, PARTIALLY_APPROVED, DENTAL line item DENIED=NOT_COVERED | 🔲 |
| 5.3 | Submit claim — all denied | Alice, policy=2, DENTAL+VISION at invalid amounts | 201, DENIED | 🔲 |
| 5.4 | Deductible applied | First claim for Bob (policy 2, $250 deductible), CONSULTATION $100 | Approved amount reduced by remaining deductible | 🔲 |
| 5.5 | Pre-auth required | Alice submits PROCEDURE claim | Status=UNDER_REVIEW, line item=UNDER_REVIEW | 🔲 |
| 5.6 | Policy inactive/expired | Modified test with expired policy | 201, DENIED=POLICY_INACTIVE | 🔲 |
| 5.7 | Invalid validation | Missing `line_items` | 400 ValidationError | 🔲 |

---

## 6. Claim State Machine

| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| 6.1 | APPROVED → PAID | `POST /claims/:id/transition` `{status: 'PAID'}` | 200, status=PAID, paid_amount set | 🔲 |
| 6.2 | APPROVED → DISPUTED | `POST /claims/:id/dispute` | 200, status=DISPUTED | 🔲 |
| 6.3 | DISPUTED → UNDER_REVIEW | `POST /claims/:id/transition` `{status: 'UNDER_REVIEW'}` | 200, re-enters review | 🔲 |
| 6.4 | PAID → CLOSED | `POST /claims/:id/transition` `{status: 'CLOSED'}` | 200, status=CLOSED | 🔲 |
| 6.5 | Invalid transition | `POST /claims/:id/transition` SUBMITTED → PAID | 422 BusinessRuleViolation | 🔲 |
| 6.6 | Re-adjudicate | `POST /claims/:id/adjudicate` on UNDER_REVIEW claim | 200, adjudication result | 🔲 |

---

## 7. Claim Filtering

| # | Test | Expected | Status |
|---|------|----------|--------|
| 7.1 | `GET /api/v1/claims?status=APPROVED` | Only APPROVED claims | 🔲 |
| 7.2 | `GET /api/v1/claims?member_id=1` | Only Alice's claims | 🔲 |
| 7.3 | `GET /api/v1/claims/:id` | Full claim with lineItems, member, policy.coverageRules | 🔲 |

---

## 8. Frontend UI Tests (Browser)

| # | Page | Test | Expected | Status |
|---|------|------|----------|--------|
| 8.1 | Dashboard | Load `http://localhost:3000` | Stats shown, no errors | 🔲 |
| 8.2 | Dashboard | Click "Seed Demo Data" | Success alert, stats update | 🔲 |
| 8.3 | Claims List | Navigate to `/claims` | Table with claims, status badges | 🔲 |
| 8.4 | Claims Filter | Filter by DENIED | Only denied claims shown | 🔲 |
| 8.5 | Submit Claim | Navigate to `/claims/new` | Form loads with members/policies dropdowns | 🔲 |
| 8.6 | Submit Claim | Submit: Alice, CONSULTATION + DIAGNOSTIC | Success: redirects to claim detail | 🔲 |
| 8.7 | Submit Claim | Submit: Alice, CONSULTATION + DENTAL | PARTIALLY_APPROVED result shown | 🔲 |
| 8.8 | Claim Detail | Navigate to claim detail | Shows adjudication results with explanations | 🔲 |
| 8.9 | Claim Detail | Click "Mark as Paid" (APPROVED claim) | Status changes to PAID, button disappears | 🔲 |
| 8.10 | Claim Detail | Click "Dispute" | Status changes to DISPUTED | 🔲 |
| 8.11 | Policies | Navigate to `/policies` | Coverage rules table for both policies | 🔲 |

---

## 9. Edge Cases

| # | Test | Expected | Status |
|---|------|----------|--------|
| 9.1 | Submit claim for non-existent member | 404 Not Found | 🔲 |
| 9.2 | `GET /claims/99999` (not found) | 404 Not Found | 🔲 |
| 9.3 | Dispute SUBMITTED claim (not disputable) | 422 UnprocessableEntity | 🔲 |

---

## Test Results Summary

| Suite | Total | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| Health | 1 | 0 | 0 | 0 |
| Seed | 4 | 0 | 0 | 0 |
| Members | 5 | 0 | 0 | 0 |
| Policies | 4 | 0 | 0 | 0 |
| Claims Core | 7 | 0 | 0 | 0 |
| State Machine | 6 | 0 | 0 | 0 |
| Filtering | 3 | 0 | 0 | 0 |
| Frontend UI | 11 | 0 | 0 | 0 |
| Edge Cases | 3 | 0 | 0 | 0 |
| **Total** | **44** | **0** | **0** | **0** |

---

## Notes / Issues Found

_Will be populated during test execution._
