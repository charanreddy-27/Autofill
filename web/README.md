# web/ — Autofill Vault showcase site

The public landing/showcase site for the [Autofill Vault](../README.md) browser extension. Static HTML/CSS/JS, **no build step**, deploys to Vercel as-is.

## Run it locally

It's plain files — open `index.html` in a browser, or serve the folder:

```bash
# from web/
python -m http.server 5173      # → http://localhost:5173
# or
npx serve .
```

> Clean URLs (`/about`, `/about-project`) are handled by Vercel's `cleanUrls`. Locally, use `about.html` / `about-project.html`, or a static server that resolves extensionless paths.

## Structure

```
index.html          Landing page — hero, features, the engine explainer, contact
about.html          /about — about me + "what I learned" + contact card
about-project.html  /about-project — the why, build timeline, tech decisions
styles.css          Design system (same DNA as the extension: aurora, glass, Inter)
main.js             Theme toggle, mobile nav, scroll reveal, contact form, demo
vercel.json         Clean URLs + caching/security headers
robots.txt          sitemap.xml
assets/             favicon source, og.png (social card), extension icons
```

## Deploy

See **[../DEPLOYMENT.md](../DEPLOYMENT.md)**. Short version: import the repo on Vercel with **Root Directory = `web`**, or run `cd web && vercel --prod`.

## Editing notes

- Personal links/details are inline in the HTML — search for `charanreddychanda` or `charanreddy.dev` to update.
- The OG card is `assets/og.png`, generated from `assets/og.svg`. To regenerate after editing the SVG:
  ```bash
  # any headless Chromium works
  chrome --headless --window-size=1200,630 --screenshot=assets/og.png <a wrapper that renders og.svg at 1200×630>
  ```
- Before going live, replace the placeholder domain `autofill-vault.vercel.app` with your real URL (see DEPLOYMENT.md, Step 4).
