const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const file = 'file://' + process.argv[2] + '/options.html'; const out = process.argv[2] + '/shots';
  const errs = []; const report = [];
  for (const [vw, vh, touch, tag] of [[1200, 900, false, 'computer'], [390, 844, true, 'phone']]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: vw, height: vh }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, colorScheme: theme });
      const p = await ctx.newPage(); p.on('load', () => p.addStyleTag({ content: '.mock,.c-nav{position:static!important}' }).catch(()=>{})); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
      for (const opt of ['A', 'B', 'C']) for (const place of ['council', 'circle']) {
        if (theme === 'dark' && !(opt === 'A' && place === 'council')) continue;
        await p.goto(`${file}?opt=${opt}&place=${place}&trend=since2000&mix=0`); await p.waitForTimeout(250);
        const sw = await p.evaluate(() => document.documentElement.scrollWidth); report.push(`${tag} ${theme} ${opt} ${place} scrollWidth=${sw}`);
        const el = await p.$('main'); await el.screenshot({ path: `${out}/${opt}-${place}-${tag}-${theme}.png` });
      }
      if (theme === 'light') { const d = await p.$('#similar'); await d.screenshot({ path: `${out}/similar-${tag}.png` }); }
      await ctx.close();
    }
  }
  console.log(report.join('\n')); console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();
