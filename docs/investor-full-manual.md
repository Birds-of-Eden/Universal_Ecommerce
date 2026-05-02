# Investor User Manual

This manual explains how to use the Investor module safely and correctly.

It is written for two user groups:

1. Internal operations / finance / reviewer users
2. Investor portal users

Use this manual as the default operating guide for onboarding, capital tracking, profit runs, payouts, withdrawals, statements, and notifications.

## 1. Module Overview

The Investor module covers the full investor lifecycle:

1. Investor onboarding
2. KYC and document verification
3. Portal access
4. Capital ledger
5. Product allocation
6. Profit run governance
7. Payout governance
8. Withdrawal governance
9. Statements and reporting
10. Notifications and activity log

## 2. Main Routes

### Admin routes

- `/admin/investors`
- `/admin/investors/registry`
- `/admin/investors/documents`
- `/admin/investors/profile-requests`
- `/admin/investors/portal-access`
- `/admin/investors/ledger`
- `/admin/investors/allocations`
- `/admin/investors/profit-runs`
- `/admin/investors/payouts`
- `/admin/investors/withdrawals`
- `/admin/investors/retained-profit`
- `/admin/investors/statements`
- `/admin/investors/statement-schedules`
- `/admin/investors/notifications`
- `/admin/investors/activity-log`

### Investor portal routes

- `/investor/dashboard`
- `/investor/ledger`
- `/investor/allocations`
- `/investor/profit-runs`
- `/investor/payouts`
- `/investor/withdrawals`
- `/investor/statements`
- `/investor/documents`
- `/investor/profile`
- `/investor/notifications`

## 3. Roles

The most common roles are:

### Internal roles

- `investor_relations_manager`
- `investor_analyst`
- `investor_document_reviewer`
- `investor_profile_request_reviewer`
- `investor_profit_manager`
- `investor_profit_approver`
- `investor_profit_poster`
- `investor_payout_manager`
- `investor_payout_approver`
- `investor_payout_payer`
- `investor_payout_void_manager`
- `investor_withdrawal_reviewer`
- `investor_withdrawal_settler`
- `investor_portal_access_manager`
- `finance`

### External role

- `investor_portal`

## 4. Recommended Operating Order

Use the module in this order:

1. Create investor
2. Upload and review KYC documents
3. Approve sensitive profile requests if any
4. Assign portal access
5. Post capital transactions
6. Create allocations
7. Run and approve profit calculations
8. Post approved profit runs
9. Create and settle payouts
10. Review statements and schedules
11. Handle withdrawal requests separately

## 5. Investor Onboarding

### Step 1: Create investor

Go to:

- `/admin/investors/registry`

Required fields:

- Investor name
- Legal name
- Email
- Phone
- Tax number if applicable
- Bank name
- Bank account name
- Bank account number

Expected result:

- investor record created
- investor detail page available

### Step 2: Open investor detail

Go to:

- `/admin/investors/[id]`

Use this page to review:

- investor overview
- current KYC status
- portal access summary
- bank / identity info
- change requests
- activity history

## 6. KYC And Document Governance

### Admin upload / review

Go to:

- `/admin/investors/documents`

Use this page to:

- upload required KYC files
- verify documents
- reject documents
- reopen documents for re-verification

Typical document types:

- `IDENTITY_PROOF`
- `TAX_IDENTIFICATION`
- `BANK_PROOF`
- `ADDRESS_PROOF`
- `INVESTMENT_AGREEMENT`
- `SOURCE_OF_FUNDS`

### KYC rules

Investor KYC status is document-driven:

- `PENDING` = not complete
- `UNDER_REVIEW` = docs waiting for review or re-verification
- `VERIFIED` = required docs verified
- `REJECTED` = required doc rejected

Important:

- If approved profile changes affect legal, tax, identity, or bank data, related documents may return to `UNDER_REVIEW`.

## 7. Profile Requests

### Investor portal submits request

Go to:

- `/investor/profile`

