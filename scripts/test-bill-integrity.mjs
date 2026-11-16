// C1 production-browser smoke test. Creates only an isolated temporary Chrome profile.
// Requires an existing build and installed Chrome; no dependencies are downloaded.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { CDPClient } from './cdp-client.mjs';
const profileDir = mkdtempSync(join(tmpdir(), 'urja-c1-'));
const client = new CDPClient({port: 9237, profileDir});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4187','--strictPort'], {stdio:'pipe',windowsHide:true});
const pause = ms => new Promise(resolve=>setTimeout(resolve,ms));
const button = async text => {
  const clicked = await client.evaluate(`(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})); if(!b || b.disabled)return false; b.click();return true;})()`);
  assert.ok(clicked, `Enabled button: ${text}`);
};
const upload = async () => {
  await client.evaluate(`(async()=>{
    const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=1000;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1400,1000);ctx.fillStyle='black';ctx.font='32px Arial';
    ['SYNTHETIC ELECTRICITY BILL - C1 TEST','Consumer Name: Synthetic Test Household','Consumer No.: 001234567890','Bill Date: 01/10/2024','Billed Units: 340','Current Bill Amount: 2000','Net Amount Payable: 2580'].forEach((line,i)=>ctx.fillText(line,60,90+i*90));
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const file=new File([blob],'synthetic-c1.png',{type:'image/png'});
    const dt=new DataTransfer();dt.items.add(file);
    const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await client.waitForFunction(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Confirm & Start Analysis')&&!b.disabled)`,10000);
};
const bills = () => client.evaluate(`new Promise((resolve,reject)=>{const open=indexedDB.open('urja_saathi_offline_db');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const q=db.transaction('bills').objectStore('bills').getAll();q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
try {
  for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4187')).ok)break;}catch{}await pause(250);}
  await client.launch();
  console.log('Isolated Chrome profile:',profileDir);
  await client.navigate('http://127.0.0.1:4187/bills');
  assert.equal((await bills()).length,0);
  await upload();await button('Confirm & Start Analysis');
  await client.waitForFunction(`document.body.innerText.includes('Cancel OCR')`,5000);
  await button('Cancel OCR');await pause(1500);
  assert.ok(await client.evaluate(`document.body.innerText.includes('Upload Electricity Bill') && !document.body.innerText.includes('Verify & Confirm Extracted Bill Data')`));
  assert.equal((await bills()).length,0);console.log('PASS upload, start, cancellation, no unintended save');
  await upload();await button('Confirm & Start Analysis');
  await client.waitForFunction(`document.body.innerText.includes('Verify & Confirm Extracted Bill Data') || document.body.innerText.includes('OCR Processing Interrupted')`,55000);
  assert.ok(await client.evaluate(`document.body.innerText.includes('Verify & Confirm Extracted Bill Data')`), 'Actual Tesseract OCR must reach review; manual fallback is not an OCR pass');
  const fields=await client.evaluate(`[...document.querySelectorAll('form input')].filter(i=>i.type!=='checkbox').map(i=>({type:i.type,value:i.value}))`);
  assert.equal(fields[0].value,'2580');assert.equal(fields[1].value,'340');
  assert.ok(fields.some(f=>f.value==='001234567890'));assert.ok(fields.some(f=>f.value==='2024-10-01'));
  assert.ok(await client.evaluate(`document.body.innerText.includes('Fixed charges: Not extracted')`));
  await client.evaluate(`(()=>{const input=document.querySelector('form input[type=number]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2581');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await button('Confirm & Save');await client.waitForFunction(`document.body.innerText.includes('Reviewed Bill Saved!')`,10000);
  let stored=await bills();assert.equal(stored.length,1);assert.equal(stored[0].totalAmount,2581);assert.equal(stored[0].unitsConsumed,340);assert.equal(stored[0].source,'ocr_scan');assert.equal(stored[0].chargeStatus.fixedCharges,'unknown');assert.equal(stored[0].dueDate,'Not provided');assert.equal(stored[0].slabBreakdown,undefined);
  console.log('PASS real OCR, review correction, explicit confirmation, save, unknown-charge metadata');
  await client.send('Page.reload');await pause(1500);await button('Stored Bills');assert.equal((await bills()).length,1);
  assert.ok(await client.evaluate(`document.body.innerText.includes('Not provided')`));console.log('PASS refresh and bill history persistence');
  for(const [route,heading] of [['dashboard','Latest Consumption'],['savings','Savings'],['solar','Solar']]){
    await client.navigate('http://127.0.0.1:4187/'+route);
    assert.ok(await client.evaluate(`document.body.innerText.toLowerCase().includes(${JSON.stringify(heading.toLowerCase())})`));
    if(route==='dashboard')assert.ok(await client.evaluate(`document.body.innerText.includes('Due: Not provided')`));
    if(route==='savings'||route==='solar')assert.ok(await client.evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='340') && [...document.querySelectorAll('input')].some(i=>i.value==='2581')`));
  }
  console.log('PASS Dashboard/Savings/Solar consume saved bill without fabricated payment status');
  await client.navigate('http://127.0.0.1:4187/bills');await button('MPPKVVCL Domestic');await client.waitForFunction(`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Confirm & Start Analysis')&&!b.disabled)`,10000);await button('Confirm & Start Analysis');
  await client.waitForFunction(`document.body.innerText.includes('Verify & Confirm Extracted Bill Data') || document.body.innerText.includes('OCR Processing Interrupted')`,55000);
  assert.ok(await client.evaluate(`document.body.innerText.includes('Demonstration bill')`));
  await button('Confirm & Save');await pause(1500);stored=await bills();assert.equal(stored.length,2);assert.equal(stored.filter(b=>b.source==='sample').length,1);
  console.log('PASS demo provenance through actual OCR and save');
  assert.deepEqual(client.pageErrors,[]);console.log('PASS no uncaught browser exceptions');
} catch(error) {
  console.error('FAIL:',error.message);
  console.error('Browser errors:',client.pageErrors,client.consoleErrors);
  if(client.ws)console.error('Page:',await client.evaluate('document.body.innerText'));
  process.exitCode=1;
} finally {await client.close();server.kill();}
