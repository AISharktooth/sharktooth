# RO Assistant — Workload Specification (v1.0)

**Status:** Canonical Reference Workload
**Applies To:** RO Assistant only
**Governed By:** Platform Doctrine and Expansion Rules
**Audience:** Engineering, Security, Legal, Product

---

## 1. Purpose

The RO Assistant exists to **securely surface and reference historical repair order (RO) information within a single dealership** so that technicians and service staff can quickly locate prior diagnostic context and repair outcomes.

The RO Assistant is a **reference system**, not a decision system.

---

## 2. Primary Use Case

> “Have we seen a similar issue before, and what was done?”

The system retrieves **relevant historical ROs** and presents them with citations so users can independently review prior outcomes.

---

## 3. Explicit Non-Goals (Hard Boundaries)

The RO Assistant **must never**:

* Diagnose vehicles
* Recommend a specific repair or part
* Rank or judge technician performance
* Replace OEM service information
* Modify or write back to the DMS
* Trigger automated actions
* Share data across dealerships
* Aggregate data across workloads
* Learn or adapt behavior based on usage

If a requested feature violates any of the above, it is out of scope.

---

## 4. Data Scope

### 4.1 Data Sources (Allowed)

* Historical repair orders (ROs)
* RO-associated documents (PDF, text exports)

### 4.2 Data Explicitly Excluded

* Live DMS write access
* OEM proprietary content
* Cross-store datasets
* Non-RO operational systems

---

## 5. PII Handling Rules

* PII ingestion is **optional** and **explicitly approved per tenant**
* PII is stored **only** in the PII Vault (encrypted at all times)
* PII must not appear in:

  * embeddings
  * prompts
  * logs
  * vector indexes

PII access requires:

* Authorized role (`ADMIN` or `PII_APPROVED`)
* Audit logging of access events

---

## 6. Storage Architecture

The RO Assistant uses **dedicated storage**:

* Postgres database (RO Assistant only)
* pgvector for embeddings
* Separate PII Vault table (ciphertext only)

No other workload may access this database.

---

## 7. Ingestion Rules

1. Files are uploaded by authorized users
2. Files are virus-scanned and validated
3. Text is extracted
4. PII is redacted prior to chunking
5. Chunks are embedded and stored
6. Source documents are preserved unmodified

Failures at any step must halt ingestion and surface errors.

---

## 8. Retrieval Behavior

* Searches are scoped to the tenant only
* Results must reference specific ROs
* Results must include citations
* If no relevant data exists, the system must respond with “No relevant records found.”

The system must not infer missing information.

---

## 9. Output Constraints

All outputs must be:

* Factual
* Reference-only
* Traceable to source ROs
* Free of speculative language

Allowed phrasing:

* “A prior RO from [date] documents…”

Disallowed phrasing:

* “You should try…”
* “This is likely caused by…”

---

## 10. User Roles

### Technician (`TECH`)

* Search ROs
* View redacted excerpts

### Administrator (`ADMIN`)

* Upload documents
* Manage users
* View audit logs
* Access PII (if approved)

### PII Approved (`PII_APPROVED`)

* View decrypted PII where explicitly allowed

---

## 11. Audit & Logging Requirements

The following events **must** be logged:

* Searches performed
* RO views
* Document downloads
* PII access events
* Admin actions

Logs must not contain raw RO text or PII.

---

## 12. Failure Modes

Acceptable failures:

* “No relevant records found”
* Partial ingestion failures (with clear error reporting)

Unacceptable failures:

* Cross-tenant data exposure
* Uncited or unverifiable answers
* Silent data access

---

## 13. Security Requirements

* Tenant isolation enforced at application and database layers
* Encryption at rest and in transit
* App-level encryption for PII
* No secrets stored in code

---

## 14. Versioning

Any change that affects:

* Data scope
* Authority
* Output behavior

requires a **new version** of this workload specification.

---

## 15. Canonical Status

This document is the **reference implementation** for all future workloads.

Future workloads must:

* Match this level of specificity
* Declare their own non-goals
* Define their own data boundaries

---

**End of RO Assistant Workload Specification v1.0**
