# Platform Doctrine and Expansion Rules

**Status:** Binding Internal Doctrine
**Applies To:** All current and future development of the dealership AI platform
**Purpose:** Define non‑negotiable architectural, legal, and operational rules governing how AI capabilities are built, expanded, and deployed.

---

# PART I — PLATFORM DOCTRINE

## 1. Core Principle

The platform is **not a single AI system**, but a collection of **independent, purpose‑built workloads** operating under a shared governance layer.

> **A workload is the unit of trust, review, deployment, and risk.**

No workload may assume access to data, logic, or authority outside its explicitly defined scope.

---

## 2. What a Workload Is

A workload is a self‑contained AI capability designed to solve **one clearly defined operational problem**.

Every workload **must** define:

* A single primary purpose
* Explicit non‑goals
* A bounded data domain
* Its own storage layer (database)
* Its own ingestion pipeline
* Its own prompts / model interactions
* Its own risk profile

The **Repair Order (RO) Assistant** is the first workload and serves as the reference implementation.

---

## 3. What a Workload Is Not

A workload is **not**:

* A general chatbot
* A shared knowledge brain
* A system that makes decisions or takes actions
* A system that learns autonomously from usage

All workloads are **reference and assistance systems**, unless explicitly reclassified through formal expansion.

---

## 4. Platform Core (Shared, Mandatory)

All workloads must operate behind the **Platform Core**, which provides:

* Authentication and authorization
* Tenant resolution and isolation
* Role‑based access control
* Audit logging
* Secret and key management
* Policy enforcement

> **No workload may bypass the Platform Core under any circumstances.**

This layer exists to enforce trust, legality, and consistency across all capabilities.

---

## 5. Data Isolation Doctrine

### 5.1 Workload‑Scoped Data

* Each workload owns its data exclusively
* Databases are not shared between workloads
* Cross‑workload data access is prohibited by default

### 5.2 Tenant Isolation

* All data is tenant‑scoped
* Tenant isolation is enforced at:

  * Application layer
  * Database layer (RLS)
  * Encryption boundary

---

## 6. Model Usage Doctrine

* Models are stateless inference components
* Models do not retain memory between requests
* Models do not train or fine‑tune on customer data
* Models are interchangeable per workload

> **No model is authoritative. Data sources are authoritative.**

---

## 7. AI Safety and Responsibility

* Human users remain responsible for all decisions
* Outputs must be traceable to source records
* The platform must not infer missing facts
* If information is not found, the system must say so

---

# PART II — EXPANSION RULES

## 8. Expansion Philosophy

Expansion is **intentional**, **documented**, and **versioned**.

> **Capabilities do not expand by accident.**

Any change that increases data scope, authority, or automation must follow the rules below.

---

## 9. What Constitutes an Expansion

An expansion includes any of the following:

* Adding a new workload
* Introducing a new data source type
* Enabling cross‑workload data access
* Allowing cross‑dealership data aggregation
* Introducing automated actions
* Introducing inference or recommendations

If unsure, treat the change as an expansion.

---

## 10. Expansion Prerequisites (Required Before Code)

Before implementing an expansion, the following **must exist**:

1. **Problem Definition**
   One paragraph describing the operational problem being solved.

2. **Workload Definition**
   Purpose, scope, and non‑goals.

3. **Data Scope Definition**
   What data is ingested, where it comes from, and what is excluded.

4. **Risk Assessment**
   What new risks are introduced and how they are mitigated.

5. **Security & Privacy Review**
   Confirmation that data isolation and encryption remain intact.

6. **Approval**
   Explicit sign‑off (founder / technical lead at minimum).

No expansion proceeds without these artifacts.

---

## 11. Database and Storage Rules

* Each workload receives its own database
* Encryption keys may not be reused across workloads
* Retention policies may differ by workload
* Deleting a workload deletes its data

This ensures clean decommissioning and incident containment.

---

## 12. Model Routing and MoE (Future State)

When introducing multi‑model or MoE behavior:

* Routing models may only see intent and metadata
* Routing models may not access raw customer data
* Expert models remain workload‑scoped
* Outputs must preserve original workload boundaries

The router is a coordinator, not a data consumer.

---

## 13. Backward Compatibility and Trust

* Existing workloads must not change behavior without versioning
* Security posture must not weaken silently
* Customers must not receive expanded capabilities implicitly

Trust is preserved through predictability.

---

## 14. Enforcement

This doctrine overrides convenience, speed, and feature pressure.

Any implementation that violates these rules must be corrected or removed.

> **If a feature cannot be explained within this doctrine, it does not belong in the platform.**

---

**End of Doctrine and Expansion Rules**
