// @ts-check
import { defineConfig } from 'astro/config';

// Base path and canonical site URL are driven by the environment, not hardcoded,
// so the same build works for a GitHub project page, a user/org page, or a custom domain.
//
// The GitHub Actions workflow computes these (see .github/workflows/deploy.yml):
//   - Project page:  BASE_PATH="/<repo>/"  SITE_URL="https://<owner>.github.io/<repo>"
//   - User/org page or custom domain:  BASE_PATH="/"  SITE_URL="https://<domain>"
//
// Locally they are unset, so the site serves from "/" at http://localhost:4321.
const base = process.env.BASE_PATH ?? '/';
const site = process.env.SITE_URL ?? 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  // The dev toolbar sits bottom-centre and would otherwise appear in captured
  // preview/share frames, which run against `astro dev`. Off only during capture.
  devToolbar: { enabled: process.env.CAPTURE !== '1' },
  build: {
    // Emit /about/index.html etc. so routes work cleanly on static hosting.
    format: 'directory',
  },
});
