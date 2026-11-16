import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CDPClient } from './cdp-client.mjs';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startVitePreview(port = 4174) {
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

async function measurePagePerformance(client, url) {
  // Clear any existing performance entries by navigating to blank first
  await client.navigate('about:blank', 200);

  // Setup performance tracking script before navigation
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__perf = {
        fcp: null,
        lcp: null,
        cls: 0,
        longTasks: [],
        navStart: performance.now()
      };

      try {
        const poPaint = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              window.__perf.fcp = entry.startTime;
            }
          }
        });
        poPaint.observe({ type: 'paint', buffered: true });
      } catch(e) {}

      try {
        const poLcp = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            window.__perf.lcp = entries[entries.length - 1].startTime;
          }
        });
        poLcp.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch(e) {}

      try {
        const poCls = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__perf.cls += entry.value;
            }
          }
        });
        poCls.observe({ type: 'layout-shift', buffered: true });
      } catch(e) {}

      try {
        const poLt = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__perf.longTasks.push({
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
        poLt.observe({ type: 'longtask', buffered: true });
      } catch(e) {}
    `
  });

  const t0 = Date.now();
  await client.navigate(url, 2000);
  const totalNavTime = Date.now() - t0;

  // Wait a bit for LCP / idle
  await sleep(1000);

  const metrics = await client.evaluate(`
    (() => {
      const perf = window.__perf || {};
      const navEntries = performance.getEntriesByType('navigation');
      const nav = navEntries.length > 0 ? navEntries[0] : null;

      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').pop().split('?')[0],
        initiatorType: r.initiatorType,
        transferSize: r.transferSize || 0,
        decodedBodySize: r.decodedBodySize || 0,
        duration: Math.round(r.duration)
      }));

      const jsResources = resources.filter(r => r.name.endsWith('.js') || r.initiatorType === 'script');
      const cssResources = resources.filter(r => r.name.endsWith('.css') || r.initiatorType === 'css' || r.initiatorType === 'link');

      const totalJsBytes = jsResources.reduce((a, b) => a + (b.decodedBodySize || b.transferSize), 0);
      const totalCssBytes = cssResources.reduce((a, b) => a + (b.decodedBodySize || b.transferSize), 0);

      // Total Blocking Time: sum of (duration - 50ms) for all tasks > 50ms between FCP and TTI/now
      const tbt = (perf.longTasks || []).reduce((acc, task) => {
        if (task.duration > 50) {
          return acc + (task.duration - 50);
        }
        return acc;
      }, 0);

      return {
        fcp: perf.fcp ? Math.round(perf.fcp) : (nav ? Math.round(nav.responseEnd) : null),
        lcp: perf.lcp ? Math.round(perf.lcp) : (perf.fcp ? Math.round(perf.fcp) : null),
        cls: Number((perf.cls || 0).toFixed(4)),
        tbt: Math.round(tbt),
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : null,
        loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : null,
        jsCount: jsResources.length,
        totalJsBytes,
        totalCssBytes,
        resources: jsResources.concat(cssResources)
      };
    })()
  `);

  return { ...metrics, totalNavTime };
}

async function run() {
  console.log('=== URJA SAATHI PERFORMANCE AUDIT HARNESS ===\n');
  const preview = await startVitePreview(4174);
  console.log('Preview server started on http://127.0.0.1:4174');

  const client = new CDPClient({ port: 9223, profileDir: 'C:\\Users\\Shubham\\.gemini\\antigravity\\brain\\7d1c114a-624d-4f70-a30e-31f69d851b2b\\scratch\\perf_profile' });
  await client.launch();
  console.log('Chrome CDP client connected on port 9223\n');

  try {
    console.log('Measuring Initial Landing Page Navigation (http://127.0.0.1:4174/)...');
    const landingPerf = await measurePagePerformance(client, 'http://127.0.0.1:4174/');
    console.log('Landing Page Results:');
    console.log(`  FCP (First Contentful Paint): ${landingPerf.fcp} ms`);
    console.log(`  LCP (Largest Contentful Paint): ${landingPerf.lcp} ms`);
    console.log(`  CLS (Cumulative Layout Shift): ${landingPerf.cls}`);
    console.log(`  TBT (Total Blocking Time): ${landingPerf.tbt} ms`);
    console.log(`  DOM Content Loaded: ${landingPerf.domContentLoaded} ms`);
    console.log(`  JS Files Transferred: ${landingPerf.jsCount}`);
    console.log(`  Initial JS Transferred/Decoded: ${(landingPerf.totalJsBytes / 1024).toFixed(1)} KB`);
    console.log(`  Initial CSS Transferred/Decoded: ${(landingPerf.totalCssBytes / 1024).toFixed(1)} KB`);

    console.log('\nMeasuring Route Transition: / -> /dashboard ...');
    const t0 = Date.now();
    await client.navigate('http://127.0.0.1:4174/dashboard', 1000);
    const navDashboardTime = Date.now() - t0;
    console.log(`  Route Transition Time: ${navDashboardTime} ms`);

    console.log('\nMeasuring Route Transition: /dashboard -> /bills ...');
    const t1 = Date.now();
    await client.navigate('http://127.0.0.1:4174/bills', 1000);
    const navBillsTime = Date.now() - t1;
    console.log(`  Route Transition Time: ${navBillsTime} ms`);

    const results = {
      landingPerf,
      navDashboardTime,
      navBillsTime,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      'C:\\Users\\Shubham\\.gemini\\antigravity\\brain\\7d1c114a-624d-4f70-a30e-31f69d851b2b\\scratch\\baseline_perf.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\nBaseline results saved to scratch/baseline_perf.json');
  } finally {
    await client.close();
    try {
      spawn('taskkill', ['/pid', String(preview.pid), '/f', '/t']);
    } catch (e) {}
  }
}

run().catch(err => {
  console.error('Performance measurement error:', err);
  process.exit(1);
});
