# Investor Portal User Manual

This manual is for the investor only.

It explains how to use the investor portal in a simple and professional way.

This manual does **not** cover admin panel usage.

## 1. What The Investor Portal Is

The investor portal is your personal dashboard for:

1. viewing your investment position
2. checking allocations and profit runs
3. reviewing payout status
4. requesting withdrawals
5. managing KYC documents
6. submitting profile or bank update requests
7. downloading statements
8. receiving notifications

## 2. Main Menu

After login, you will normally see these menu items:

1. `Dashboard`
2. `Ledger`
3. `Allocations`
4. `Profit Runs`
5. `Payouts`
6. `Withdrawals`
7. `Statements`
8. `Documents`
9. `Profile`
10. `Notifications`

## 3. Recommended Usage Order

If you are using the portal for the first time, follow this order:

1. open `Dashboard`
2. open `Profile`
3. open `Documents`
4. check `Notifications`
5. then use `Ledger`, `Allocations`, `Profit Runs`, `Payouts`, `Withdrawals`, and `Statements`

## 4. Dashboard

### Route

- `/investor/dashboard`

### What you see

The dashboard gives you a quick summary of your account.

Typical items include:

1. total credit
2. total debit
3. net balance
4. active allocations
5. unread notifications
6. pending profile requests

### How to use it

Use the dashboard first whenever you log in.

It helps you quickly understand:

1. whether your account has recent activity
2. whether you have pending requests
3. whether any payout or document update may need your attention

## 5. Profile

### Route

- `/investor/profile`

### What you can do

You can review:

1. your investor name
2. legal and identity information
3. bank details
4. KYC status
5. beneficiary verification status

You can also submit profile update requests.

### When to use it

Use this page when:

1. your phone number changed
2. your email changed
3. your legal information changed
4. your bank details changed

### Important

Profile changes do not always update instantly.

Some sensitive changes go through internal review first.

If legal, tax, identity, or bank information changes, supporting verification may be required again.

## 6. Documents

### Route

- `/investor/documents`

### What you can do

You can:

1. see required KYC documents
2. check which documents are already uploaded
3. see document review status
4. upload a missing document
5. re-submit a rejected or reopened document

### Common document statuses

1. `PENDING`
   - uploaded but not reviewed yet
2. `UNDER_REVIEW`
   - currently under review or re-verification
3. `VERIFIED`
   - accepted
4. `REJECTED`
   - not accepted, needs correction or replacement

### Best practice

If the page shows missing or under-review documents, resolve them as early as possible.

## 7. Notifications

### Route

- `/investor/notifications`

### What you receive notifications for

You may get notifications for:

1. document review result
2. profile request approved or rejected
3. payout approved, rejected, held, released, paid, or voided
4. withdrawal request submitted, approved, rejected, or settled
5. statement ready or dispatched

### How to use it

This should be your second most-used page after Dashboard.

Use it to know:

1. what changed
2. what was approved
3. what needs follow-up

## 8. Ledger

### Route

- `/investor/ledger`

### What it means

The ledger shows the financial movement of your investor account.

Typical entries may include:

1. capital contribution
2. profit allocation
3. distribution
4. withdrawal
5. adjustment

### How to read it

1. `CREDIT` means money/value added to your investor account
2. `DEBIT` means money/value reduced from your investor account

Use this page when you want to understand:

1. why your balance changed
2. whether a withdrawal or payout was posted
3. whether profit was allocated to you

## 9. Allocations

### Route

- `/investor/allocations`

### What it shows

This page shows which product variants or investment products you are allocated to.

Typical information:

1. product or variant name
2. participation percentage
3. committed amount
4. status

### Why it matters

Your allocation determines how much of a product’s profit belongs to you.

## 10. Profit Runs

### Route

- `/investor/profit-runs`

### What it shows

This page shows your product-wise profit distribution history.

Typical information:

1. profit run number
2. period
3. status
4. allocated revenue
5. allocated net profit
6. payout result if available

### How to use it

Use this page to understand:

1. which period profit was calculated
2. how much profit was allocated to you
3. whether payout has been created from that run

## 11. Payouts

### Route

- `/investor/payouts`

### What it shows

This page shows your payout history and current payout status.

Possible statuses may include:

1. `PENDING_APPROVAL`
2. `APPROVED`
3. `REJECTED`
4. `PAID`
5. `VOID`

### How to use it

Use this page to know:

