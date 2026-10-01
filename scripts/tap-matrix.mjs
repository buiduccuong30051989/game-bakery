// Soát độ chính xác chạm kệ: ở mỗi cỡ màn, bấm vào TÂM HÌNH của từng món trên từng đĩa (chuột + chạm cảm ứng),
// so ô game ghi nhận với ô dưới con trỏ. Cần dev server + playwright-core + chromium headless shell.
// Dùng: node scripts/tap-matrix.mjs [http://localhost:5183] [đường-dẫn-playwright-core]
const base = process.argv[2] || 'http://localhost:5183';
const pw = process.argv[3] || '/private/tmp/pw/node_modules/playwright-core/index.mjs';
const { chromium } = await import(pw);
const exe = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const sizes = (process.env.SIZES || "1180x820,1024x768,820x1180,1366x1024").split(",").map((s) => s.split("x").map(Number));
let fails = 0, total = 0;
for (const [w, h] of sizes) {
  for (const touch of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: false });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(`${base}/?mute=1&reset=1&level=1&customer=me_yen&round=add&debug=1`);
    await page.waitForFunction(() => window.__game?.phase === 'order', null, { timeout: 60000 });
    await page.waitForTimeout(800);
    // tâm hình của từng món trên đĩa (trung bình tâm hộp bao các món, chiếu ra màn hình)
    const targets = await page.evaluate(() => {
      const g = window.__game;
      return g.shop.slots.map((s, i) => {
        const pts = [];
        s.root.children.filter((c) => c.type === 'Group').forEach((m) => {
          const p = m.getWorldPosition(m.position.clone());
          p.y += 0.12;
          pts.push(g.toScreen(p));
        });
        return { i, pts };
      });
    });
    for (const t of targets) {
      for (const p of t.pts) {
        // khay trống trước mỗi chạm (không để khay đầy tự chuyển sang bước chọn tổng giữa chừng)
        await page.evaluate(() => { const g = window.__game; g.tray.forEach((t) => t.mesh.removeFromParent()); g.tray.length = 0; g.tapLog.length = 0; g.phase = 'order'; });
        if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
        await page.waitForTimeout(150);
        const got = await page.evaluate(() => window.__game.tapLog.slice());
        total++;
        const ok = got.length === 1 && got[0] === t.i;
        if (!ok) { fails++; console.log(`✗ ${w}x${h} ${touch ? 'touch' : 'mouse'} slot ${t.i} @(${p.x | 0},${p.y | 0}) → ${JSON.stringify(got)}`); }
      }
    }
    if (errs.length) console.log('page errors:', errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
}
console.log(`${total - fails}/${total} chạm đúng ô (${sizes.map((s) => s.join('x')).join(', ')}; chuột + cảm ứng)`);
await browser.close();
process.exit(fails ? 1 : 0);
