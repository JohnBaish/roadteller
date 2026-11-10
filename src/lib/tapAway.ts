import { useEffect, type RefObject } from 'react';

// A chart's date line and label (shown by a tap on a phone) go again when the visitor taps or clicks anywhere outside the chart
// (John, November 9th 2026: there was no way to remove them). Listens only while something is shown. The share button doesn't
// count, so a shared picture keeps the chosen year (John, November 10th 2026: clicks elsewhere in the card didn't clear it,
// as the card, not the chart, was the area that kept it).
export function useTapAway(shown: boolean, ref: RefObject<Element | null>, clear: (none: null) => void) {
  useEffect(() => {
    if (!shown) return;
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.('.share-row')) clear(null);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [shown, ref, clear]);
}
