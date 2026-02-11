# Security Model (Firestore)

This document describes how data access is protected in **Fluxo de Caixa Pessoal**.

## Goals

- Ensure that **only the authenticated user** can read/write their own financial data.
- Prevent cross-user access even if a malicious client attempts to guess document IDs or craft custom requests.
- Keep the model simple for now, with a clear path to future **family/shared access**.

## Current data model (v1)

- Firestore uses **global collections**:
  - `accounts`
  - `budgets`
  - `categories`
  - `creditCards`
  - `transactions`
  - `userSettings`
  - `users`

### Ownership field

For user-scoped collections (`accounts`, `budgets`, `categories`, `creditCards`, `transactions`), each document contains:

- `userId: string` — the Firebase Auth UID of the owner.

For the `users` collection, documents are keyed by UID:

- `users/{uid}`

For `userSettings`, documents are keyed by UID:

- `userSettings/{uid}`

## Authentication

All reads/writes require Firebase Authentication.

- If `request.auth == null` → deny.

## Firestore Security Rules (v1)

Rules follow these principles:

1) **Deny by default**

- Any document path not explicitly matched is denied.

2) **Owner-only access for user-scoped collections**

- `read/delete` allowed only if `resource.data.userId == request.auth.uid`
- `create` allowed only if `request.resource.data.userId == request.auth.uid`
- `update` allowed only if:
  - `resource.data.userId == request.auth.uid` and
  - `request.resource.data.userId == resource.data.userId` (immutability)

3) **UID-keyed personal docs**

- `users/{uid}` and `userSettings/{uid}` allow read/write only when `request.auth.uid == uid`.

### Why we enforce `userId` immutability

Without immutability, an attacker who can write their own docs could try to update `userId` to another UID (or vice versa) to hijack ownership semantics.

## Required invariants (app responsibilities)

The application must ensure:

- Every created doc in `accounts/budgets/categories/creditCards/transactions` always includes a correct `userId`.
- Queries are always filtered by `userId == currentUser.uid`.

## Validation / Test Plan

Minimum manual checks (already performed):

- As **owner user**:
  - list `accounts`
  - create `transaction`
  - update `transaction`
- As **different authenticated user**:
  - reading other user’s documents fails with `PERMISSION_DENIED`

### Recommended automated tests (next)

Add Firestore rules tests using the Firebase Emulator.

Suggested cases:

1) Anonymous user cannot read/write any user-scoped collections.
2) Auth user can create docs only with `userId == their uid`.
3) Auth user can read/update/delete only docs with `userId == their uid`.
4) Auth user cannot update a doc and change its `userId`.

## Future: Family / Shared access (planned)

We plan to support sharing data with invited members (e.g., families). A safe approach is to introduce an explicit access-control list (ACL) layer:

- `families/{familyId}`
- `families/{familyId}/members/{uid}` (roles)

And extend data docs with:

- `familyId` (optional)

Access rule becomes:

- If no `familyId` → owner-only (current behavior)
- If `familyId` present → allow any member of that family

This feature should be implemented carefully (key management, invitations, revocation) and may later be combined with client-side encryption (E2E).