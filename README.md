# Outshark.in — website source

A responsive static website for the Outshark online-tools directory.

## Current features
- Responsive homepage with refreshed visual design
- Searchable tool directory with typo-tolerant matching across names, descriptions and keywords
- Tool cards grouped by image, document, media and productivity categories
- Browser-side image compression, word counter and media URL format checker
- About, contact, privacy, terms, request-tool and 404 pages
- Basic SEO metadata, sitemap.xml and robots.txt

## Before launch
1. Confirm that `outshark.in` is the domain you want to connect.
2. Replace the placeholder contact email in `request-tool.html` and contact details in `contact.html` with an address you actively monitor.
3. Review and customize `privacy.html` and `terms.html` for the actual services, data flows and applicable law.
4. Tools marked `Coming soon` are catalogue entries only; they are not implemented yet.
5. Test on current iOS Safari, Android Chrome and desktop browsers.
6. Configure GitHub Pages and the custom domain. In GoDaddy, preserve existing MX/TXT/email records and change only the web records required by GitHub Pages.
7. Do not place private API keys in browser JavaScript. Use a server-side function/worker for secret credentials.
8. Add analytics, advertising or payments only after updating privacy disclosures and reviewing provider policies.

## Preview locally
Open `index.html`, or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## Deploy with GitHub Pages
- In the repository, open **Settings → Pages**.
- Choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
- Configure `outshark.in` as the custom domain in Pages and enable HTTPS once DNS is verified.
- GitHub Pages may show the DNS records required for the domain. Follow the current values shown in the repository settings; do not replace unrelated GoDaddy email records.

## Scope and limitations
This is a static website starter, not yet a complete AI platform. It has no AI API, server-side processing, user accounts, payment system or ad network. The media checker validates URL syntax only; it does not download content or bypass DRM, login requirements, private content or platform restrictions.
