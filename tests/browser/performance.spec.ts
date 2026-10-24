import { test, expect } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';
import os from 'node:os';

test('performance scenarios A/B: one renderer with one and six connected participants', async ({ page }, info) => {
  const errors: string[] = [], peers: Room[] = [];
  let bytes=0, frames=0;
  page.on('pageerror',e => errors.push(e.name));
  page.on('websocket', ws => {
    if (new URL(ws.url()).pathname.split('/').length !== 3) return;
    ws.on('framereceived', ({payload}) => { frames++; bytes += typeof payload === 'string' ? Buffer.byteLength(payload) : payload.byteLength; });
  });
  const start=Date.now();
  await page.goto('/');
  await page.getByRole('button',{name:'⚙ Settings'}).click();
  await page.getByLabel('GRAPHICS',{exact:true}).selectOption('LOW');
  await page.getByLabel('Navigation aids',{exact:true}).check();
  await page.getByRole('button',{name:'⚙ Settings'}).click();
  await page.getByLabel('YOUR NAME',{exact:true}).fill('Performance Host');
  await page.getByRole('button',{name:'Create a private lobby'}).click();
  await expect(page.locator('header .eyebrow')).toContainText('WAITING',{timeout:120000});
  const firstPlayableMs=Date.now()-start;
  const sample=page.getByLabel('Frame performance');
  async function measure(label: string) {
    const from=Date.now(), beginBytes=bytes, beginFrames=frames;
    const samples: object[]=[];
    let previous=from;
    for(let i=0;i<3;i++) {
      await expect.poll(async()=> Number(await sample.getAttribute('data-sampled-at')),{timeout:60000}).toBeGreaterThan(previous);
      previous=Number(await sample.getAttribute('data-sampled-at'));
      samples.push({fps: Number(await sample.getAttribute('data-fps')),p95Ms:Number(await sample.getAttribute('data-p95')),meanMs:Number(await sample.getAttribute('data-frame-ms')),drawCalls:Number(await sample.getAttribute('data-calls')),triangles:Number(await sample.getAttribute('data-triangles'))});
    }
    const metrics=await page.evaluate(()=>({
      navigation: performance.getEntriesByType('navigation').map(e=>({duration:e.duration})),
      resources: performance.getEntriesByType('resource').reduce((sum,e)=>sum+((e as PerformanceResourceTiming).transferSize||0),0),
      heap: (performance as Performance & {memory?: {usedJSHeapSize:number}}).memory?.usedJSHeapSize ?? null,
      userAgent:navigator.userAgent,
    }));
    await info.attach(label,{body:JSON.stringify({label,graphics:'LOW',renderer:'Linux CI SwiftShader software WebGL',viewport:'1280x800',samples,windowMs:Date.now()-from,receivedFrames:frames-beginFrames,receivedBytes:bytes-beginBytes,receivedBytesPerSecond:(bytes-beginBytes)/((Date.now()-from)/1000),firstPlayableMs,firstPlayableScope:"navigation through joined lobby UI, not a sustained responsiveness guarantee",runner:{platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,totalMemoryBytes:os.totalmem()},...metrics}),contentType:'application/json'});
    await info.attach(label+'-canvas',{body:await page.locator('canvas').first().screenshot(),contentType:'image/png'});
  }
  try {
    await measure('A-one-player-one-renderer');
    await page.getByText('Manual invitation',{exact:true}).click();
    const invite=await page.getByLabel('Invite token',{exact:true}).inputValue();
    await page.getByText('Manual invitation',{exact:true}).click();
    const client=new Client('ws://127.0.0.1:2572',{headers:{Origin:'http://127.0.0.1:5174'}});
    for(let i=0;i<5;i++) {
      const response=await fetch('http://127.0.0.1:2572/api/admit',{method:'POST',headers:{Origin:'http://127.0.0.1:5174','Content-Type':'application/json'},body:JSON.stringify({create:false,invite,name:'Metric peer '+i,avatar:i%2?'mara':'soren'})});
      expect(response.ok).toBe(true);
      const room=await client.consumeSeatReservation(await response.json());
      room.onMessage('*',()=>{});
      peers.push(room);
    }
    await expect(page.locator('.roster .player')).toHaveCount(6);
    await measure('B-six-participants-one-renderer-five-socket-peers');
    await page.mouse.click(640,420);
    const nav=page.getByLabel('Navigation readout'), z=await nav.getAttribute('data-z'), inputAt=Date.now();
    await page.keyboard.down('w');
    await expect.poll(()=>nav.getAttribute('data-z'),{timeout:10000,intervals:[25]}).not.toBe(z);
    const inputToObservedPositionMs=Date.now()-inputAt;
    await page.keyboard.up('w');
    await info.attach('input-responsiveness',{body:JSON.stringify({inputToObservedPositionMs,scope:'loopback input to observed authoritative HUD position, includes rendering/snapshot delay; not WAN RTT'}),contentType:'application/json'});
    const transitionAt=Date.now();
    await page.getByRole('button',{name:'Begin the match →'}).click();
    await expect(page.locator('header .eyebrow')).toContainText('PREPARATION');
    const headerTransitionMs=Date.now()-transitionAt;
    await expect.poll(async()=>Number(await sample.getAttribute('data-sampled-at')),{timeout:60000}).toBeGreaterThan(transitionAt);
    const server=await (await fetch('http://127.0.0.1:2572/ready')).json();
    await info.attach('scene-transition',{body:JSON.stringify({headerTransitionMs,firstPostTransitionFrameSampleMs:Date.now()-transitionAt,world:await page.locator('h2').innerText(),serverRSS:server.rss,scope:'UI transition and first subsequent multi-frame render sample; not an isolated asset-decode measurement'}),contentType:'application/json'});
    await info.attach('transition-canvas',{body:await page.locator('canvas').first().screenshot(),contentType:'image/png'});
    expect(errors).toEqual([]);
  } finally {
    for(const room of peers) await room.leave();
  }
});
