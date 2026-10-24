# Universe registry and implementation matrix

All six have original procedural scene architecture, five registered approved anchors, one configurable main mechanism, secondary controls, safe spawn/bounds, decoys/props, hints and independent visitor puzzle state. All 30 anchors pass registry validation and actual authoritative solver traversal tests. New scenes remain alpha art; Library preserves the richer licensed asset set.

| Universe | Physical mechanic and puzzle | Five anchors | Evidence and limits |
|---|---|---|---|
| Clockwork Library | Rotating gears, timed sliding shelf, clock switch and brake; stop/open mechanism for compartment | clock, desk, book, statue, compartment | configuration + input traversal + gate occupancy/LOS tests; AABB machinery, no gear rigid bodies |
| Astral Observatory | Reduced gravity and real vertical jump route; align orrery for zenith cache | astrolabe, chart, moon, telescope, zenith | configuration + input traversal + low-gravity comparison; suspended platforms, no free flight |
| Sunken Sanctuary | Buoyancy/drag/ascent/descent; valve redirects current to move floating seal | shell, amphora, coral, obelisk, relic | configuration + input traversal + buoyancy/current tests; bounded water volume, no fluid simulation |
| Polarity Forge | Attraction/repulsion moves colliding metal carriage to expose vault | anvil, bellows, coil, conductor, vault | configuration + input traversal + force/collision tests; constrained carriage, no arbitrary metal bodies |
| Shifting Manor | Portrait and candelabra align a sliding wall/corridor | portrait cache, music, hearth, mirror, chamber | configuration + input traversal + anti-overlap tests; sliding sections only, no rotating room solver |
| Tempest Garden | Periodic wind affects momentum; vane drives turbine/platform to reveal aerie | root, fountain, windchime, seed, aerie | configuration + input traversal + gust/turbine tests; bounded arena, passenger carry incomplete |

IDs are library, observatory, sanctuary, forge, manor and garden. Six doors use world IDs, not participant array indices. Unassigned doors remain visibly sealed. Shared contract lives in packages/shared/src/universes.ts; render modules consume it. Variant and prop limits are finite and configurable via CUSTOMIZATION, not user scripts/models.