Portal user can submit requests to update:

- phone
- email
- legal name
- tax number
- national ID
- passport
- bank details

### Admin review

Go to:

- `/admin/investors/profile-requests`

Admin can:

- approve request
- reject request with note

Important rules:

- requester cannot approve own request
- identity / compliance change may force KYC re-review
- bank change resets beneficiary verification

## 8. Portal Access

Go to:

- `/admin/investors/portal-access`

Use this page to map an investor to a portal-enabled user.

Do this only after:

1. investor master is correct
2. KYC workflow is acceptable
3. portal ownership is clear

## 9. Capital Ledger

Go to:

- `/admin/investors/ledger`

Purpose:

- record investor capital movement

Supported transaction types include:

- `CAPITAL_COMMITMENT`
- `CAPITAL_CONTRIBUTION`
- `PROFIT_ALLOCATION`
- `LOSS_ALLOCATION`
- `DISTRIBUTION`
- `WITHDRAWAL`
- `ADJUSTMENT`

### Typical example

If investor deposits capital:

- type: `CAPITAL_CONTRIBUTION`
- direction: `CREDIT`
- variant: `GENERAL_POOL` if no blank option exists

### Ledger rule

- debit cannot exceed available ledger balance

## 10. Allocations

Go to:

- `/admin/investors/allocations`

Purpose:

- define how much of a product variant belongs to each investor

Example:

- Investor: `Rahim Capital`
- Variant: `S-73899-...`
- Participation: `25%`
- Committed Amount: `125000`
- Status: `ACTIVE`

### Allocation rules

- same investor + same variant overlapping active allocation is not allowed
- total active participation for a variant cannot exceed `100%`
- if a variant is only partially allocated, remaining share is treated as company retained share

## 11. Profit Runs

Go to:

- `/admin/investors/profit-runs`

Purpose:

- calculate investor profit share for a date range

### Basic flow

1. create run
2. review run detail
3. approve or reject
4. post approved run

### Important

- posted run is the basis for payout drafts
- if a variant is only partially allocated, investor gets only allocated share
- unallocated share is treated as company retained profit

### Review page

Use the run detail page to check:

- variants included
- allocation lines
- governance warnings
- company retained share

## 12. Retained Profit

Go to:

- `/admin/investors/retained-profit`

Purpose:

- show the company’s retained share when a variant is not fully investor-allocated

Example:

- Investor A: `25%`
- Investor B: `25%`
- Company retained: `50%`

This page is for internal reporting, not investor portal visibility.

## 13. Payouts

Go to:

- `/admin/investors/payouts`

Purpose:

- generate and settle investor payout drafts from posted profit runs

### Flow

1. payout draft created from posted run
2. approver reviews
3. payout may be held or rejected
4. payment proof is uploaded
5. payout is marked paid
6. if needed, approved or paid payout may be voided

### Rules

- beneficiary must be verified
- payment proof is required before `PAID`
- paid / approved payout can be voided according to permission

## 14. Withdrawals

Withdrawals are separate from payouts.

### Investor portal

Go to:

- `/investor/withdrawals`

Portal user can:

- see available balance
- see active committed amount
- see pending payout amount
- see pending withdrawal amount
- see final withdrawable balance
- submit withdrawal request
- track request status

### Admin

Go to:

- `/admin/investors/withdrawals`

Admin can:

- review request
- approve request
- reject request
- settle approved request

### Withdrawal rules

Withdrawal request requires:

- investor status `ACTIVE`
- KYC `VERIFIED`
- verified beneficiary
- amount must be within withdrawable balance

Withdrawable balance is conservative:

- `ledger balance - active committed amount - pending payouts - pending withdrawals`

### Settlement result

When settled:

- a final `WITHDRAWAL` ledger debit is posted
- request becomes `SETTLED`
- investor receives notification

## 15. Statements

### Admin statements

Go to:

- `/admin/investors/statements`

Use this page to:

