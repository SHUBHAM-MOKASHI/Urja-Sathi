# URJA SAATHI — BATCH 6: SECURITY, PRIVACY & PRODUCTION READINESS REPORT

**Platform Tagline:** "Har Ghar Bachat, Har Haath Kaam"  
**Audit Role:** Senior Application Security Engineer, Full-Stack Architect, Privacy Engineer & QA Lead  
**Scope:** Security, Privacy, Cryptographic Sanitization, Worker Credential Integrity, Edge Sandboxing, DPDP Alignment, and Reliability Audit  
**Date of Execution:** November 2026  
**Final Verification Status:** 179 / 179 Automated Tests Passing across 15 Test Suites | Clean Production Build

---

## 1. Executive Summary

URJA SAATHI is an offline-first, voice-assisted household energy savings and community green-livelihood progressive web application designed to empower households and local energy technicians in India. Following the implementation of core engines, shared appliance inventory, live impact tracking, and offline data consistency (Batches 1–5), **Batch 6** executed an exhaustive, multi-phase security and privacy audit.

Prior to Batch 6, several architectural vulnerabilities and data leakage pathways existed:
1. **Worker Privilege Escalation (High Severity):** Community workers registering via `WorkerRegistrationModal.tsx` were granted `isVerified: true` and `verificationStatus: 'verified_licensed'` immediately upon typing any text into the certificate number field, granting unvetted access to high-voltage technical assignments.
2. **File MIME-Type Spoofing (High Severity):** The bill upload zone relied exclusively on browser MIME-type and file extension checks, allowing renamed scripts (SVG/HTML) or polyglot files to reach the OCR pipeline.
3. **Sensitive PII Duplication in LocalStorage (Medium Severity):** Unencrypted customer contact information and service requests were duplicated into `localStorage` (`urja_saathi_requests`), bypassing the isolated IndexedDB boundary.
4. **Incomplete Privacy Erasure (High Severity):** The "Clear All Data" function omitted the `userProfile` and `workers` stores, leaving household consumer numbers and worker details persisted after an explicit user wipe request.
5. **Propagating Mathematical Anomalies (Medium Severity):** Calculation engines lacked guards against `NaN` and `Infinity`, permitting malformed inputs to cascade into calculations and corrupted UI states.
6. **Unsupported Legal Compliance Claims:** The application displayed "DPDP Compliant" without statutory certification, posing legal and regulatory risk.

All vulnerabilities have been remediated, verified with a dedicated automated test suite (`securityAndPrivacy.test.ts`), and compiled into clean production assets without altering the application's Forest Green UI palette or breaking offline capability.

---

## 2. Threat Model & Trust Assumptions

```
+-----------------------------------------------------------------------------------+
|                              CLIENT DEVICE BOUNDARY                               |
|                                                                                   |
|  [Untrusted Uploads] ──► [validateBillFileSignature] ──► [WASM Tesseract.js Worker]
|   - Magic Bytes (JPEG/PNG)  - Strict Binary Header Check  - In-Browser OCR Only   |
|                                                                                   |
|  [Household Inputs]  ──► [Engine Input Sanitization] ──► [Energy/Solar Calculations]
|   - NaN/Infinity Defense    - Strict Number.isFinite()    - Deterministic Output  |
|                                                                                   |
|  [Worker Registration]──► [Restricted State Factory] ──► [Pending Review Ledger]  |
|   - No Auto-Elevation       - isVerified: false           - Offline Vetting Only  |
|                                                                                   |
|  [Isolated Storage]  ◄──► [IndexedDB: urja_saathi_db]◄──► [Atomic clearAllData]   |
|   - 9 Dedicated Stores      - Zero PII in LocalStorage    - Complete Erasure      |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ (Opt-in With Explicit Consent)
                    [Secure Offline Sync Queue (Idempotent)]
```

