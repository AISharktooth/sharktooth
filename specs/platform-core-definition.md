# Platform Core Definition

**Status:** Binding Internal Architecture Definition
**Applies To:** All current and future workloads
**Audience:** Engineering, Security, Legal, Product

---

## 1. Purpose of the Platform Core

The Platform Core exists to **centralize trust, governance, and security controls** for all AI workloads.

It is deliberately **boring, stable, and conservative**.

> **Workloads deliver value. The Platform Core enforces trust.**

No workload may bypass or reimplement Platform Core responsibilities.

---

## 2. Non-Goals of the Platform Core

The Platform Core is **not**:

* A business logic layer
* An AI or model orchestration layer
* A data processing engine
* A UI framework
* A place for workload-specific rules

If logic is specific to a workload, it does not belong in the Platform Core.

---

## 3. Mandatory Platform Core Services

Every workload must integrate with the following services.

---

### 3.1 Authentication Service (AuthN)

**Responsibilities:**

* User authentication
* Session issuance (JWT or equivalent)
* Session revocation

**Requirements:**

* No workload manages credentials
* Authentication tokens include:

  * `user_id`
  * `tenant_id`
  * `role`

---

### 3.2 Authorization & RBAC Service (AuthZ)

**Responsibilities:**

* Enforce role-based access
* Enforce workload-level permissions

**Requirements:**

* Roles are evaluated centrally
* Workloads must not override role checks
* Authorization failures must be explicit

---

### 3.3 Tenant Resolution & Isolation

**Responsibilities:**

* Resolve tenant identity from session
* Enforce tenant boundaries

**Requirements:**

* Tenant identity must be derived from auth context, never from request payloads
* Tenant isolation enforced at:

  * API layer
  * Database layer (RLS)

---

### 3.4 Audit Logging Service

**Responsibilities:**

* Capture security- and access-relevant events
* Provide immutable audit records

**Events to Log:**

* Searches
* Data access
* Document uploads/downloads
* PII access
* Administrative actions

**Requirements:**

* No raw content or PII in logs
* Logs must include:

  * user_id
  * tenant_id
  * action
  * timestamp

---

### 3.5 Secrets & Key Management

**Responsibilities:**

* Manage encryption keys
* Manage API credentials
* Support key rotation

**Requirements:**

* No secrets in code or config files
* Workloads request keys via the Platform Core
* PII encryption keys are workload-scoped

---

### 3.6 Policy Enforcement Layer

**Responsibilities:**

* Enforce global platform rules
* Enforce workload boundaries

**Examples:**

* Prevent cross-workload data access
* Block unauthorized PII access
* Enforce read-only guarantees

Policies are evaluated before workload logic executes.

---

## 4. Platform Core Interfaces

The Platform Core exposes a **small, stable interface** to workloads:

* Auth context (user, tenant, role)
* Audit logging API
* Secrets retrieval API
* Policy decision API (allow / deny)

Workloads must not directly integrate with:

* Identity providers
* Secret stores
* Logging infrastructure

---

## 5. Failure Handling Philosophy

When the Platform Core fails:

* Fail closed, not open
* Deny access rather than guess
* Surface clear errors

Availability is important, but correctness and security take priority.

---

## 6. Versioning and Change Control

Changes to the Platform Core:

* Are versioned
* Are backward-compatible where possible
* Must not silently alter workload behavior

Any breaking change requires:

* Explicit documentation
* Explicit approval

---

## 7. Security Posture

The Platform Core is the **primary security boundary**.

Minimum guarantees:

* Encryption in transit
* Encryption at rest
* Strong tenant isolation
* Auditable access

---

## 8. Relationship to MoE and Routing

The Platform Core:

* Does not route model calls
* Does not inspect prompts or content

Future routing layers (e.g., MoE):

* Must integrate *through* the Platform Core
* Must respect workload boundaries

---

## 9. Enforcement

Any workload that bypasses the Platform Core is non-compliant and must be corrected or removed.

> **The Platform Core is the gatekeeper of trust.**

---

**End of Platform Core Definition**
