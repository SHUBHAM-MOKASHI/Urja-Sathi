# URJA SAATHI — Security Policy and Threat Model

**Tagline:** "Har Ghar Bachat, Har Haath Kaam"  
**Version:** 1.0.0 (Production-Ready Architecture)  
**Last Updated:** November 2026

---

## 1. Vulnerability Disclosure Policy

We take the security of URJA SAATHI and the privacy of household users and community energy workers seriously. If you discover a security vulnerability or potential privacy leak, please disclose it responsibly.

### Reporting Security Issues
- **Direct Contact:** `security@urjasaathi.local` / project security coordinators.
- **Reporting Protocol:** Please include:
  1. Description of the issue and potential impact.
  2. Step-by-step reproduction instructions or proof of concept.
  3. Scope of affected components (e.g., OCR processing, IndexedDB storage, Service Worker caching).
- **Disclosure Timeline:** We request a 90-day coordinated disclosure period before public disclosure. We commit to acknowledging receipt within 48 hours and providing regular remediation status updates.

---

## 2. Threat Model & Trust Assumptions

URJA SAATHI is designed as a **local-first, privacy-by-design progressive web application**. Its primary security objective is ensuring that sensitive household electricity data, billing history, identity markers, and worker contact information remain protected on-device without silent exfiltration.

### Trust Boundaries
1. **Client Device (Trusted):**
   - User interaction, form inputs, local IndexedDB (`urja_saathi_db`), and in-browser calculation engines.
   - Client is assumed to run on standard modern browser engines (Chromium, Firefox, Safari/WebKit) with sandboxed storage.
2. **Untrusted Uploads (Hostile / Malformed):**
   - Image files and bill scans uploaded by users or third parties.
   - Threat: Polyglot files, renamed SVG/HTML files containing Cross-Site Scripting (XSS), malformed binary buffers intended to exploit OCR/WASM parsers, and tampered meter figures designed to skew local analytics.
   - Mitigation: Strict magic-byte binary header verification (`validateBillFileSignature`), MIME-type matching, and client-side non-executable canvas decoding.
3. **External Sync Endpoints (Semi-Trusted / Fallback):**
   - Offline sync queue (`offlineSyncQueue`) dispatches to backend sync endpoints only when network connectivity is present and explicit user consent is logged.
   - No sensitive raw bill images or full unmasked PII are uploaded without explicit confirmation.
4. **Community Worker Registration (Restricted Trust):**
   - Anyone may register as a community worker on their own device.
   - **Crucial Rule:** Self-submitted records are strictly untrusted for official credentials. `isVerified` is always set to `false`, and `verificationStatus` defaults to `'verification_pending'`. Automatic self-elevation to licensed/certified status is prohibited at the software architectural level.

---

## 3. Local-First Privacy Architecture & Edge Boundaries

- **Zero Remote Image Transmission by Default:** OCR processing occurs 100% locally in-browser via WebAssembly (`tesseract.js`). Bill images are converted to local object URLs or blobs and never transmitted to external cloud inference endpoints unless explicit user opt-in is provided.
- **IndexedDB Isolation:** All records (bills, appliance inventory, quotations, assessments, service requests, user profiles) are persisted within an isolated IndexedDB database (`urja_saathi_db`) scoped to the origin.
- **No LocalStorage PII Sprawl:** LocalStorage is restricted to lightweight, non-sensitive preferences (e.g., active language, user mode, UI theme, offline queue status). Raw bills, telephone numbers, and service requests must never be mirrored into `localStorage`.
- **Right to Complete Erasure:** The application provides a complete reset facility (`clearAllData({ fullReset: true })`) that wipes all 9 IndexedDB stores, purges orphaned offline sync queues, and clears all `localStorage` keys.

---

## 4. Content Security Policy (CSP) Guidelines

For production deployment across web servers and CDNs, the following CSP headers must be configured:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';
```

- `'wasm-unsafe-eval'` is permitted strictly to allow Tesseract.js / WebAssembly compilation in client worker threads.
- `object-src 'none'` prevents Flash/Java applet execution.
- `frame-ancestors 'none'` prevents Clickjacking attacks.

---

## 5. Input Validation & Calculation Hardening

1. **Finite Numeric Defense:**
   - All financial and electrical calculations (`energyEngine`, `solarEngine`, `billValidation`) enforce strict `Number.isFinite()` and non-negative boundaries.
   - `NaN`, `Infinity`, and `-Infinity` are trapped immediately and yield graceful error statuses (`'invalid_input'`) rather than propagating corrupt values to UI displays or stored state.
2. **File Signature Magic Bytes:**
   - Binary headers are inspected via `FileReader` and `Uint8Array`.
   - JPEG files must start with `0xFF, 0xD8, 0xFF`.
   - PNG files must start with `0x89, 0x50, 0x4E, 0x47`.
   - Extensions alone are never trusted.
3. **Data Masking Standards:**
   - Consumer Numbers: First 3 digits and last 2 digits visible, middle digits masked (`123****78`).
   - Phone Numbers: First 2 digits and last 2 digits visible (`98******10`).
   - Personal Names: First 2 letters and last letter visible (`Ra***h`).
   - When consent is withheld, name is strictly displayed as `"Consent Withheld (Private)"`.

---

## 6. Service Worker Security Policies

The URJA SAATHI service worker (`public/sw.js`):
- Only handles `http` and `https` schemes; non-HTTP requests (e.g. `chrome-extension:`) are bypassed immediately.
- Explicitly excludes sensitive dynamic API routes (`/api/` and `/auth/`) from runtime caching.
- Restricts runtime caching of external resources to trusted CDN domains (Google Fonts).

---

## 7. Compliance and Regulatory Alignment

URJA SAATHI incorporates **DPDP-Aligned Technical Safeguards** inspired by the Digital Personal Data Protection (DPDP) Act of India:
- Explicit consent collection for data retention.
- Separation of demonstration audit data from live household records.
- Immediate localized data deletion mechanisms.
- Transparent notice explaining what data is stored locally on device.

