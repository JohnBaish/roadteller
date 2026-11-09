const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [vw, touch] of [[1200, false], [390, true]]) for (const place of ['council', 'circle']) {
    const p = await (await b.newContext({ viewport: { width: vw, height: 900 }, hasTouch: touch, isMobile: touch })).newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + process.argv[2] + '/options.html?place=' + place); await p.waitForTimeout(200);
    const hit = p.locator('.hit[data-year="2010"]'); if (touch) await hit.tap(); else await hit.click();
    const marked = await p.locator('.trend-chart circle.ring').count();
    if (touch) await p.locator('h3').first().tap(); else await p.locator('h3').first().click();
    const after = await p.locator('.trend-chart circle.ring').count(); const txt = (await p.locator('.year-line').innerText()).slice(0, 5);
    const ids = await p.$$eval('[data-share]', bs => bs.map(x => x.dataset.share + ':' + x.innerText.trim()));
    await p.locator('[data-share="who"]').click(); await p.waitForSelector('.pic img'); await p.waitForTimeout(300);
    const img = await p.locator('.pic img').evaluate(i => [i.naturalWidth, i.naturalHeight]);
    if (vw === 1200 && place === 'council') { for (const id of ['who', 'mix', 'trend', 'days']) { await p.keyboard.press('Escape'); await p.locator(`[data-share="${id}"]`).click(); await p.waitForSelector('.pic img'); await p.waitForTimeout(300); const src = await p.locator('.pic img').getAttribute('src'); require('fs').writeFileSync(process.argv[2] + `/shots/picture-${id}.png`, Buffer.from(src.split(',')[1], 'base64')); } }
    await p.keyboard.press('Escape'); const gone = await p.locator('.pic').count();
    console.log(vw, place, 'marker after click', marked, 'after click away', after, 'line shows', txt, '| buttons', ids.join(' '), '| picture', img, 'closed', gone === 0);
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
