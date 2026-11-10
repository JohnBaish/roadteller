// The page: choosing a place (stage 2), then a council area (SPEC §6) or a circle (SPEC §7) in the agreed design, option B.
import { Component, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { getPlaces, PlaceBox } from './components/PlaceBox.tsx';
import { ThemeSwitch } from './components/ThemeSwitch.tsx';
import { CircleView } from './components/CircleView.tsx';
import { About } from './components/About';
import { CouncilView } from './components/CouncilView.tsx';
import { loadIndex, type PageIndex } from './lib/data.ts';
import { findPlace, looksLikePostcode, namesakes, placeAt, placeLabel, type NamedPlace } from './lib/places.ts';
import { hashOf, placeHash, placeOf, POSTCODE_PROBLEMS, readHash, readPostcode, type Target } from './lib/where.ts';

const CHOICE = 'roadteller.choice';
function remembered(): Target | null {
  try {
    const h = localStorage.getItem(CHOICE);
    return h ? readHash(h) : null;
  } catch {
    return null;
  }
}
function remember(t: Target | null) {
  try {
    if (t) localStorage.setItem(CHOICE, hashOf(t));
    else localStorage.removeItem(CHOICE);
  } catch {
    // Not kept; the page still works.
  }
}

function Chooser({ start, index }: { start: boolean; index: PageIndex | null }) {
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<NamedPlace | null>(null);
  const [problem, setProblem] = useState('');

  async function go(e: FormEvent) {
    e.preventDefault();
    setProblem('');
    const t = typed.trim();
    if (t && !looksLikePostcode(t)) {
      let ix;
      try {
        ix = await getPlaces();
      } catch {
        setProblem('Sorry, the places couldn’t be loaded. Check your connection and try again.');
        return;
      }
      const at = picked && placeLabel(picked) === t ? placeAt(picked) : undefined;
      const f = ix ? findPlace(ix, t, at) : null;
      const chosen = f?.ok ? f.place : null;
      if (!chosen) {
        setProblem(
          f && !f.ok && f.problem === 'several'
            ? `There’s more than one ${f.places[0].name}. Choose one from the list as you type, such as ${namesakes(f.places)}.`
            : `We can’t find “${t}” among Great Britain’s postcodes, towns, villages and suburbs. Check the spelling, or try a postcode.`,
        );
        return;
      }
      location.hash = placeHash(placeOf(chosen));
      return;
    }
    if (!index) return;
    const r = readPostcode(t, index.outcodes);
    if (!r.ok) {
      setProblem(POSTCODE_PROBLEMS[r.problem](t));
      return;
    }
    location.hash = r.inward ? `${r.outcode}-${r.inward}` : r.outcode;
  }

  return (
    <div className="chooser">
      <form className="search-form" onSubmit={go} noValidate>
        <div className="search">
          <PlaceBox id="where" ariaLabel="Postcode or place" placeholder="Newbury, RG14 or RG14 5AA" postcodes enterKeyHint="go" value={typed} onChange={setTyped} onPick={setPicked} />
          <button type="submit" className="btn btn-primary">
            Go
          </button>
        </div>
        {problem && (
          <p className="problem" role="alert">
            {problem}
          </p>
        )}
        {start && !problem && <p className="hint">A full postcode, the first half (RG14), or a town, village or suburb. Nothing you type leaves this page.</p>}
      </form>
      {index && (
        <div className="search">
          <label className="hint" htmlFor="council">
            Or a whole council area:
          </label>
          <select
            id="council"
            className="input"
            value=""
            onChange={(e) => {
              if (e.target.value) location.hash = `council/${e.target.value}`;
            }}
          >
            <option value="">Choose a council area</option>
            {index.councils.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

class SafetyNet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="message" role="alert">
        <p>Sorry, this page couldn’t be shown. Try another postcode or place, or try again later.</p>
        <a className="btn btn-secondary" href="#">
          Start again
        </a>
      </div>
    );
  }
}

export default function App() {
  const [target, setTarget] = useState<Target | null>(() => readHash(location.hash) ?? remembered());
  const [index, setIndex] = useState<PageIndex | null>(null);
  const [loadProblem, setLoadProblem] = useState(false);
  const [changing, setChanging] = useState(false);
  useEffect(() => {
    loadIndex().then(setIndex, () => setLoadProblem(true));
    const onHash = () => {
      const t = readHash(location.hash);
      setTarget(t);
      remember(t);
      setChanging(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // A remembered choice opens with its address, so Back and sharing behave as if it had been chosen.
  useEffect(() => {
    if (target && !readHash(location.hash)) history.replaceState(null, '', `#${hashOf(target)}`);
  }, [target]);

  const start = target === null;
  return (
    <>
      <nav className="nav" data-noprint>
        <a className="nav-brand" href="#" onClick={() => remember(null)}>
          Roadteller
        </a>
        <div className="nav-right">
          <ThemeSwitch />
        </div>
      </nav>
      <main className="col">
        {(start || changing) && (
          <div className="page-head">
            {/* The tagline only on the opening screen; a view's own top says what it shows (John, November 10th 2026). */}
            {start && <div className="card-kicker">Roads in Great Britain</div>}
            {start && <h2>Collisions on the roads near you</h2>}
            {start && <p className="lead">Enter a postcode or a place to see how many people were hurt on the roads nearby, and how that compares with the traffic.</p>}
            {(start || changing) && <Chooser start={start} index={index} />}
            {/* For first-time visitors and for search, which only ever sees the opening screen (SEO-HANDOVER item 9;
                John's wording, November 10th 2026). */}
            {start && (
              <p className="lead chooser-about">
                Roadteller counts the injury collisions reported to the police on the roads within half a mile, a mile or
                two miles of any postcode or place in Great Britain, or across a whole council area, going back to 1989. It
                shows how the people hurt were travelling, at what times and on which roads, and compares the main roads with
                the traffic they carry, using the Department for Transport’s official figures. Many people call them road
                accidents or crashes; the police and the Department for Transport call them collisions. Free to use.
              </p>
            )}
          </div>
        )}
        {loadProblem && (
          <p className="problem" role="alert">
            Sorry, the figures couldn’t be loaded. Check your connection and try again.
          </p>
        )}
        <SafetyNet key={target ? hashOf(target) : ''}>
          {index && target?.kind === 'circle' && (
            <div className="view">
              <CircleView index={index} target={target} onChange={() => setChanging(true)} />
            </div>
          )}
          {target?.kind === 'council' && (
            <div className="view">
              <CouncilView code={target.code} onChange={() => setChanging(true)} />
            </div>
          )}
        </SafetyNet>
        {target && <About />}
        <footer className="footer-notice">
          {/* The credits in italic, with a line below them before the project lines (John, November 10th 2026). */}
          {!start && (
            <div className="credits">
              <p>
                Collisions and traffic: Department for Transport. Contains public sector information licensed under the Open Government Licence v3.0.
              </p>
              <p>
                Roads, boundaries, postcodes and places: Contains OS data © Crown copyright and database right 2026. Contains Royal Mail data © Royal Mail copyright and database right 2026.
                Contains National Statistics data © Crown copyright and database right 2026.
              </p>
            </div>
          )}
          <p data-noprint>
            Roadteller is a free-to-use personal project by John Baish. We don’t record anything you do here, apart from anonymous visit statistics (no cookies, no personal data), showing us how
            the site is used. Your device, rather than the website, stores your last choices (postcode, place or council area, and light or dark mode), so the page opens the same way next time.
          </p>
          <p data-noprint>
            More free tools at{' '}
            <a href="https://www.baish.net/" target="_blank" rel="noopener noreferrer">
              www.baish.net
            </a>
            . Contact: workshop@baish.net.
          </p>
          <p data-noprint>Roadteller is an independent project, not connected with or endorsed by the Department for Transport, the police or Ordnance Survey.</p>
        </footer>
      </main>
    </>
  );
}