### Trust Zones:
1. **Hostile Input Boundary:** All incoming files and user-typed form inputs are treated as untrusted. Files undergo magic byte validation; numerical inputs pass through `Number.isFinite()` and positive value constraints.
2. **Execution Boundary:** Optical character recognition (OCR) executes 100% on-device inside a Web Worker thread using WebAssembly. No bill snapshots, meter images, or unmasked personal identities are transmitted to remote servers.
3. **Persistence Boundary:** All state is saved inside origin-scoped IndexedDB object stores. LocalStorage is restricted to non-PII operational state.

---

## 3. Vulnerability Remediation Matrix

| ID | Vulnerability Description | Severity | Impact | File Remediated | Remediation Applied |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Worker self-elevation to `verified_licensed` upon inputting certificate number | **High** | Uncertified individuals could accept hazardous high-voltage electrical work | `src/components/workforce/WorkerRegistrationModal.tsx` | Enforced `isVerified: false` and `verificationStatus: 'verification_pending'` for all self-submitted profiles. |
| **SEC-02** | File upload extension spoofing allowing non-image files into OCR | **High** | Potential XSS via SVG or parser crashes from malformed binary payloads | `src/services/billValidation.ts`<br>`src/components/bill-analyzer/BillUploadZone.tsx` | Added `validateBillFileSignature()` checking binary magic bytes (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`) via `FileReader`. |
| **SEC-03** | Incomplete data erasure leaving user profile and worker identities | **High** | Violation of DPDP right to erasure; personal data remained on shared devices | `src/services/db.ts` | Updated `clearAllData({ fullReset: true })` to purge all 9 stores (`userProfile` and `workers` included), clear localStorage, and reset memory fallbacks. |
| **SEC-04** | Redundant PII serialization in `localStorage` | **Medium** | Service requests with customer phone numbers exposed to any script on origin | `src/pages/CommunityWorkforcePage.tsx` | Completely removed `localStorage.setItem('urja_saathi_requests', ...)` duplication. |
| **SEC-05** | Calculation engine breakdown on `NaN`, `Infinity`, or negative numbers | **Medium** | Application crash, corrupted persistent state, and misleading zero/negative charges | `src/services/energyEngine.ts`<br>`src/services/solarEngine.ts`<br>`src/services/billValidation.ts` | Implemented `Number.isFinite()` guards; returns `status: 'invalid_input'` gracefully without propagating corrupted math. |
| **SEC-06** | Unmasked phone numbers and consumer names in exports and UI | **Medium** | Accidental exposure of personal household identity in community audit records | `src/services/impactTrackerService.ts`<br>`src/components/impact/DownloadableImpactReportModal.tsx`<br>`src/components/workforce/ServiceRequestTrackingCard.tsx` | Added `maskName()` helper (`Rameshwar P. S.`); defaulted export modal to `maskPersonalInfo: true`; masked unconsenting cards. |
| **SEC-07** | Service Worker caching non-HTTP schemes and dynamic API routes | **Low** | Browser console warnings on extensions and unintended caching of dynamic payloads | `public/sw.js` | Enforced `url.protocol === 'http:' \|\| url.protocol === 'https:'`; explicitly bypassed `/api/` and `/auth/` routes. |
| **SEC-08** | Misleading regulatory compliance claims ("DPDP Compliant") | **Low** | Legal non-compliance exposure without statutory audit | `src/pages/SettingsPage.tsx`<br>`src/pages/ImpactTrackerPage.tsx` | Replaced claims with "DPDP-Aligned Technical Safeguards" and "DPDP Consent Logged". |

---

## 4. Phase-by-Phase Technical Details

### Phase 1: Threat Model & Trust Assumptions
- Defined strict boundaries: in-browser client computation, sandbox WASM execution, isolated IndexedDB persistence.
- Documented in root [SECURITY.md](file:///d:/Urja%20Sathi%20Project/SECURITY.md) and [PRIVACY_ARCHITECTURE.md](file:///d:/Urja%20Sathi%20Project/PRIVACY_ARCHITECTURE.md).

### Phase 2: In-Browser OCR & Media Processing Boundary
- Implemented binary header inspection (`validateBillFileSignature`) in `src/services/billValidation.ts`.
- Validates initial 4 bytes of uploaded files using `Uint8Array`.
- Integrated directly into `BillUploadZone.tsx` with dynamic user feedback ("Verifying File Security...").

### Phase 3: Input Validation & Calculation Hardening
- Guarded `runEnergySavingsEngine` against `NaN`, `Infinity`, `-Infinity`, and negative values.
- Guarded `runSolarFeasibilityEngine` to ensure capacity and costs are always positive finite numbers.
- Guarded `validateBillData` in `billValidation.ts` to reject non-finite meter readings.

### Phase 4: Worker Credential & Safety Authorization
- Eliminated automatic self-verification in `WorkerRegistrationModal.tsx`.
- Profile submission marks credentials as `'verification_pending'` and displays an explicit notice informing workers that physical/institutional vetting is required before undertaking technical electrical/solar tasks.

### Phase 5: PII Storage & Storage Hygiene
- Cleared redundant `localStorage` key `urja_saathi_requests`.
- Scoped all persistence to IndexedDB stores.
- Enforced origin-only persistence.

### Phase 6: Privacy Masking & Sensitive Field Redaction
- Implemented `maskName(name)` in `src/services/impactTrackerService.ts` to redact surnames while preserving readability (`"Rameshwar Prasad Sharma"` -> `"Rameshwar P. S."`).
- Updated `DownloadableImpactReportModal.tsx` to include an interactive privacy toggle (`maskPersonalInfo`), defaulting to `true`.
- Added privacy guards in `ServiceRequestTrackingCard.tsx` to mask phone numbers and citizen names when viewing shared requests.

### Phase 7: Complete Data Erasure (DPDP Right to Erasure)
- Extended `clearAllData` in `src/services/db.ts` to wipe all 9 stores: `bills`, `assessments`, `quotations`, `serviceRequests`, `workers`, `userProfile`, `cachedSettings`, `offlineSyncQueue`, and `auditTrail`.
- Automatically removes orphaned sync queue tasks matching deleted entities.

### Phase 8: Offline Sync Queue Security & Idempotency
- Added idempotent deduplication and queue item cleanup when bills or requests are deleted locally.
- Prevented resurrection of deleted data when connectivity resumes.

### Phase 9: Service Worker Sandboxing & Caching Defense
- Added protocol verification (`url.protocol.startsWith('http')`) in `public/sw.js`.
- Bypassed browser extensions (e.g. `chrome-extension://`).
- Explicitly excluded `/api/` and `/auth/` endpoints from runtime caching.

### Phase 10: Regulatory Alignment & Claims Honesty
- Audited all user-facing strings across `SettingsPage.tsx` and `ImpactTrackerPage.tsx`.
- Substituted absolute claims ("DPDP Compliant") with legally precise terminology ("DPDP-Aligned Technical Safeguards").

### Phase 11: Production Build Verification & Code Hygiene
- Validated TypeScript strict mode compliance (`tsc -b`).
- Verified zero unused variables and full type overlap in IndexedDB synchronization handlers.
- Executed Vite production bundle.

### Phase 12: Automated Security & Privacy Test Suite
- Created `src/services/__tests__/securityAndPrivacy.test.ts` with 16 automated tests covering:
  - File signature magic byte detection (JPEG, PNG, invalid spoofed files).
  - Mathematical resilience against `NaN`, `Infinity`, and negative inputs.
  - Worker self-elevation prevention and matching eligibility.
  - Phone, consumer number, and name masking.
  - Complete data erasure across all 9 object stores and offline sync queues.

---

## 5. Automated Verification Results

- **Test Framework:** Vitest v2.1.9
- **Total Test Suites:** 15 passed (15 total)
- **Total Tests:** 179 passed (179 total)
- **Execution Time:** ~3.8 seconds
- **Production Build:** `tsc -b && vite build` completed with code 0 (zero errors, clean asset output).

```
Test Files  15 passed (15)
     Tests  179 passed (179)
  Duration  3.84s
```

