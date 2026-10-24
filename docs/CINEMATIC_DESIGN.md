# Cinematic journey design notes

## Art direction

An original palace between universes: midnight blue, weathered stone, pale brass and six restrained energy colors. Large editorial serif type sits against architectural negative space. The functional private-room game sits behind a clear Enter the Atrium action. This is a procedural cinematic alpha, not photoreal AAA production art.

## Chapters and motion

- Arrival: a colonnade, original portal/tower silhouette, distant peaks, mist wash, bounded dust and slow camera drift; restrained title reveal.
- Descent: continuous shared camera push, a rotating threshold mark and progressively revealed copy.
- Six doors: six arched apertures, distinct auras, selected-world description and scene light response. Click, touch, focus and pointer entry select worlds.
- World showcases: original SVG scenery supplements the same persistent WebGL environment. Library shelves move on a timed cadence; Observatory bodies drift around orbital instruments; Sanctuary rays and bubbles travel through arches; Forge carriage travels under magnetic arcs; Manor wall groups slide around a candle; Garden fragments and leaves move with wind.
- Key: a procedural 3D artifact and an accessible decorative SVG close-up, accompanied by four clear hiding/search steps.
- Ritual: a radial Atrium diagram lights six paths beside the actual multiplayer rules.
- Finale: six sigils converge around the return CTA, which opens the working lobby.

## Architecture and budgets

One Canvas for the journey, unmounted before the existing game Canvas mounts. Lenis and chapter normalization share one RAF controller; scene animation reads refs. No shadows, postprocessing or new GLB assets. One compressed generated hero backdrop supplements the procedural geometry. 120 dust points. DPR capped at 1.25; reduced motion renders on demand and disables CSS animation, camera motion and Lenis smoothing. Hidden tabs stop rendering. Offscreen world artwork pauses.

Mobile uses native touch scrolling, three-column doors, stacked world sections and a collapsible navigation menu. CSS motion is removed for reduced-motion preferences. WebGL initialization failures are contained by a boundary and a CSS portal fallback; the content and play controls remain available. Hardware performance and mobile-device GPU behavior still require measurement; no 60fps claim is made.

## Real polish cycle

The first in-app browser screenshot showed overly repetitive ring compositions and a weak palace silhouette. The second pass added an original arch and towers with distant peaks, moved the portal focal point, replaced repeated rings with six different illustrated compositions, and replaced a font-dependent key glyph with SVG. Recheck screenshots and selector interactions are recorded in the validation report. No screenshot has been used as the page implementation.

## Limits

No new sound plays automatically. Existing game audio unlocks only through normal game interaction. No poster was attached, and no branded assets or third-party fantasy art were used. The installed skill catalog contains no Taste skill. General rigid-body simulation and previous six-player end-to-end acceptance gaps remain outside this visual overhaul.

The final hero polish adds an original generated palace environment behind live HTML typography, with slow depth drift and a gradient into the procedural scene. The desktop WebP is 220,020 bytes; mobile is 75,260 bytes. They are CSS-selected by viewport, and their provenance and exact generation brief are in `apps/client/public/assets/journey/PROVENANCE.md`. The backdrop is generated concept art, not game footage. All interactive doors, key, world vignettes and play controls remain actual code.
