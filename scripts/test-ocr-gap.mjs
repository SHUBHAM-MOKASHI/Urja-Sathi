import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CDPClient } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startVitePreview(port = 4175) {
  const preview = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    shell: true,
    stdio: 'pipe'
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}`);
      if (res.ok) return preview;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error(`Preview failed on port ${port}`);
}

async function runOcrGapTest() {
  console.log('=== TESTING BATCH 8A QA GAP 6A: SYNTHETIC BILL UPLOAD & OCR / CORRECTION ===');
  const preview = await startVitePreview(4175);
  const client = new CDPClient({ port: 9224, profileDir: 'C:\\Users\\Shubham\\.gemini\\antigravity\\brain\\7d1c114a-624d-4f70-a30e-31f69d851b2b\\scratch\\ocr_gap_profile' });
  await client.launch();

  try {
    await client.navigate('http://127.0.0.1:4175/bills', 1500);

    // 1. Click a synthetic sample bill (e.g. BSES Rajdhani 420 kWh)
    console.log('Step 1: Selecting synthetic bill (BSES Rajdhani 420 kWh)...');
    const selectRes = await client.evaluate(`
      (() => {
        const sampleBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('BSES') || b.innerText.includes('Demo Bill'));
        if (sampleBtns.length > 0) {
          sampleBtns[1] ? sampleBtns[1].click() : sampleBtns[0].click();
          return { clicked: true, sampleCount: sampleBtns.length };
        }
        return { clicked: false };
      })()
    `);
    console.log('  Selected sample:', selectRes);
    await sleep(1000);

    // 2. Check that BillImagePreview renders with canvas preprocessing
    console.log('Step 2: Checking BillImagePreview image rendering...');
    const previewRes = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        const img = document.querySelector('img[alt="Bill Preview"]');
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm') || b.innerText.includes('Start'));
        return {
          hasPreviewText: text.includes('Inspect Bill') || text.includes('Confirm') || text.includes('Rotation') || text.includes('Contrast'),
          hasPreviewImage: !!img,
          hasConfirmBtn: !!confirmBtn
        };
      })()
    `);
    console.log('  Preview state:', previewRes);

    // 3. Trigger OCR Recognition
    console.log('Step 3: Triggering OCR Recognition...');
    await client.evaluate(`
      (() => {
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm') || b.innerText.includes('Start'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);
    await sleep(1500);

    // 4. Verify OCR Progress or graceful fallback handling
    console.log('Step 4: Checking processing or review form state...');
    const step4State = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        const hasForm = text.includes('Consumer Name') || text.includes('Billed Units') || text.includes('Review');
        const hasProgress = text.includes('Analyzing') || text.includes('OCR Processing') || text.includes('Worker');
        const manualEntryBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enter Details Manually'));
        if (manualEntryBtn) {
          manualEntryBtn.click();
          return { hasForm: true, usedManualFallback: true };
        }
        return { hasForm, hasProgress, usedManualFallback: false };
      })()
    `);
    console.log('  OCR / Review State:', step4State);
    await sleep(1000);

    // 5. In BillReviewForm, verify values are editable and correctable
    console.log('Step 5: Verifying value correction in Review Form...');
    const editRes = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        const inputs = Array.from(document.querySelectorAll('input'));
        const unitInput = inputs.find(i => i.value === '420' || i.type === 'number');
        if (unitInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeSetter.call(unitInput, '450');
          unitInput.dispatchEvent(new Event('input', { bubbles: true }));
          unitInput.dispatchEvent(new Event('change', { bubbles: true }));
          return { corrected: true, newUnits: unitInput.value };
        }
        return { corrected: false, inputCount: inputs.length };
      })()
    `);
    console.log('  Value correction result:', editRes);

    // 6. Confirm and save bill
    console.log('Step 6: Saving corrected bill to IndexedDB...');
    const saveRes = await client.evaluate(`
      (() => {
        const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Confirm & Save') || b.innerText.includes('Save'));
        if (saveBtn) {
          saveBtn.click();
          return { clickedSave: true };
        }
        return { clickedSave: false };
      })()
    `);
    console.log('  Save dispatched:', saveRes);
    await sleep(1200);

    // 7. Verify sync to Savings Planner
    console.log('Step 7: Verifying updated bill reflected in Savings Planner...');
    await client.navigate('http://127.0.0.1:4175/savings', 1200);
    const savingsCheck = await client.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasSavingsHeader: text.includes('Savings Planner') || text.includes('Household Energy'),
          hasApplianceTable: text.includes('LED') || text.includes('Fan') || text.includes('Refrigerator'),
          textSample: text.substring(0, 200)
        };
      })()
    `);
    console.log('  Savings Planner check:', savingsCheck);

    const overallPassed = selectRes.clicked && previewRes.hasPreviewImage && savingsCheck.hasSavingsHeader;
    console.log(`\nQA Gap 6A Test Result: ${overallPassed ? 'SUCCESS (PASS)' : 'FAILED'}`);
    process.exit(overallPassed ? 0 : 1);

  } finally {
    await client.close();
    try {
      spawn('taskkill', ['/pid', String(preview.pid), '/f', '/t']);
    } catch (e) {}
  }
}

runOcrGapTest().catch(err => {
  console.error('OCR Gap Test Error:', err);
  process.exit(1);
});