- choose investor scope
- choose date range
- preview transactions and payouts
- export CSV or PDF

### Investor statements

Go to:

- `/investor/statements`

Portal user can:

- set date range
- review own statement
- export CSV
- export PDF

## 16. Statement Schedules

Go to:

- `/admin/investors/statement-schedules`

Purpose:

- automate recurring statement dispatch

Use this page to:

- create schedule
- pause / resume schedule
- run immediately
- monitor due and overdue schedules

## 17. Notifications

### Internal notifications

Go to:

- `/admin/investors/notifications`

These are for internal users such as:

- document reviewers
- profit approvers
- payout payers
- withdrawal reviewers / settlers

### Investor portal notifications

Go to:

- `/investor/notifications`

Portal user gets notifications for:

- document review outcome
- profile request outcome
- payout status
- withdrawal request / status
- statement dispatch

## 18. Activity Log

Go to:

- `/admin/investors/activity-log`

Use this page to audit:

- onboarding activity
- KYC actions
- profile reviews
- ledger postings
- allocation creation
- profit run actions
- payout actions
- withdrawal actions
- schedule actions

## 19. Common Scenarios

### Scenario A: New investor onboarding

1. create investor
2. upload KYC docs
3. verify docs
4. assign portal access
5. post contribution
6. create allocation

### Scenario B: Investor profit distribution

1. ensure allocations are correct
2. create profit run
3. approve run
4. post run
5. create payout draft
6. approve payout
7. upload proof
8. pay payout

### Scenario C: Investor wants to withdraw capital

1. investor opens `/investor/withdrawals`
2. investor submits withdrawal request
3. reviewer approves or rejects
4. settler settles approved request
5. withdrawal ledger entry is posted

## 20. Troubleshooting

### Problem: KYC shows `UNDER_REVIEW` even though documents were previously verified

Cause:

- approved profile changes affected identity, tax, legal, or bank data

Action:

1. open `/admin/investors/documents`
2. verify reopened document
3. confirm KYC returns to `VERIFIED`

### Problem: Profit run cannot be approved

Check:

1. are there variant lines?
2. are there allocation lines?
3. are there governance blockers?

### Problem: Payout cannot be marked paid

Check:

1. beneficiary verified?
2. payment proof uploaded?
3. payout still on hold?

### Problem: Withdrawal request fails

Check:

1. investor is `ACTIVE`
2. KYC is `VERIFIED`
3. beneficiary verified
4. amount does not exceed withdrawable balance

### Problem: Statement export looks empty

Check:

1. correct date range
2. ledger or payout activity exists in selected period
3. investor scope selected correctly

## 21. Best Practice Rules

1. Do not assign portal access before basic KYC readiness.
2. Do not treat ledger balance and withdrawable balance as the same thing.
3. Do not create profit runs before allocations are reviewed.
4. Do not mark payouts paid without proof.
5. Do not settle withdrawals before final re-check of investor status, KYC, and beneficiary.
6. Use activity log for dispute review and audit.
7. Use notifications as event inbox, not as final source of truth.

## 22. Quick Reference

### If you need to...

Create investor:

- `/admin/investors/registry`

Review KYC:

- `/admin/investors/documents`

Review portal profile request:

- `/admin/investors/profile-requests`

Post contribution:

- `/admin/investors/ledger`

Create allocation:

- `/admin/investors/allocations`

Run investor profit:

- `/admin/investors/profit-runs`

Manage payout:

- `/admin/investors/payouts`

Manage withdrawal:

- `/admin/investors/withdrawals`

Preview statements:

- `/admin/investors/statements`

Open investor notifications:

- `/admin/investors/notifications`

Open investor audit:

- `/admin/investors/activity-log`

## 23. Final Operating Principle

Use the Investor module in this sequence:

`Onboard -> Verify -> Fund -> Allocate -> Calculate -> Approve -> Post -> Settle -> Report`

If this sequence stays clean, the module remains auditable and operationally stable.
