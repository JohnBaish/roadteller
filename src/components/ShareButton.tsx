// Copied from Refueller (src/components/ShareButton.tsx): "Share chart" on a touch screen, "Copy chart" on a computer, with
// "Copied" just under it once done. If neither works the picture is saved.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { deliver, makePicture, shareVerb, type Part } from '../lib/shareImage.ts';

// One chart, or several in one picture ({ svg, caption } each): "Copy charts" / "Share charts", as Refueller's.
type Many = { svg: RefObject<SVGSVGElement | null>; caption: string }[];
export function ShareButton({ svg, title, sub, file }: { svg: RefObject<SVGSVGElement | null> | Many; title: string; sub: string; file: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const verb = shareVerb();
  const go = async () => {
    let what: SVGSVGElement | Part[];
    if (Array.isArray(svg)) {
      if (svg.some((p) => !p.svg.current)) return;
      what = svg.map((p) => ({ svg: p.svg.current!, caption: p.caption }));
    } else {
      if (!svg.current) return;
      what = svg.current;
    }
    window.clearTimeout(timer.current);
    setStatus('');
    const r = await deliver(makePicture(what, title, sub), file, title);
    const words = r === 'copied' ? 'Copied' : r === 'saved' ? 'Saved as a picture' : '';
    setStatus(words);
    if (words) timer.current = window.setTimeout(() => setStatus(''), 4000);
  };
  return (
    <div className="share-row" data-noprint>
      <span className="share-wrap">
        <button type="button" className="share-btn" onClick={go}>
          {verb === 'Copy' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 15V3" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          )}
          {verb} {Array.isArray(svg) ? 'charts' : 'chart'}
        </button>
        <span className="share-status" role="status">
          {status}
        </span>
      </span>
    </div>
  );
}
