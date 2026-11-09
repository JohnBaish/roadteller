const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [vw, touch] of [[1200, false], [390, true]]) for (const place of ['council', 'circle']) {
    const p = await (await b.newContext({ viewport: { width: vw, height: 900 }, hasTouch: touch, isMobile: touch })).newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.argv[2] + '/options.html?place=' + place);
    const hit = p.locator('.hit[data-year="2010"]'); if (touch) await hit.tap(); else await hit.click();
    const t1 = await p.locator('.year-line').innerText();
    await p.locator('.hit[data-year="2016"]').focus(); await p.keyboard.press('Enter');
    console.log(vw, place, '|', t1, '| keyboard:', (await p.locator('.year-line').innerText()).slice(0, 40));
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
