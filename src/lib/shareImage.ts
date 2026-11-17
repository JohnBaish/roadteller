// "Copy chart" / "Share chart" (as in Refueller and Riverwatcher): a picture of a chart, always in the light colours, with a
// heading, the place and years, and the credit line, made on the visitor's device. On a touch screen it goes to the phone's
// own share sheet; on a computer it's copied (or saved, where the browser won't copy). Nothing is sent anywhere until the
// visitor chooses where it goes. The chart is the page's own SVG, drawn with the brand fonts embedded.
import fig400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff2?url';
import fig600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff2?url';
import fig700 from '@fontsource/figtree/files/figtree-latin-700-normal.woff2?url';

export const CREDIT = 'roadteller.baish.net · Police injury collision records (STATS19) and traffic estimates, Department for Transport. Contains public sector information licensed under the Open Government Licence v3.0.';

// The chart styles (global.css, .chart) in the light colours, for the picture.
const LIGHT_CSS = `
svg{--color-text:#201e1d;--color-neutral-700:#645c50;--color-neutral-400:#c0b6a5;--color-neutral-500:#8d8476;--color-divider:rgba(32,30,29,.16);
--color-accent:#c67139;--color-accent-2:#6c7a50;--color-accent-700:#8c491a;--color-surface:#ebddc5}
text{font-family:Figtree,system-ui,sans-serif;font-size:11px;fill:#645c50}
.lbl{fill:#201e1d;font-weight:600;font-size:12px}.txt{fill:#201e1d;font-size:13px}.key{font-size:12px}
.grid{stroke:rgba(32,30,29,.16);stroke-width:1}.me{stroke:#c67139;fill:#c67139}.gb{stroke:#8d8476;fill:#8d8476}.reg{stroke:#6c7a50;fill:#6c7a50}
.line{fill:none;stroke-width:2.25;stroke-linejoin:round;stroke-linecap:round}.dash{stroke-dasharray:5 4}.bar{stroke:none}.bar.soft{opacity:.45}
.ring{fill:#ebddc5;stroke-width:2}
svg.map{--sq0:#d18b61;--sq1:#bb6c40;--sq2:#a0532a;--sq3:#7c3c1b;--sq4:#552610}
.map .road{fill:none;stroke-linecap:round;stroke-linejoin:round}.map .r-minor{stroke:#8d8476;stroke-width:.6;opacity:.8}
.map .r-b{stroke:#645c50;stroke-width:1}.map .r-over{stroke:#201e1d;stroke-width:1.4;opacity:.75}
.map .w-case{stroke:rgba(32,30,29,.55);stroke-width:4.6}.map .w-a{stroke:#fff;stroke-width:2.6}.map .w-m{stroke:#fff;stroke-width:3.4}
.map .edge{fill:none;stroke:#201e1d;stroke-width:1.6;stroke-dasharray:6 4}.map .grid0{fill:none;stroke:rgba(32,30,29,.09);stroke-width:.6}
.map .cell,.map .cell.on{stroke:#f5ead8;stroke-width:1}.map .mid{fill:#201e1d}
.map .num{font-weight:600;font-size:11px;fill:#fff;text-anchor:middle}.map .num.s0,.map .num.s1{fill:#201e1d}
.map .place{font-weight:600;font-size:12px;fill:#201e1d;paint-order:stroke;stroke:#f5ead8;stroke-width:3px;stroke-linejoin:round}
.map .place.t{font-size:13.5px;font-weight:700}.map .rno{font-weight:700;font-size:10px;fill:#201e1d;paint-order:stroke;stroke:#f5ead8;stroke-width:3px}`;

/** The map's key, drawn under the map in the picture (the key on the page isn't part of the map's drawing). */
export type MapKey = { label: string; items: { n: number; text: string }[] };
const LIGHT_SQ = ['#d18b61', '#bb6c40', '#a0532a', '#7c3c1b', '#552610'];

let fontCss: Promise<string> | null = null;
const dataUrl = (url: string) =>
  fetch(url)
    .then((r) => r.blob())
    .then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }));
function fonts(): Promise<string> {
  fontCss ??= Promise.all([dataUrl(fig400), dataUrl(fig600), dataUrl(fig700)])
    .then(([a, b, c]) => `@font-face{font-family:Figtree;font-weight:400;src:url(${a})}@font-face{font-family:Figtree;font-weight:600;src:url(${b})}@font-face{font-family:Figtree;font-weight:700;src:url(${c})}`)
    .catch(() => '');
  return fontCss;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > width && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** The picture: heading, place and years, the chart, the credit. */
// One chart, or several one under another with a small heading each (the "When" charts, John, November 10th 2026).
export type Part = { svg: SVGSVGElement; caption?: string };
async function chartImage(svg: SVGSVGElement, full: number) {
  const vb = svg.viewBox.baseVal;
  // never taller than it is wide, so a tall map stays a sensible shape (narrower, centred)
  const cw = Math.min(full, (full * vb.width) / vb.height);
  const ch = (vb.height * cw) / vb.width;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-noshare]').forEach((n) => n.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(cw));
  clone.setAttribute('height', String(ch));
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = (await fonts()) + LIGHT_CSS;
  clone.insertBefore(style, clone.firstChild);
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('picture'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  });
  return { img, cw, ch };
}

