# Duevio Universe
Pure HTML, CSS and JavaScript. No Three.js. Static production files live in `dist/`.

Desktop: 450 JPEGs rendered through one full-viewport canvas, selected by lerped scroll progress. Three 150-frame clips. Frame blobs preload with eight concurrent requests; decoded image cache is bounded to 24 frames. Canvas redraws only when frame/state/viewport changes. Lenis is optional and loaded via CDN.

Mobile and reduced-motion: muted looping MP4 on dark blue. Main site copy and all detail-page text are preserved from duevio.com, fetched 6 November 2026. Detail pages use hash routes, including Product, Industries, Pricing, Demo, Custom and legal notices. Original form submission endpoints are retained.

The brief contains opposite lighting directions. Implementation follows its explicit acceptance check: black → #d2f2f7 → white during Clip B as altitude falls from 20,000m to zero. Clip C returns to black. Altitude markers retain the supplied names and values, although their physical ordering is intentionally narrative. Titanium/sapphire/helium are identified as cinematic materials, not product specifications.

Run `python3 -m http.server 8080 --directory dist` to preview.
