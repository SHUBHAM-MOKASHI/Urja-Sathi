import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class CDPClient {
  constructor(options = {}) {
    this.port = options.port || 9222;
    this.profileDir = options.profileDir || 'C:\\Users\\Shubham\\.gemini\\antigravity\\brain\\7d1c114a-624d-4f70-a30e-31f69d851b2b\\scratch\\chrome_qa_profile';
    this.chromePath = options.chromePath || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.chromeProc = null;
    this.ws = null;
    this.reqId = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.pageErrors = [];
    this.pageId = null;
  }

  async launch() {
    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }

    this.chromeProc = spawn(this.chromePath, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--no-sandbox',
      '--remote-allow-origins=*',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      `--user-data-dir=${this.profileDir}`,
      'about:blank'
    ]);

    // Wait for CDP to respond
    let targetWs = null;
    for (let i = 0; i < 40; i++) {
      try {
        const newPageRes = await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: 'PUT' });
        const newPage = await newPageRes.json();
        if (newPage && newPage.webSocketDebuggerUrl) {
          targetWs = newPage.webSocketDebuggerUrl;
          this.pageId = newPage.id;
          break;
        }
      } catch (e) {
        // wait
      }
      await new Promise(r => setTimeout(r, 250));
    }

    if (!targetWs) {
      throw new Error(`Failed to launch Chrome and connect to CDP port ${this.port}`);
    }

    this.ws = new WebSocket(targetWs);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(msg.error);
          else cb.resolve(msg.result);
        }

        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => (a.value !== undefined ? String(a.value) : (a.description || ''))).join(' ');
          if (msg.params.type === 'error') {
            this.consoleErrors.push(text);
          } else if (msg.params.type === 'warning') {
            this.consoleWarnings.push(text);
          }
        }

        if (msg.method === 'Runtime.exceptionThrown') {
          this.pageErrors.push(msg.params.exceptionDetails?.text || 'Uncaught exception');
        }
      } catch (err) {
        // ignore parse error
      }
    };

    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Log.enable');
    await this.send('DOM.enable');
    await this.send('Network.enable');

    return this;
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.reqId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url, waitMs = 1500) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation error: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`);
      if (exists) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async waitForFunction(fnString, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await this.evaluate(fnString);
      if (res) return res;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for function: ${fnString}`);
  }

  async click(selector) {
    await this.waitForSelector(selector);
    const clicked = await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
        return true;
      })()
    `);
    if (!clicked) throw new Error(`Could not click element: ${selector}`);
    await new Promise(r => setTimeout(r, 300));
  }

  async type(selector, text) {
    await this.waitForSelector(selector);
    await this.evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.focus();
        el.value = ${JSON.stringify(text)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `);
    await new Promise(r => setTimeout(r, 200));
  }

  async setViewport({ width, height, deviceScaleFactor = 1, mobile = false }) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile
    });
    await this.send('Emulation.setVisibleSize', { width, height });
    await new Promise(r => setTimeout(r, 300));
  }

  async captureScreenshot(filepath, fullPage = false) {
    const params = { format: 'png' };
    if (fullPage) {
      params.captureBeyondViewport = true;
    }
    const res = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'));
    return filepath;
  }

  async setOffline(offline = true) {
    if (offline) {
      await this.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
      });
    } else {
      await this.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1
      });
    }
    await new Promise(r => setTimeout(r, 200));
  }

  clearErrors() {
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async close() {
    try {
      if (this.ws) {
        this.ws.close();
      }
    } catch (e) {}

    try {
      if (this.chromeProc) {
        this.chromeProc.kill('SIGKILL');
      }
    } catch (e) {}
  }
}