export async function makePicture(svg: SVGSVGElement | Part[], title: string, sub: string, key?: MapKey): Promise<HTMLCanvasElement> {
  const cw = 904;
  const parts: Part[] = Array.isArray(svg) ? svg : [{ svg }];
  const imgs = await Promise.all(parts.map((p) => chartImage(p.svg, cw)));
  await document.fonts.ready;
  const W = 1000, pad = 48, sc = 2;
  const cv = document.createElement('canvas');
  const x = cv.getContext('2d')!;
  x.font = '400 14px Figtree';
  const credit = wrap(x, CREDIT, W - 2 * pad);
  x.font = '400 17px Figtree';
  const subLines = wrap(x, sub, W - 2 * pad);
  const charts = imgs.reduce((t, im, i) => t + im.ch + (parts[i].caption ? 30 : 0) + (i ? 28 : 0), 0);
  // the map's key: its label, then each shade and its counts, wrapped to the width
  x.font = '400 16px Figtree';
  const keyRows: { sq: number; text: string; x: number }[][] = [];
  if (key) {
    let row: { sq: number; text: string; x: number }[] = [], at = pad + x.measureText(key.label).width + 16;
    for (const it of key.items) {
      const w = 26 + x.measureText(it.text).width + 20;
      if (at + w > W - pad && row.length) {
        keyRows.push(row);
        row = [];
        at = pad;
      }
      row.push({ sq: it.n, text: it.text, x: at });
      at += w;
    }
    keyRows.push(row);
  }
  const keyH = key ? 16 + keyRows.length * 28 : 0;
  const H = pad + 22 + 44 + subLines.length * 24 + 20 + charts + keyH + 24 + credit.length * 20 + pad;
  cv.width = W * sc;
  cv.height = H * sc;
  x.scale(sc, sc);
  x.fillStyle = '#f5ead8';
  x.fillRect(0, 0, W, H);
  let y = pad + 14;
  x.fillStyle = '#8c491a';
  x.font = '700 14px Figtree';
  x.fillText('ROADTELLER', pad, y);
  y += 40;
  x.fillStyle = '#201e1d';
  x.font = '400 32px Caprasimo';
  x.fillText(title, pad, y);
  x.fillStyle = '#645c50';
  x.font = '400 17px Figtree';
  for (const l of subLines) {
    y += 24;
    x.fillText(l, pad, y);
  }
  y += 20;
  imgs.forEach((im, i) => {
    if (i) y += 28;
    const cap = parts[i].caption;
    if (cap) {
      x.fillStyle = '#201e1d';
      x.font = '600 18px Figtree';
      x.fillText(cap, pad, y + 18);
      y += 30;
    }
    x.drawImage(im.img, pad + (cw - im.cw) / 2, y, im.cw, im.ch);
    y += im.ch;
  });
  if (key) {
    y += 16;
    x.font = '400 16px Figtree';
    keyRows.forEach((row, i) => {
      const base = y + 20;
      if (!i) {
        x.fillStyle = '#645c50';
        x.fillText(key.label, pad, base);
      }
      for (const it of row) {
        x.fillStyle = LIGHT_SQ[it.sq];
        x.beginPath();
        x.roundRect(it.x, base - 13, 18, 14, 3);
        x.fill();
        x.fillStyle = '#645c50';
        x.fillText(it.text, it.x + 26, base);
      }
      y += 28;
    });
  }
  y += 30;
  x.fillStyle = '#645c50';
  x.font = '400 14px Figtree';
  for (const l of credit) {
    x.fillText(l, pad, y);
    y += 20;
  }
  return cv;
}

export type Delivered = 'shared' | 'copied' | 'saved' | 'cancelled';
const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/** "Share" on a touch screen (the phone's share sheet), "Copy" on a computer */
export const shareVerb = () => (touch() ? 'Share' : 'Copy');

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Hands the picture over: the share sheet on a touch screen, else the clipboard, else a saved file. */
/** What goes with a shared picture (John, November 17th 2026, after testing on iPhone and Android): a sentence (the caption
 *  in WhatsApp and Messages, the body of an email), the link to the same view sent separately (it follows the sentence, and
 *  gives Gmail its subject), and a title, which hardly any app uses. */
export type ShareWords = { title: string; text: string; url: string };

/** "Roadteller: Who was hurt", the sentence, and a link opening on the view shown. A full postcode is cut to its first half
 *  (`RG14-5AA/two` → `RG14/two`), so nobody's street is passed round (John, November 17th 2026). */
export const shareWords = (heading: string, text: string): ShareWords => ({
  title: `Roadteller: ${heading}`,
  text,
  url: `${location.origin}/${location.hash.replace(/^#([A-Z]{1,2}\d[A-Z\d]?)-\w+/i, '#$1')}`,
});

export async function deliver(canvasP: Promise<HTMLCanvasElement>, filename: string, words: ShareWords): Promise<Delivered> {
  const blob = canvasP.then((cv) => new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('No picture'))), 'image/png')));
  if (touch()) {
    const b = await blob;
    const file = new File([b], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], ...words });
        return 'shared';
      } catch (e) {
        if ((e as Error).name === 'AbortError') return 'cancelled';
      }
    }
    save(b, filename);
    return 'saved';
  }
  try {
    // The picture goes over as a promise made inside the click, which Safari needs.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return 'copied';
  } catch {
    save(await blob, filename);
    return 'saved';
  }
}
