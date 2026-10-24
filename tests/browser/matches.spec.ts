import { test, expect, type Page, type BrowserContext, type TestInfo, type CDPSession } from "@playwright/test";
import sharp from "sharp";
import {
  UNIVERSES,
  universe,
  door,
  type Point,
  type Interactable,
} from "../../packages/shared/src/universes";
interface Traveler {
  page: Page;
  angle: number;
  pitch: number;
  name: string;
  own: string;
  visited: Set<string>;
}
const phase = (p: Page) => p.locator("header .eyebrow");
async function settings(p: Page) {
  await p.bringToFront();
  await p.getByRole("button", { name: "⚙ Settings" }).click();
  await p.getByLabel("GRAPHICS", { exact: true }).selectOption("LOW");
  await p.getByLabel("Navigation aids", { exact: true }).check();
  await p.getByRole("button", { name: "⚙ Settings" }).click();
}
async function renderedWorld(p: Page, info: TestInfo, name: string) {
  await p.bringToFront();
  const sample = p.getByLabel("Frame performance");
  await expect.poll(async () => Number(await sample.getAttribute("data-calls")), { timeout: 60000 }).toBeGreaterThan(0);
  const context = await p.locator("canvas").first().evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    return gl ? { version: gl.getParameter(gl.VERSION), lost: gl.isContextLost() } : null;
  });
  expect(context?.version).toContain("WebGL");
  expect(context?.lost).toBe(false);
  const image = await p.locator("canvas").first().screenshot();
  const stats = await sharp(image).stats();
  expect(Math.max(...stats.channels.slice(0,3).map(c => c.stdev))).toBeGreaterThan(2);
  await info.attach(name + "-webgl", { body: image, contentType: "image/png" });
  await info.attach(name + "-render", { body: JSON.stringify({ context,
    fps: await sample.getAttribute("data-fps"), p95Ms: await sample.getAttribute("data-p95"),
    calls: await sample.getAttribute("data-calls"), triangles: await sample.getAttribute("data-triangles"),
  }), contentType: "application/json" });
}
async function position(p: Page): Promise<Point> {
  const nav = p.getByLabel("Navigation readout");
  return {
    x: Number(await nav.getAttribute("data-x")),
    y: Number(await nav.getAttribute("data-y")),
    z: Number(await nav.getAttribute("data-z")),
  };
}
async function move(t: Traveler, target: Point, reach = 1.8) {
  const p = t.page;
  await p.bringToFront();
  await p.mouse.click(640, 420);
  const start = Date.now();
  let active = new Set<string>();
  try {
    while (Date.now() - start < 60000) {
      const at = await position(p),
        dx = target.x - at.x,
        dz = target.z - at.z,
        d = Math.hypot(dx, dz);
      if (d < reach && Math.abs(at.y - target.y) < 0.35) return;
      const forward =
          (-Math.sin(t.angle) * dx - Math.cos(t.angle) * dz) / Math.max(1, d),
        side =
          (Math.cos(t.angle) * dx - Math.sin(t.angle) * dz) / Math.max(1, d),
        next = new Set<string>(["Shift"]);
      if (d > reach) {
        if (forward > 0.32) next.add("w");
        else if (forward < -0.32) next.add("s");
        if (side > 0.32) next.add("d");
        else if (side < -0.32) next.add("a");
      }
      if (target.y > at.y + 0.2) next.add("Space");
      if (at.y > target.y + 0.2) next.add("c");
      for (const key of active) if (!next.has(key)) await p.keyboard.up(key);
      for (const key of next) if (!active.has(key)) await p.keyboard.down(key);
      active = next;
      await p.waitForTimeout(180);
    }
    throw Error("Keyboard traversal did not reach the approved landmark.");
  } finally {
    for (const key of active) await p.keyboard.up(key);
    await p.waitForTimeout(180);
  }
}
async function aim(t: Traveler, target: Point) {
  const nav=t.page.getByLabel('Navigation readout');
  t.angle=Number(await nav.getAttribute('data-heading'))*Math.PI/180;
  t.pitch=Number(await nav.getAttribute('data-camera-pitch'));
  const at = await position(t.page),
    desired = Math.atan2(at.x - target.x, at.z - target.z),
    delta = Math.atan2(
      Math.sin(desired - t.angle),
      Math.cos(desired - t.angle),
    );
  const desiredPitch = Math.max(
      -0.05,
      Math.min(
        1,
        (at.y + 1.4 - target.y - 0.7) /
          Math.max(0.1, Math.hypot(at.x - target.x, at.z - target.z)),
      ),
    ),
    pitchDelta = desiredPitch - t.pitch;
  for (let i = 0; i < 2; i++) {
    await t.page.mouse.move(640, 400);
    await t.page.mouse.down({ button: "right" });
    await t.page.mouse.move(
      640 - delta / 2 / 0.0035,
      400 + pitchDelta / 2 / 0.0025,
      { steps: 8 },
    );
    await t.page.mouse.up({ button: "right" });
  }
  t.angle += delta;
  t.pitch = desiredPitch;
  await t.page.waitForTimeout(500);
}
async function act(t: Traveler, object: Interactable, hide = false) {
  await move(t, object);
  const preparation=(await phase(t.page).innerText()).includes('PREPARATION');
  const prompt=preparation
    ? t.page.locator('.prepare').getByText(hide ? 'Hold E · hide at '+object.name : 'E · '+object.name,{exact:true})
    : t.page.getByRole('button',{name:new RegExp('E.*'+object.name)});
  // Wind/current continue during inspection. Re-aim from the visible HUD rather
  // than waiting motionless while an environmental force carries us out of reach.
  for(let attempt=0;attempt<12;attempt++) {
    const at=await position(t.page);
    if(Math.hypot(at.x-object.x,at.z-object.z)>2.3 || Math.abs(at.y-object.y)>0.8) await move(t,object);
    await aim(t,object);
    if(await prompt.isVisible()) break;
  }
  await expect(prompt).toBeVisible({timeout:5000});
  if (hide) {
    await expect(
      t.page.getByRole("button", { name: "Hold to hide key at the reticle" }),
    ).toBeEnabled();
    await t.page.keyboard.down("e");
    await t.page.waitForTimeout(750);
    await t.page.keyboard.up("e");
    await expect(t.page.locator(".toast")).toContainText("Your key is hidden");
  } else {
    if ((await phase(t.page).innerText()).includes("PREPARATION"))
      await expect(
        t.page
          .locator(".prepare")
          .getByText("E · " + object.name, { exact: true }),
      ).toBeVisible();
    else
      await expect(
        t.page.getByRole("button", { name: new RegExp("E.*" + object.name) }),
      ).toBeVisible();
    await t.page.keyboard.press("e");
  }
}
for (const n of [2, 3, 4, 5, 6])
  test(`${n}-player browser match: real keyboard, raycast hiding, mechanisms, keys, portal and replay`, async ({
    browser,
  }, info) => {
    const contexts: BrowserContext[] = [],
      travelers: Traveler[] = [],
      runtimeErrors: string[] = [], networkEvents: string[] = [];
    let completed = false;
    const observed: string[] = [];
    let profiler: CDPSession | undefined;
    try {
      let invite = "";
      // The app's guest identity/recovery is sessionStorage per top-level tab,
      // never cookies/localStorage. One context models real browser tabs and lets
      // visibility pause background WebGL instead of six foreground GPU windows.
      const context = await browser.newContext({
        baseURL: "http://127.0.0.1:5174",
        viewport: { width: 1280, height: 800 },
        storageState: {cookies:[],origins:[{origin:"http://127.0.0.1:5174",localStorage:[{name:"atrium:quality",value:"LOW"}]}]},
      });
      context.setDefaultTimeout(60000);
      contexts.push(context);
      const credentials = new Set<string>();
      for (let i = 0; i < n; i++) {
        const page = await context.newPage();
        if (n===2 && i===0) {
          profiler = await context.newCDPSession(page);
          await profiler.send('Profiler.enable');
          await profiler.send('Profiler.start');
        }
        page.on("crash", () => networkEvents.push("renderer crash"));
        page.on("framenavigated", f => networkEvents.push("navigation " + new URL(f.url()).pathname));
        page.on("pageerror", (e) => runtimeErrors.push(e.name + ": " + e.message.replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")));
        page.on("console", m => { if (m.type() === "error") runtimeErrors.push(m.text().replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")); });
        page.on("requestfailed", req => networkEvents.push(new URL(req.url()).pathname + ": " + req.failure()?.errorText));
        page.on("response", res => { if (res.status() >= 400) networkEvents.push(new URL(res.url()).pathname + ": " + res.status()); });
        page.on("websocket", ws => {
          networkEvents.push("ws open " + new URL(ws.url()).pathname);
          if (new URL(ws.url()).pathname.split('/').length === 3) {
            ws.on("framereceived", ({payload}) => networkEvents.push("rx " + (typeof payload === "string" ? payload.length : payload[0]) + " bytes=" + payload.length));
            ws.on("framesent", ({payload}) => networkEvents.push("tx " + (typeof payload === "string" ? payload.length : payload[0]) + " bytes=" + payload.length));
          }
          ws.on("socketerror", () => networkEvents.push("ws error"));
          ws.on("close", () => networkEvents.push("ws close"));
        });
        await page.goto("/");
        await settings(page);
        await page
          .getByRole("button", {
            name: i % 2 ? "Mara" : "Soren",
            exact: true,
          })
          .click();
        const name = `Browser ${n}-${i}`;
        await page.getByLabel("YOUR NAME", { exact: true }).fill(name);
        if (i === 0) {
          await page
            .getByRole("button", { name: "Create a private lobby" })
            .click();
          await expect(
            page.getByRole("button", { name: "Copy invite link ↗" }),
          ).toBeVisible({timeout:120000});
          await page.getByText("Manual invitation", { exact: true }).click();
          invite = await page
            .getByLabel("Invite token", { exact: true })
            .inputValue();
          expect(invite).toHaveLength(43);
          await page.getByText("Manual invitation", { exact: true }).click();
        } else {
          await page.getByLabel("Room code", { exact: true }).fill(invite);
          await page
            .getByRole("button", { name: "Join →", exact: true })
            .click();
          await expect(phase(page)).toContainText("WAITING");
        }
        const credential=await page.evaluate(()=>sessionStorage.getItem('atrium-resume'));
        expect(credential).toBeTruthy();
        credentials.add(credential!);
        expect(credentials.size).toBe(i+1);
        observed.push("joined-independent-tab:"+i);
        travelers.push({
          page,
          angle: 0.1,
          pitch: 0.32,
          name,
          own: "",
          visited: new Set(),
        });
      }
      const host = travelers[0];
      await expect(host.page.locator('.roster .player')).toHaveCount(n);
      for(const t of travelers) await expect(host.page.locator('.roster')).toContainText(t.name);
      await renderedWorld(host.page,info,'six-door-atrium-'+n);
      observed.push('lobby-count-and-webgl:'+n);
      let missingWorld: (typeof UNIVERSES)[number] | undefined;
      await host.page.bringToFront();
      await host.page
        .getByRole("button", { name: "Begin the match →" })
        .click();
      for (const t of travelers) {
        await t.page.bringToFront();
        await expect(phase(t.page)).toContainText("PREPARATION");
        t.own = await t.page.locator("h2").innerText();
        await renderedWorld(t.page, info, t.own);
        const u = UNIVERSES.find((u) => u.name === t.own)!;
        expect(u).toBeTruthy();
        const variant=t.page.getByLabel('MAIN MECHANISM',{exact:true});
        await variant.selectOption('1');
        await t.page.waitForTimeout(250);
        await expect(variant).toHaveValue('1');
        await variant.selectOption('0');
        await t.page.waitForTimeout(250);
        await expect(variant).toHaveValue('0');
        observed.push('configured-mechanism:'+u.id);
        for(const mechanism of u.mechanisms) {
          await act(t,mechanism);
          await expect(t.page.locator('.toast')).toContainText('activated');
          observed.push('activated:'+u.id+':'+mechanism.id);
        }
        await act(t, u.anchors[0], true);
        observed.push("rendered-and-hidden:"+u.id);
        await t.page
          .getByText("Approved room customization", { exact: true })
          .click();
        await t.page
          .getByLabel("SNAPPED POSITION", { exact: true })
          .selectOption("1");
        await t.page
          .getByRole("button", { name: "Confirm position", exact: true })
          .click();
        await expect(t.page.getByLabel("Saved artifact positions")).toHaveText(
          "Far · Entrance · Entrance",
        );
        await t.page.getByRole("button", { name: "Undo", exact: true }).click();
        await expect(t.page.getByLabel("Saved artifact positions")).toHaveText(
          "Entrance · Entrance · Entrance",
        );
        await t.page
          .getByLabel("YOUR CLUE", { exact: true })
          .fill("The first landmark keeps my secret.");
        await t.page
          .getByRole("button", { name: "Validate & seal universe →" })
          .click();
      }
      expect(new Set(travelers.map((t) => t.own)).size).toBe(n);
      for (let round = 1; round < n; round++) {
        for (const t of travelers) {
          await t.page.bringToFront();
          await expect(phase(t.page)).toContainText(`ROUND ${round}/${n - 1}`);
          const name = await t.page.locator("h2").innerText();
          expect(name).not.toBe(t.own);
          expect(t.visited.has(name)).toBe(false);
          t.visited.add(name);
          const u = UNIVERSES.find((u) => u.name === name)!;
          if(n===2 && t===host && round===n-1) {
            missingWorld=u;
            observed.push('deliberately-missing:'+u.id);
            continue;
          }
          await act(t, u.anchors[0]);
          observed.push('key-round:'+round+':'+t.name);
          await expect(t.page.locator(".inventory .found")).toHaveCount(round);
          await t.page.keyboard.press("e");
          await expect(t.page.locator(".inventory .found")).toHaveCount(round);
        }
      }
      await host.page.bringToFront();
      await expect(phase(host.page)).toContainText("FINALE",{timeout:150000});
      if(missingWorld) {
        const entrance=door(missingWorld.id);
        await move(host,{...entrance,y:0},2.5);
        await aim(host,{...entrance,y:0.5});
        await expect(host.page.getByRole('button',{name:new RegExp('E.*'+missingWorld.name)})).toBeVisible();
        await host.page.keyboard.press('e');
        await expect(host.page.locator('h2')).toHaveText(missingWorld.name);
        await act(host,missingWorld.anchors[0]);
        await expect(host.page.locator('.inventory .found')).toHaveCount(n-1);
        await host.page.getByRole('button',{name:'Return to atrium ↩'}).click();
        await expect(host.page.locator('h2')).toHaveText('All keys lead home.');
        observed.push('finale-revisit-and-missing-key');
      }
      await move(host, { x: 0, y: 0, z: 0 }, 2);
      await aim(host, { x: 0, y: 0, z: 0 });
      await expect(
        host.page.getByRole("button", { name: /E.*unlock portal/ }),
      ).toBeVisible();
      await host.page.keyboard.press("e");
      for (const t of travelers) {
        await t.page.bringToFront();
        await expect(t.page.locator(".results h1")).toHaveText(host.name);
        expect(t.visited.size).toBe(n - 1);
      }
      await host.page.screenshot({
        path: `work/browser-artifacts/${n}-player-portal.png`,
      });
      await host.page.bringToFront();
      await host.page
        .getByRole("button", { name: "Open the doors again →" })
        .click();
      await expect(phase(host.page)).toContainText("WAITING");
      expect(runtimeErrors).toEqual([]);
      await info.attach("verified-flow", {
        body: JSON.stringify({
          players: n,
          rounds: n - 1,
          uniqueUniverses: n,
          heldPlacement: true,
          mechanisms: true,
          realKeyboard: true,
          mouseRaycast: true,
          keys: n - 1,
          portalWinner: host.name,
          replay: true,
        }),
        contentType: "application/json",
      });
      observed.push("portal-winner-and-replay");
      completed = true;
    } finally {
      if (profiler) {
        try {
          const data = await Promise.race([profiler.send('Profiler.stop'),new Promise<null>(resolve=>setTimeout(()=>resolve(null),5000))]);
          if(data) await info.attach('admission-cpu-profile',{body:JSON.stringify(data),contentType:'application/json'});
        } catch { /* Capture must not mask the original acceptance failure. */ }
      }
      await info.attach("observed-milestones", {body:JSON.stringify(observed),contentType:"application/json"});
      await info.attach("network-events", { body: JSON.stringify(networkEvents), contentType: "application/json" });
      await info.attach("console-errors", { body: JSON.stringify(runtimeErrors), contentType: "application/json" });
      const evidencePages=contexts.flatMap(c=>c.pages());
      if (!completed)
        for (let i=0; i<evidencePages.length; i++) {
          const page=evidencePages[i];
          if (page && !page.isClosed()) {
            await info.attach("failure-url-"+i, { body: new URL(page.url()).pathname, contentType:"text/plain" });
            try {
              await info.attach("failure-ui-"+i, { body: (await page.locator("body").innerText({timeout:2000})).replace(/[A-Za-z0-9_-]{40,}/g,"[redacted]"), contentType: "text/plain" });
              await info.attach("failure-canvas-"+i,{ body: await page.locator("canvas").first().screenshot({timeout:3000}), contentType:"image/png" });
            } catch { /* Preserve the original failure if the renderer stops responding. */ }
          }
        }
      for (const c of contexts) await c.close();
    }
  });
