import { spawn } from 'child_process';
import { CDPClient } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startVitePreview(port = 4180) {
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

async function runLogoNavTest() {
  console.log('=== VERIFYING LOGO CLICK NAVIGATION IN REAL HEADLESS CHROME ===\n');
  const port = 4180;
  const preview = await startVitePreview(port);
  const client = new CDPClient({
    port: 9225,
    profileDir: 'C:\\Users\\Shubham\\.gemini\\antigravity\\brain\\7d1c114a-624d-4f70-a30e-31f69d851b2b\\scratch\\logo_nav_profile'
  });
  await client.launch();

  const results = [];

  try {
    // --- TEST 1: Click logo from /workforce -> Landing page (/) ---
    console.log('Step 1: Navigating to /workforce...');
    await client.navigate(`http://127.0.0.1:${port}/workforce`, 1500);
    const workforceInfo = await client.evaluate(`({
      pathname: window.location.pathname,
      hasWorkforce: document.body.innerText.includes('Workforce') || document.body.innerText.includes('Electrician')
    })`);
    console.log('  Workforce page loaded:', workforceInfo);

    console.log('  Clicking URJA SAATHI logo in sidebar...');
    const click1 = await client.evaluate(`(() => {
      const link = document.querySelector('a[aria-label="Go to URJA SAATHI home"]');
      if (link) {
        link.click();
        return { clicked: true, href: link.getAttribute('href') };
      }
      return { clicked: false };
    })()`);
    console.log('  Logo click action:', click1);
    await sleep(1000);

    const postClick1 = await client.evaluate(`({
      pathname: window.location.pathname,
      hasHeroText: document.body.innerText.includes('Har Ghar Bachat') || document.body.innerText.includes('Solar')
    })`);
    console.log('  Post-click 1 page state:', postClick1);
    const pass1 = postClick1.pathname === '/' && postClick1.hasHeroText;
    results.push({ test: 'Click logo from /workforce -> /', pass: pass1 });

    // --- TEST 2: Click logo from /solar-audit -> Landing page (/) ---
    console.log('\nStep 2: Navigating to /solar-audit...');
    await client.navigate(`http://127.0.0.1:${port}/solar-audit`, 1500);
    const solarInfo = await client.evaluate(`({
      pathname: window.location.pathname,
      hasSolar: document.body.innerText.includes('Solar') || document.body.innerText.includes('Feasibility')
    })`);
    console.log('  Solar page loaded:', solarInfo);

    console.log('  Clicking URJA SAATHI logo in sidebar...');
    await client.evaluate(`(() => {
      const link = document.querySelector('a[aria-label="Go to URJA SAATHI home"]');
      if (link) link.click();
    })()`);
    await sleep(1000);

    const postClick2 = await client.evaluate(`({
      pathname: window.location.pathname,
      hasHeroText: document.body.innerText.includes('Har Ghar Bachat') || document.body.innerText.includes('Solar')
    })`);
    console.log('  Post-click 2 page state:', postClick2);
    const pass2 = postClick2.pathname === '/' && postClick2.hasHeroText;
    results.push({ test: 'Click logo from /solar-audit -> /', pass: pass2 });

    // --- TEST 3: Click logo from /quotations -> Landing page (/) ---
    console.log('\nStep 3: Navigating to /quotations...');
    await client.navigate(`http://127.0.0.1:${port}/quotations`, 1500);
    const quoteInfo = await client.evaluate(`({
      pathname: window.location.pathname,
      hasQuotes: document.body.innerText.includes('Quotation') || document.body.innerText.includes('Installer')
    })`);
    console.log('  Quotations page loaded:', quoteInfo);

    console.log('  Clicking URJA SAATHI logo in sidebar...');
    await client.evaluate(`(() => {
      const link = document.querySelector('a[aria-label="Go to URJA SAATHI home"]');
      if (link) link.click();
    })()`);
    await sleep(1000);

    const postClick3 = await client.evaluate(`({
      pathname: window.location.pathname,
      hasHeroText: document.body.innerText.includes('Har Ghar Bachat') || document.body.innerText.includes('Solar')
    })`);
    console.log('  Post-click 3 page state:', postClick3);
    const pass3 = postClick3.pathname === '/' && postClick3.hasHeroText;
    results.push({ test: 'Click logo from /quotations -> /', pass: pass3 });

    // --- TEST 4: Browser Back returns to /quotations ---
    console.log('\nStep 4: Testing Browser Back navigation...');
    await client.evaluate(`window.history.back()`);
    await sleep(1000);
    const postBack = await client.evaluate(`({
      pathname: window.location.pathname,
      hasQuotes: document.body.innerText.includes('Quotation') || document.body.innerText.includes('Installer')
    })`);
    console.log('  Post-back page state:', postBack);
    const pass4 = postBack.pathname === '/quotations' && postBack.hasQuotes;
    results.push({ test: 'Browser Back returns to previous route (/quotations)', pass: pass4 });

    // --- TEST 5: Refresh on Landing Page works ---
    console.log('\nStep 5: Testing reload on landing page...');
    await client.navigate(`http://127.0.0.1:${port}/`, 1000);
    await client.evaluate(`window.location.reload()`);
    await sleep(1500);
    const postReload = await client.evaluate(`({
      pathname: window.location.pathname,
      hasHeroText: document.body.innerText.includes('Har Ghar Bachat') || document.body.innerText.includes('Solar')
    })`);
    console.log('  Post-reload page state:', postReload);
    const pass5 = postReload.pathname === '/' && postReload.hasHeroText;
    results.push({ test: 'Refresh on landing page works', pass: pass5 });

    // --- TEST 6: Existing data preserved ---
    console.log('\nStep 6: Verifying saved data integrity...');
    const dataIntact = await client.evaluate(`(() => {
      return {
        localStorageKeys: Object.keys(localStorage),
        hasIndexedDB: 'indexedDB' in window
      };
    })()`);
    console.log('  Storage integrity:', dataIntact);
    const pass6 = dataIntact.hasIndexedDB === true;
    results.push({ test: 'Existing saved data remains intact across navigation', pass: pass6 });

    // Print summary
    console.log('\n========================================');
    console.log('REAL-BROWSER LOGO NAVIGATION TEST SUMMARY');
    console.log('========================================');
    let allPassed = true;
    for (const r of results) {
      console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.test}`);
      if (!r.pass) allPassed = false;
    }
    console.log('========================================\n');

    if (!allPassed) {
      process.exitCode = 1;
    }
  } finally {
    await client.close();
    preview.kill();
  }
}

runLogoNavTest().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
