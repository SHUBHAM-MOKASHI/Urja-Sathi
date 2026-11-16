import { describe, it, expect, vi } from 'vitest';
import { runOcrRecognition } from '../ocrService';
const mock=vi.hoisted(()=>({createWorker:vi.fn()}));
vi.mock('tesseract.js',()=>mock);
describe('C1 OCR cancellation',()=>{
 it('settles promptly during initialization and terminates a late worker',async()=>{
  let initialize!: (worker:any)=>void;
  mock.createWorker.mockImplementation(()=>new Promise(resolve=>{initialize=resolve;}));
  const controller=new AbortController();
  const task=runOcrRecognition('image',undefined,controller.signal).catch(e=>e.name);
  await vi.waitFor(()=>expect(initialize).toBeTypeOf('function'));
  controller.abort(); expect(await task).toBe('AbortError');
  const worker={recognize:vi.fn(),terminate:vi.fn(async()=>{})};
  initialize(worker);
  await vi.waitFor(()=>expect(worker.terminate).toHaveBeenCalledTimes(1));
  expect(worker.recognize).not.toHaveBeenCalled();
 });
 it('does not initialize an already cancelled request',async()=>{
  mock.createWorker.mockClear(); const c=new AbortController(); c.abort();
  await expect(runOcrRecognition('image',undefined,c.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(mock.createWorker).not.toHaveBeenCalled();
 });
 it('terminates recognition and suppresses late completion',async()=>{
  let finish!: (value:any)=>void;
  const worker={recognize:vi.fn(()=>new Promise(resolve=>{finish=resolve;})),terminate:vi.fn(async()=>{})};
  mock.createWorker.mockResolvedValue(worker);
  const controller=new AbortController(); const progress=vi.fn();
  const task=(runOcrRecognition as any)('image',progress,controller.signal);
  const outcome=task.then(()=> 'completed',(e:any)=>e.name);
  await vi.waitFor(()=>expect(worker.recognize).toHaveBeenCalled());
  controller.abort(); finish({data:{text:'late',confidence:90}});
  expect(await outcome).toBe('AbortError');
  expect(worker.terminate).toHaveBeenCalledTimes(1);
  expect(progress.mock.calls.some(([p])=>p.status==='Completed')).toBe(false);
 });
});
