// "About these figures" (John's wording, November 10th 2026).
// The years come from the data, so they move on when it's rebuilt (fresh look 6.4).
export function About({ five = [2021, 2022, 2023, 2024, 2025] }: { five?: number[] }) {
  const a = five[0], b = five[five.length - 1];
  return (
    <section className="about">
      <h3>About these figures</h3>
      <p>
        Roadteller counts collisions on public roads which were reported to the police in which someone was injured, from the police records published by the Department for Transport.
        Collisions in which nobody was hurt aren’t included, and some injuries are never reported to the police, so the true numbers are higher.
      </p>
      <p>
        The main figures cover the last five complete years, {a} to {b}, compared with the five years before, {a - 5} to {b - 5}.
        {a - 5 <= 2020 && b - 5 >= 2020 ? ' The earlier period includes the pandemic year of 2020 when there was much less traffic.' : ''}
        {a <= 2020 && b >= 2020 ? ' This period includes the pandemic year of 2020 when there was much less traffic.' : ''}
      </p>
      <p>
        A circle counts every collision the police recorded within half a mile, a mile or two miles of the middle of the postcode or place. A council area counts every collision within its
        present boundaries, whichever council it was recorded under at the time.
      </p>
      <p>
        “One injury collision for every 14.0 million miles” compares collisions on a council area’s A-roads and motorways with the miles driven on them, from the Department for Transport’s
        traffic figures. Minor roads aren’t included, because data about traffic levels isn’t available in the same way.
      </p>
      <p>
        Traffic is measured stretch by stretch, between junctions. Only about a quarter of the yearly figures for A-roads and motorways come from a count on that road in that year; the rest are
        the Department for Transport’s estimates, and about a third of stretches weren’t counted at all from {a} to {b}. The Department says figures for a single road or a small area are less
        reliable than those for a region or the whole country, so a road’s figure is a guide rather than an exact measure.
      </p>
      <p>
        Each collision on an A-road or motorway is matched to the nearest stretch of the same road, drawn along the real road from Ordnance Survey’s map. A collision which happened within 60
        metres of a junction counts half to each of the stretches either side, which affects about one in seven collisions on these roads across Great Britain.
      </p>
      <p>At least 10 collisions are required to create a fair rate, otherwise none is shown.</p>
      <p>
        “Allowing for the mix of roads” takes the Great Britain rates for motorways and A-roads and applies these to the proportion of these types of roads in the area, comparing the result with
        collisions. Motorways have far fewer collisions for their traffic than other roads, so an area with a lot of motorway looks better than it otherwise would do.
      </p>
      <p>
        “Better or worse than before?” goes back to 2000 for rates. For a circle, counts go back to 1989. Before then, the locations of too many collisions can’t be placed on a map. Older
        locations are also rougher, often to the nearest 100 metres, so a collision near the edge of a circle may fall just inside or just outside it.
      </p>
      <p>
        “Serious or fatal” is as the police recorded it. Some police forces have changed the way they record injuries over time, with a lower threshold for “serious”, so changes over time or
        differences between areas can partly reflect the way they were recorded.
      </p>
      <p>
        The map’s squares count collisions, they don’t allow for traffic. Busy roads have more collisions because more people use them, so a busy junction shows darker even where it is no more
        dangerous than a quiet lane.
      </p>
      <p>
        Roadteller shows totals only, without details about individual collisions. It counts what was reported and, where traffic figures allow, makes fair
        comparisons with other areas. It deliberately does not attempt to label any road or place as “dangerous” or “safe”. A higher figure can have many causes.
      </p>
    </section>
  );
}
