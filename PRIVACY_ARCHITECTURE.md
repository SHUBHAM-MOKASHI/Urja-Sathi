# URJA SAATHI — Privacy Architecture and Data Governance Specification

**Tagline:** "Har Ghar Bachat, Har Haath Kaam"  
**Document Classification:** Technical Architecture & Privacy Engineering  
**Version:** 1.0.0 (Production-Ready)  
**Date:** November 2026

---

## 1. Executive Privacy Philosophy: "Local First, Consent Always, Evidence Verified"

URJA SAATHI is built from the ground up on the principle of **Local-First Privacy by Design**. Most smart energy and billing systems require households to upload raw utility bills, meter numbers, addresses, and consumption profiles to remote cloud databases. URJA SAATHI reverses this paradigm:

1. **Local-First:** All computation (OCR extraction, energy consumption analysis, tariff modeling, solar capacity sizing, quotation matching, and savings tracking) occurs entirely inside the user's browser client using client-side WebAssembly and JavaScript engines.
2. **Consent Always:** No network transmission of any personal record or bill snapshot occurs without affirmative user consent.
3. **Evidence Verified:** Reported energy savings and worker earnings are strictly separated into *Demonstration Data*, *Estimated Impact*, and *Evidence-Verified Impact*. Metrics are never inflated.

---

## 2. Data Lifecycle Matrix

The table below details every category of data handled by URJA SAATHI, its storage destination, network boundary, and lifecycle controls:

| Data Category | Origin / Ingestion Point | Local Storage Mechanism | Network Transmission Policy | Retention & Erasure |
| :--- | :--- | :--- | :--- | :--- |
| **Electricity Bills & Media** | User file upload / camera capture / manual entry | IndexedDB (`bills` store as base64/blob metadata) | **Zero Cloud Exfiltration by default.** Tesseract.js runs inside WebWorker. Image is never sent to remote OCR servers. | Deleted via `deleteBill()` or single-click complete purge via `clearAllData()`. |
| **Personal Identifiers (Name, Phone, Consumer No)** | Bill parser or manual profile entry | IndexedDB (`userProfile` and `bills`) | Transmitted **only** when submitting a service request to a local technician, subject to explicit consent. | Never duplicated into `localStorage`. Wiped upon full reset. |
| **Appliance Inventory & Load Patterns** | User input in Savings Planner or Apartment Presets | IndexedDB (`cachedSettings.appliance_inventory`) | Local-only. Used solely for client-side tariff calculations. | Wiped upon reset; updated atomically when user modifies appliances. |
| **Solar Roof Audits & Feasibility Outputs** | Solar Feasibility Assistant inputs & computations | IndexedDB (`assessments` store) | Local-only. Never shared with solar vendors automatically. | Managed in user dashboard; wiped upon full reset. |
| **Detailed Solar Quotations** | User quotation comparison entries | IndexedDB (`quotations` store) | Local-only. Kept isolated from advertising or external vendors. | Wiped upon full reset or quotation removal. |
| **Community Service Requests** | Workforce page booking form | IndexedDB (`serviceRequests` and `offlineSyncQueue`) | Queued locally if offline; synced to local worker ledger only upon network reconnection with user consent. | Associated sync queue records automatically purged if request is cancelled. |
| **Worker Credentials & Certificates** | Worker registration modal | IndexedDB (`workers` store) | Local-only in client demonstration/field-worker mode. Requires offline/institutional vetting for verified badge. | Wiped upon full reset. |
| **Impact Tracker Records** | Bilateral bill comparison & completed service logs | IndexedDB (`bills`, `serviceRequests`) | Aggregated in-browser into tripartite metrics. Exported only via client-generated JSON/CSV reports. | Reports mask names, phone numbers, and consumer numbers by default. |

---

## 3. In-Browser OCR & Media Processing Boundary

A critical vulnerability in modern web apps is accidental leaking of sensitive documents through third-party cloud vision APIs. URJA SAATHI prevents this at the architectural layer:

```
[User Device File System / Camera]
                  │
                  ▼
   [validateBillFileSignature]
      Binary Magic Byte Check
      (JPEG: 0xFF, 0xD8, 0xFF)
      (PNG:  0x89, 0x50, 0x4E, 0x47)
                  │
        (Valid Image File)
                  ▼
        [HTMLCanvasElement]
     Client-side Non-executable
        Grayscale Rendering
                  │
                  ▼
   [Tesseract.js in Web Worker]
        WASM Core Engine
   (No Remote Server Invocations)
                  │
                  ▼
    [Extracted Text & Metadata]
    Local Bill Review Form Only
```

- **File Signature Enforcement:** Renamed SVG, HTML, or executable files containing scripts cannot reach the OCR parser.
- **WASM Isolation:** OCR runs inside a sandboxed browser Web Worker using pre-cached WASM and language trained data.
- **No Remote Telemetry:** The OCR pipeline transmits zero telemetry, image bytes, or text tokens across the network.

---

## 4. DPDP-Aligned Technical Safeguards

While URJA SAATHI does not claim formal legal certification, its privacy controls are technically aligned with India's **Digital Personal Data Protection (DPDP) Act**:

1. **Notice & Purpose Limitation:**
   - The application displays clear, transparent notices explaining that all data remains on the device.
   - Purpose is strictly confined to household energy optimization and community worker coordination.
2. **Explicit Consent Architecture:**
   - Every service request and household follow-up record incorporates an explicit `consentGiven` boolean flag.
   - Users can toggle consent on and off at any time.
3. **Right to Complete Erasure:**
   - A dedicated "Clear All Data" control in Settings executes `dbService.clearAllData({ fullReset: true })`.
   - Wipes all 9 IndexedDB object stores (`bills`, `assessments`, `quotations`, `serviceRequests`, `workers`, `userProfile`, `cachedSettings`, `offlineSyncQueue`, `auditTrail`).
   - Purges all application keys from `localStorage`.
   - Clears pending sync items so no queued data is transmitted post-deletion.
4. **Data Portability:**
   - Users can export their complete billing history, appliance configurations, and impact records in open JSON or CSV formats at any time.

---

## 5. Aggregation & Export Redaction Standards

When data is exported from the Impact Tracker or displayed in public/shared community dashboards:
- **Phone Numbers:** Masked to show only country prefix, first 2 digits, and last 2 digits (`+91 98*****43`).
- **Consumer Numbers:** Masked to show first 2 digits and last 2 digits (`10****76`).
- **Personal Names:** Masked using initials (`Rameshwar P. S.`). If consent is withheld, strictly displayed as `"Consent Withheld (Private)"`.
- **Default Privacy Mode:** Export modal has `maskPersonalInfo: true` enabled by default.

---

## 6. Offline Synchronization Security

When working in low-connectivity rural or peri-urban environments:
1. Mutations to service requests and assessments are appended to `offlineSyncQueue` in IndexedDB.
2. When connectivity is restored, items are processed using idempotent keys (`recordId` + `operation`) to prevent duplicate record injection.
3. If an item is deleted locally prior to synchronization, the cleanup hooks in `db.ts` and `storageService.ts` automatically purge matching queue items, ensuring deleted data is never resurrected or pushed to remote endpoints.