1. whether your profit payout is approved
2. whether it has been paid
3. whether it was held, rejected, or voided

If you are waiting for a payment, this page is more useful than the profit run page.

## 12. Withdrawals

### Route

- `/investor/withdrawals`

### What it does

This page is used when you want to request capital withdrawal.

### What you can see

1. available balance
2. active committed amount
3. pending payout amount
4. pending withdrawal amount
5. withdrawable balance

### Important meaning

Your `withdrawable balance` may be lower than your total ledger balance.

That is normal.

This happens because part of your balance may already be tied to:

1. active commitments
2. pending payouts
3. other pending withdrawal requests

### How to submit a withdrawal request

1. open `Withdrawals`
2. enter requested amount
3. select requested settlement date if needed
4. add a note if necessary
5. submit

### Before a request can work

Normally these conditions must be valid:

1. your investor status must be active
2. your KYC should be verified
3. your beneficiary or bank verification should be complete
4. the amount must not exceed withdrawable balance

### What happens after submission

1. request is submitted
2. internal team reviews it
3. it may be approved or rejected
4. if approved, it will later be settled
5. once settled, a withdrawal ledger entry is posted

## 13. Statements

### Route

- `/investor/statements`

### What it is for

This page lets you review and download your statement.

### What you can do

1. choose date range
2. apply filter
3. review credits, debits, and net movement
4. review transactions
5. review payouts
6. export CSV
7. export PDF

### Best use

Use statements when you need:

1. a summary of your account activity
2. reporting for a period
3. supporting document for review or reconciliation

## 14. What To Check Regularly

To avoid confusion, check these pages regularly:

1. `Dashboard`
2. `Notifications`
3. `Payouts`
4. `Withdrawals`
5. `Documents`

## 15. Common Situations

### Situation A: You changed bank details

Go to:

- `/investor/profile`

Then:

1. submit update request
2. wait for internal review
3. watch notifications

Important:

Bank changes may require beneficiary verification again.

### Situation B: You uploaded a document but KYC is still not verified

Go to:

- `/investor/documents`
- `/investor/notifications`

Check:

1. was the document reviewed yet?
2. was any document reopened for re-verification?
3. is any required document still missing?

### Situation C: You are expecting profit but do not see payment yet

Check in this order:

1. `/investor/profit-runs`
2. `/investor/payouts`
3. `/investor/notifications`

Reason:

- profit can be calculated before payout is approved or paid

### Situation D: You want to withdraw money but the amount is blocked

Go to:

- `/investor/withdrawals`

Check:

1. withdrawable balance
2. active committed amount
3. pending payouts
4. pending withdrawals

If withdrawable balance is lower than expected, that usually means some part of your capital is still reserved.

## 16. Common Questions

### Why does my KYC go back to `UNDER_REVIEW`?

This may happen if sensitive profile data changed, such as:

1. legal information
2. tax information
3. identity information
4. bank-related information

In that case, supporting documents may need to be checked again.

### Why is my payout not marked paid yet?

Possible reasons:

1. still pending approval
2. on hold
3. payment proof or internal processing not complete

### Why is my withdrawable balance lower than my total balance?

Because not all balance is immediately available for withdrawal.

Some portion may be reserved for:

1. active commitments
2. pending payouts
3. pending withdrawal requests

### Why is a statement empty?

Possible reasons:

1. selected date range has no activity
2. no ledger transaction in that period
3. no payout activity in that period

## 17. Smart Usage Rules

1. Start from `Dashboard`
2. Use `Notifications` every time you log in
3. Use `Documents` if KYC is not fully clear
4. Use `Payouts` to track payment result
5. Use `Withdrawals` only after checking withdrawable balance
6. Use `Statements` for formal export and reporting

## 18. Quick Menu Guide

If you want to:

See overall account summary:

- `Dashboard`

Check balance movement:

- `Ledger`

See where your investment is allocated:

- `Allocations`

See profit calculation result:

- `Profit Runs`

Check payment result:

- `Payouts`

Request money withdrawal:

- `Withdrawals`

Download statement:

- `Statements`

Upload or re-submit KYC files:

- `Documents`

Update personal or bank details:

- `Profile`

Check latest updates:

- `Notifications`

## 19. Final Simple Rule

Use the portal in this order:

`Dashboard -> Notifications -> Profile/Documents -> Profit Runs/Payouts -> Withdrawals -> Statements`

If you follow this order, the portal will stay easy to understand.
