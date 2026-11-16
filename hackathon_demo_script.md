# URJA SAATHI — HACKATHON DEMO SCRIPT
**Platform:** URJA SAATHI (ऊर्जा साथी)  
**Tagline:** *"Har Ghar Bachat, Har Haath Kaam"* (हर घर बचत, हर हाथ काम)  
**Target Duration:** 4 minutes 30 seconds (Max 5 minutes)  
**Audience:** Hackathon Jury, Impact Investors, Technical Judges, Energy Policy Experts  

---

## Technical Setup & Pre-Demo Checklist (T-Minus 2 Minutes)

1. Open Chrome at `http://localhost:4173` (or production preview).
2. Press `F11` (or full screen) to maximize browser screen space.
3. Open Developer Tools > Application tab to verify Service Worker is activated and IndexedDB `urja_saathi_db` is connected.
4. **Clean Demo Reset (if needed):**
   - Navigate to `/settings`.
   - Click **"Restore Demo Bills"** to reset baseline mock records.
   - Click **"Verify Cache"** to ensure Service Worker `v1.0.2` is running.

---

## Timed 5-Minute Demonstration Journey

### Step 1: Landing Page & Problem Context (0:00 – 0:35)
* **URL:** `/`
* **On-Screen Action:**
  - Scroll past hero banner to the Interactive Savings Estimator slider.
  - Slide consumption from 300 to 450 kWh.
  - Click the primary CTA: **"Analyze Your Bill"**.
* **What to Say to Judges:**
  > *"Across Indian tier-2 and tier-3 households, volatile electricity bills create severe household stress due to steep telescopic slab penalties, while rural youth seek dignified green jobs. URJA SAATHI solves both sides of this equation with 'Har Ghar Bachat, Har Haath Kaam' — an offline-first, private PWA that turns bills into clear savings and directs work straight to local certified technicians with zero platform commission."*
* **Expected Output:**
  - Dynamic annual savings estimate updates immediately in the hero widget.
  - Smooth client-side navigation to `/bills`.
* **Potential Failure:** Slow first render if network is throttled.
* **Recovery Procedure:** Emphasize that the app shell is precached by the Service Worker and loads in under 500ms even on 2G connections.

---

### Step 2: Electricity Bill Analyzer & Local OCR (0:35 – 1:20)
* **URL:** `/bills`
* **On-Screen Action:**
  - Point out the **"Zero-Cloud OCR"** badge.
  - In the **"Instant Test: Sample Electricity Bills"** section, click **"BSES Rajdhani (Delhi) - 420 kWh"**.
  - On the Image Preview screen, demonstrate the **High Contrast** toggle and rotation controls.
  - Click **"Confirm & Scan Bill"** (or if demonstrating offline speed, click **"Enter Details Manually"**).
  - Show the **Bill Review Form**: highlight that numbers are fully editable.
  - Click **"Confirm & Save Bill to IndexedDB"**.
* **What to Say to Judges:**
  > *"Household privacy is paramount. Unlike cloud-AI tools that upload consumer utility bills and addresses to remote servers, URJA SAATHI uses client-side OCR running inside a dedicated Web Worker on the device. Notice how telescopic DISCOM tariffs are decomposed into progressive slabs, showing exactly which units triggered the highest ₹8.00/unit penalty bracket."*
* **Expected Output:**
  - Bill saved toast notification appears.
  - Stored Bills history shows 420 kWh bill saved into IndexedDB.
* **Potential Failure:** Tesseract language model download blocked or slow.
* **Recovery Procedure:** Click **"Enter Details Manually"** or switch to the **"Slab Calculator"** tab to enter 340 kWh in 3 seconds.

---

### Step 3: Household Savings Planner & Inventory (1:20 – 2:00)
* **URL:** `/savings`
* **On-Screen Action:**
  - Show that the 420 kWh baseline from the bill is reflected automatically.
  - Click the **"2BHK Urban"** quick profile button.
  - In the appliance table, change Air Conditioner usage from 6 hours to 4 hours.
  - Observe real-time recalculation of the interactive Donut chart and monthly savings.
  - Expand the top recommendation card: *"Increase AC thermostat from 20°C to 24°C"*.
* **What to Say to Judges:**
  > *"Rather than generic advice like 'turn off lights', our deterministic physics engine computes appliance-specific energy consumption. Adjusting AC hours or temperature by 4°C immediately yields ₹1,200/month in verified telescopic slab savings without degrading comfort."*
* **Expected Output:**
  - Appliance Donut chart updates without page reload.
  - Monthly potential savings badge updates in real time.
* **Potential Failure:** Accidental double-click on preset prompt.
* **Recovery Procedure:** The confirmation dialog safely protects customized appliances from accidental overwrite.

---

### Step 4: Rooftop Solar Feasibility Engine (2:00 – 2:40)
* **URL:** `/solar`
* **On-Screen Action:**
  - Note how consumption baseline (420 kWh/mo) is carried over.
  - Set Roof Area to **350 sq ft** and Shadow Factor to **10%**.
  - Show the 3-Way Recommendation:
    1. **Recommended Capacity:** 3.0 kW
    2. **Estimated Daily Generation:** 12.6 kWh
    3. **Net Cost After Subsidy:** ₹1,08,000 (Central Subsidy: ₹78,000)
    4. **Payback Period:** ~3.2 years
* **What to Say to Judges:**
  > *"Going solar is often confusing for homeowners. Our solar feasibility engine assesses physical roof constraints, shadow obstacles, and MNRE benchmark formulas to give households a transparent 3-way viability assessment and accurate payback timeline."*
