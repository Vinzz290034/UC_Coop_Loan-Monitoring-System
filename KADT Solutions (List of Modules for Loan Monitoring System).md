# **Backend System Modules Specification**

**Project Title:** Loan Monitoring and Financial Management System – Phase 1  
**Client:** University of Cebu \- METC Multipurpose Cooperative  
**Development Team (Backend):** Vince Andrew Santoya & Eric Dominic Momo

This document details the backend architectural modules designed in strict accordance with Section 4.1 (Phase 1 Deliverables) of the Service Level Agreement. All modules below prioritize relational transactional safety, precise financial calculation layers, and strict scope boundary enforcement.

## **1\. Authentication & Authorization Module**

Implements the foundational security infrastructure needed to safeguard member financial records and ensure system confidentiality.

* **Role-Based Access Control (RBAC):** Enforces granular endpoint restrictions distinguishing cooperative manager, members, and admins.  
* **Token Management Service:** Issues and validates stateful or stateless security tokens (e.g., cryptographic JWTs) to maintain session isolation and secure authorization context.

## 

## **2\. Member Management Module**

Maintains the absolute source of truth for all cooperative member identities and operational states.

* **Member Profile Service:** Exposes CRUD endpoints to capture, retrieve, and update core member demographic information.  
* **Records Maintenance Engine:** Tracks account statuses (active, suspended, inactive) and maintains chronological metadata histories for audit compliance.

## 

## **3\. Share Capital, Fixed Deposit, & Investment Module**

Manages the structural ledger systems for non-loan asset types held within the cooperative.

| Sub-Module Component | Functional Scope & Ledger Controls   |
| :---- | :---- |
| **Share Capital Ledger** | Processes transactional debits and credits representing member equity contributions, maintaining a locked cumulative valuation balance. |
| **Fixed Deposit Registry** | Tracks individual high-yield timed placements, recording principal deposits, contract maturity tracking, and interest yield milestones. |
| **Investment Tracking Service** | Maintains balance layers and individual transaction postings linked to general member-backed cooperative investment options. |

## 

## **4\. Loan Management Module (Core Calculation Layer)**

Houses the high-precision financial math and operational workflows controlling the credit lifecycle.

* **Loan Lifecycle Manager:** Facilitates formal loan instantiation, ingestion of approval configurations, disbursement statuses, and termination rules.  
* **Credit Monitoring Engine:** Performs lookups across active lines to aggregate individual outstanding debt balances and determine maximum remaining unutilized credit limits.  
* **Product Registry Service:** Exposes operational administrative interfaces defining explicit constraints, base interest figures, and duration terms for discrete loan products.  
* **Mathematical Computation Core:** Low-latency libraries processing dual amortization calculation frameworks:  
  * *Monthly Amortization Computation:* Generates static flat-rate repayment profiles.  
  * *Diminishing Balance Computation:* Implements dynamically recalculated reducing-balance interest formulas based on remaining principal matrices.  
* **Repayment & Maturity Service:** Records individual incoming repayment allocations, updating principal-to-interest distribution matrices, and evaluating real-time end-date timelines.

## 

## **5\. Billing, Collection, & Scheduling Module**

Controls chronological operations, transaction forecasting, and delinquency evaluation queues.

* **Scheduling Generation Engine:** Automates creation of future forward-looking installment matrices for active loan and investment liabilities.  
* **Billing Queue Processor:** Handles processing of active accounts receivable pools to flag current accounts due within the open billing period.  
* **Delinquency & Aging Engine:** Executes complex database aggregation sorting accounts into specific overdue tranches (e.g., 30, 60, 90+ days past due) to generate data vectors for financial tracking.

## 

## **6\. Reporting & Export Service**

Provides read-optimized analytical data objects and handles binary file serialization for down-stream cooperative auditing.

* **Analytical API Outlets:** Query views optimized for report rendering:  
  * Cash Disbursement Reference Reports for Loans  
  * Loan Monitoring Reports  
  * Financial Transaction Reports  
* **Excel Binary Serializer:** Transforms nested JSON structural database payload response arrays directly into downloadable binary OpenXML (Excel \`.xlsx\`) file blobs.

## 

## **7\. Out-of-Scope Architecture Boundaries (Phase 1 Guardrails)**

The following features are strictly excluded from the Phase 1 backend architecture definition. No endpoints, database schemas, or external worker processes are to be deployed for these components:

* ❌ External third-party payment gateway integrations or processing webhooks.  
* ❌ Automated outbound notification microservices (SMS protocols or transaction email workers).  
* ❌ Multi-branch network synchronization layers or cross-cooperative routing engines.