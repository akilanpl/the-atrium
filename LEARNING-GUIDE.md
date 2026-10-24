# Learning the Atrium cinematic journey

Start with `apps/client/src/Journey.tsx`. `Journey` owns the page and a mutable timeline containing normalized scroll progress, active chapter, world, reduced-motion preference and tab visibility. Lenis is advanced by one requestAnimationFrame loop; the same loop derives scene state from semantic chapter positions. React state is reserved for deliberate selections and controls, rather than every scroll pixel.

`Palace` reads that timeline in the persistent React Three Fiber scene. Camera position uses frame-rate-independent exponential interpolation. The geometry is original and procedural: colonnades, a portal, towers, distant silhouettes, orbital instruments and a key. Vector/color temporaries are allocated once. Follow the cleanup effect: RAF, Lenis, media-query listeners, visibility listener and IntersectionObserver all stop on unmount.

The hero also uses a compressed original generated backdrop; see its asset provenance in `apps/client/public/assets/journey/PROVENANCE.md`. It is atmospheric concept art, separate from the live game.

Next read `WorldVignette.tsx` and `journey.css` together. SVG paths tell each world's story, while CSS transform groups animate moving shelves, celestial bodies, currents, a magnetic carriage, sliding walls and wind. IntersectionObserver pauses offscreen world animations. Buttons expose pressed state, keyboard focus uses the same selection behavior as pointer interaction, and mobile selection works by tap.

Finally read the short integration in `main.tsx`. Entering the game unmounts the journey and its renderer. Invite links and recoverable sessions bypass the introduction. Existing private-room admission remains the only way to join a game. The journey does not create a room, award a key or change server rules.

## Run and verify

Use Node 22.12+ (CI uses Node 24):

```sh
npm ci
npm run dev
# Open http://localhost:5173
npm run release:check
npm run typecheck:browser
npm run browser:install
npm run test:browser -- tests/browser/journey.spec.ts
```

Browser tests start their own frontend on 5174 and backend on 2572. On Linux with Mesa/Xvfb available, use `ATRIUM_BROWSER_BACKEND=mesa LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a npm run test:browser -- tests/browser/journey.spec.ts`. macOS sandbox restrictions may prevent standalone Chromium from launching; the in-app preview is a separate browser environment.

## Suggested exercises

1. Change camera travel amplitude and observe how interpolation avoids jumps.
2. Add one SVG environmental detail without adding a renderer or an asset download.
3. Test keyboard-only selection, reduced motion and a 390px viewport before adding motion.
4. Compare actual hardware performance before increasing DPR, transparency or geometry.

There is no dependency on a missing Taste skill. Design discipline is expressed in the restrained palette, typographic hierarchy, negative space, differentiated compositions and a real inspect/improve/recheck pass. No reference poster was available in this request, and no franchise imagery was imported.