* **Expected Output:**
  - Clear system size recommendation, subsidy breakdown, and monthly generation curve.
* **Potential Failure:** User inputs 0 roof area.
* **Recovery Procedure:** The engine gracefully displays *"Insufficient rooftop area for grid-tied solar (minimum 100 sq ft required)"* without crashing.

---

### Step 5: Transparent Quotation Comparison (2:40 – 3:15)
* **URL:** `/quotations`
* **On-Screen Action:**
  - Point out the **MNRE Benchmark Price** reference line (₹65,000/kWp).
  - Highlight the **"#1 Recommended"** vendor badge.
  - Click **"View Full Quotation Specs"** on Tata Power Solar.
  - Show the component breakdown (Tier-1 Bifacial panels, IP65 string inverter, 25-year warranty).
* **What to Say to Judges:**
  > *"Homeowners often fall prey to inflated local installer quotes. URJA SAATHI benchmarks every vendor proposal against official MNRE rates, verifying equipment quality, warranty terms, and net cost after direct subsidy."*
* **Expected Output:**
  - Side-by-side vendor comparison table with sticky metric headers and equipment transparency.

---

### Step 6: Government Schemes & DBT Preparation (3:15 – 3:45)
* **URL:** `/schemes`
* **On-Screen Action:**
  - Select State: **Madhya Pradesh** / Utility: **MPPKVVCL (Indore)**.
  - Inspect the **PM Surya Ghar: Muft Bijli Yojana** card.
  - Click **"Check Eligibility & Application Checklist"**.
  - Check 2 criteria: *"Individual residential electricity connection"* and *"Shadow-free rooftop ownership"*.
  - Observe progress indicator update from 0% to 40%.
* **What to Say to Judges:**
  > *"Under PM Surya Ghar, eligible households get up to ₹78,000 in direct central subsidy deposited straight into their bank account. We guide households step-by-step through required documentation and discom net-metering readiness."*
* **Expected Output:**
  - Modal opens with official National Portal link and interactive document readiness checklist.

---

### Step 7: Community Workforce & Green Livelihoods (3:45 – 4:15)
* **URL:** `/workforce`
* **On-Screen Action:**
  - Show the **"100% Commission-Free Platform Guarantee"** badge.
  - Filter by role: **"Surya Mitra Solar Tech"**.
  - Show technician card: **Anand Verma (Surya Mitra Certified)**.
  - Point out truth in labeling: Verified credentials vs Simulated Demo Profile watermarks.
  - Click **"Book Service"** > Show the Safety Mandate: Technical electrical work cannot be assigned to non-technical guides!
  - Click **"Submit Service Request"**.
* **What to Say to Judges:**
  > *"This is the 'Har Haath Kaam' pillar. We connect households directly with certified local technicians like government-trained Surya Mitras and licensed wiremen. There are no middleman commissions. Furthermore, our strict safety rule prevents hazardous electrical tasks from being dispatched to non-technical volunteers."*
* **Expected Output:**
  - Service request booked toast; record enqueued into IndexedDB.

---

### Step 8: Evidence-Based Impact Tracker (4:15 – 4:45)
* **URL:** `/impact`
* **On-Screen Action:**
  - Point to the data source mode switch at the top:
    - **"Demo Data"** vs **"Live Records"**.
  - Show **Tripartite Impact Cards**:
    - **Tier 1 (Measured):** ₹4,820 (Audited post-intervention meter bills).
    - **Tier 2 (Estimated):** ₹14,250 (Calculated appliance behavioral savings).
    - **Tier 3 (Potential):** ₹42,000 (Rooftop solar projected yield).
  - Switch toggle to **"Live Records"**:
    - Show that the newly booked service request and saved bill appear here, completely isolated from demo records.
* **What to Say to Judges:**
  > *"Most platforms inflate their impact with fabricated totals. URJA SAATHI introduces Tripartite Evidence Separation: Tier 1 measured audit bills, Tier 2 estimated savings, and Tier 3 solar potential are strictly segregated. Real household records and demo figures are never commingled."*
* **Expected Output:**
  - Clear segregation of real vs demonstration data with DPDP-compliant masked phone numbers (`+91 98*** *****`).

---

### Step 9: Technical Architecture & Wrap-Up (4:45 – 5:00)
* **On-Screen Action:**
  - Toggle browser offline (DevTools Network > Offline).
  - Refresh `/dashboard` — the app loads instantly from the Service Worker cache shell!
* **What to Say to Judges:**
  > *"To summarize: URJA SAATHI is 100% offline-first, client-side private, PWA installable, with an 82% code-split bundle optimization. Har Ghar Bachat, Har Haath Kaam — empowering Indian households to save energy while generating dignified green livelihoods. Thank you, and we welcome your questions!"*

---

## Quick Reference: Demo Fallback Cheat Sheet

| Scenario | What Happens | Immediate Action to Take |
| :--- | :--- | :--- |
| **No WiFi / Lost Connection** | Network offline | Continue demo as planned! App shell, charts, and IndexedDB work 100% offline. |
| **OCR Fails / Slow Download** | Tesseract engine blocked | Click **"Enter Details Manually"** or use **Slab Calculator** tab (3 seconds). |
| **Accidental Data Mess** | Too many test records | Go to `/settings` > click **"Restore Demo Bills"** to reset clean state. |
| **Screen Resolution Issue** | Projector is 720p or 4K | App is responsive across all 7 viewports (360px to 1920px); zero horizontal scroll. |
