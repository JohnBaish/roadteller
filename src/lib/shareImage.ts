// "Copy chart" / "Share chart" (as in Refueller and Riverwatcher): a picture of a chart, always in the light colours, with a
// heading, the place and years, and the credit line, made on the visitor's device. On a touch screen it goes to the phone's
// own share sheet; on a computer it's copied (or saved, where the browser won't copy). Nothing is sent anywhere until the
// visitor chooses where it goes. The chart is the page's own SVG, drawn with the brand fonts embedded.
import fig400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff2?url';
import fig600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff2?url';

export const CREDIT = 'roadteller.baish.net · Police injury collision records (STATS19) and traffic estimates, Department for Transport. Contains public sector information licensed under the Open Government Licence v3.0.';

// The chart styles (global.css, .chart) in the light colours, for the picture.
const LIGHT_CSS = `
svg{--color-text:#201e1d;--color-neutral-700:#645c50;--color-neutral-400:#c0b6a5;--color-neutral-500:#8d8476;--color-divider:rgba(32,30,29,.16);
--color-accent:#c67139;--color-accent-2:#6c7a50;--color-accent-700:#8c491a;--color-surface:#ebddc5}
text{font-family:Figtree,system-ui,sans-serif;font-size:11px;fill:#645c50}
.lbl{fill:#201e1d;font-weight:600;font-size:12px}.txt{fill:#201e1d;font-size:13px}.key{font-size:12px}
.grid{stroke:rgba(32,30,29,.16);stroke-width:1}.me{stroke:#c67139;fill:#c67139}.gb{stroke:#8d8476;fill:#8d8476}.reg{stroke:#6c7a50;fill:#6c7a50}
.line{fill:none;stroke-width:2.25;stroke-linejoin:round;stroke-linecap:round}.dash{stroke-dasharray:5 4}.bar{stroke:none}.bar.soft{opacity:.45}
.ring{fill:#ebddc5;stroke-width:2}`;

let fontCss: Promise<string> | null = null;
const dataUrl = (url: string) =>
  fetch(url)
    .then((r) => r.blob())
    .then((b) => new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b); }));
function fonts(): Promise<string> {
  fontCss ??= Promise.all([dataUrl(fig400), dataUrl(fig600)])
    .then(([a, b]) => `@font-face{font-family:Figtree;font-weight:400;src:url(${a})}@font-face{font-family:Figtree;font-weight:600;src:url(${b})}`)
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
export async function makePicture(svg: SVGSVGElement, title: string, sub: string): Promise<HTMLCanvasElement> {
  const cw = 904;
  const vb = svg.viewBox.baseVal;
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
  await document.fonts.ready;
  const W = 1000, pad = 48, sc = 2;
  const cv = document.createElement('canvas');
  const x = cv.getContext('2d')!;
  x.font = '400 14px Figtree';
  const credit = wrap(x, CREDIT, W - 2 * pad);
  x.font = '400 17px Figtree';
  const subLines = wrap(x, sub, W - 2 * pad);
  const H = pad + 22 + 44 + subLines.length * 24 + 20 + ch + 24 + credit.length * 20 + pad;
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
  x.drawImage(img, pad, y, cw, ch);
  y += ch + 30;
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
export async function deliver(canvasP: Promise<HTMLCanvasElement>, filename: string, title: string): Promise<Delivered> {
  const blob = canvasP.then((cv) => new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('No picture'))), 'image/png')));
  if (touch()) {
    const b = await blob;
    const file = new File([b], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title });
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
