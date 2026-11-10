import { useEffect, useRef, useState, type ReactNode } from "react";

// The top of a circle or council view (John, November 10th 2026): the years, the place with Change beside it, and the
// circle's sizes. On a computer the whole block stays at the top while the page scrolls; on a phone held upright a slim
// bar (the place, the circle's size and Change) appears once the block has scrolled away; on a short screen (a phone held
// sideways) nothing stays. Which applies is decided in global.css; this only says whether the block is out of sight.
export function ViewHead({
  kicker,
  sub,
  title,
  note,
  onChange,
  children,
  bar,
  barMore,
}: {
  kicker: string;
  sub?: string;
  title: string;
  note?: string | null;
  onChange: () => void;
  children?: ReactNode;
  bar: string; // the place, short, for the slim bar
  barMore?: { label: string; options: ReactNode }; // the circle's size, which opens its buttons
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) =>
      setGone(!e.isIntersecting && e.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!gone) setOpen(false);
  }, [gone]);
  const change = () => {
    window.scrollTo(0, 0);
    onChange();
  };
  return (
    <>
      <div className="page-head view-head" ref={ref}>
        <p className="card-kicker">{kicker}</p>
        {sub && <p className="view-sub">{sub}</p>}
        <div className="title-row">
          <h2>{title}</h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={change}
            data-noprint
          >
            Change
          </button>
        </div>
        {note && <p className="notes">{note}</p>}
        {children}
      </div>
      {gone && (
        <div className="slim-bar" data-noprint>
          <div className="slim-row">
            <strong className="slim-place">{bar}</strong>
            {barMore && (
              <button
                type="button"
                className="slim-size"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
              >
                {barMore.label}{" "}
                <span aria-hidden="true">{open ? "▴" : "▾"}</span>
              </button>
            )}
            <button type="button" className="slim-change" onClick={change}>
              Change
            </button>
          </div>
          {open && barMore && (
            <div className="slim-options">{barMore.options}</div>
          )}
        </div>
      )}
    </>
  );
}
