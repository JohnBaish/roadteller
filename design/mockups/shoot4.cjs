const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const file = 'file://' + process.argv[2] + '/options.html'; const errs = [];
  for (const [vw, vh, touch, tag] of [[1200, 900, false, 'computer'], [390, 844, true, 'phone'], [844, 390, true, 'sideways']])
    for (const [place, basis] of [['council', 'am'], ['council', 'all'], ['circle', 'am']]) {
      const ctx = await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: touch, isMobile: touch });
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(() => { window.addEventListener('load', () => { const s = document.createElement('style'); s.textContent = '.mock,.c-nav{position:static!important}'; document.head.appendChild(s); }); });
      await p.goto(`${file}?place=${place}&basis=${basis}`); await p.waitForTimeout(250);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      await (await p.$('main')).screenshot({ path: `${process.argv[2]}/shots/r4-${place}-${basis}-${tag}.png` });
      console.log(tag, place, basis, 'scrollWidth', sw, 'of', vw); await ctx.close(); }
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
