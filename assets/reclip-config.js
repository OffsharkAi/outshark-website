// Production deployment gate — intentionally OFF.
// Never enable until api.outshark.in is HTTPS, authenticated/abuse-limited,
// sandboxed against SSRF, and has a verified aggregate disk quota.
// The public GitHub Pages website cannot proxy Python requests.
window.OUTSHARK_RECLIP_ENABLED = false;
window.OUTSHARK_RECLIP_API_BASE = "";
