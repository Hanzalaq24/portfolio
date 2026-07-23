---
title: "Deep Code Review — Full Codebase Audit"
date: "2026-07-23"
depth: deep
files_reviewed: 7
status: findings
critical: 4
warning: 10
info: 8
total: 22
---

# Deep Code Review: Full Codebase Audit

**Depth:** Deep (cross-file analysis, call chains, security audit)  
**Files reviewed:** 7  
**Date:** 2026-07-23

---

## CRITICAL

### CR-01 Open proxy — SSRF & internal network access

**File:** `server.js:240-248`  
**Type:** Security Vulnerability

The proxy handler at `/proxy/` accepts any target URL with no restrictions:

```js
function parseProxyPath(reqUrl) {
  const rest = decodeURIComponent(reqUrl.slice('/proxy/'.length));
  return rest.replace(/^(https?):\//, '$1://');
}
```

An attacker can request `/proxy/http:/localhost:6379/` (Redis), `/proxy/http:/169.254.169.254/latest/meta-data/` (cloud metadata), or any internal service. The proxy will fetch and return the response.

**Fix:** Add an allowlist of permitted domains, or restrict the proxy to specific hosts. Validate the target URL against a strict pattern and reject private/loopback IPs.

---

### CR-02 SSL verification disabled globally

**File:** `server.js:31`  
**Type:** Security Vulnerability

```js
rejectUnauthorized: false
```

All outbound HTTPS connections accept self-signed and invalid certificates, enabling man-in-the-middle attacks on proxied traffic.

**Fix:** Remove `rejectUnauthorized: false`. If self-signed certs are needed for development, make it conditional on a `NODE_ENV` check.

---

### CR-03 ReDoS risk in HTML URL rewriting

**File:** `server.js:68-71`  
**Type:** Bug / Security

```js
html = html.replace(
  new RegExp('https?://' + escapedDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
  (match) => proxyUrl(match)
);
```

This regex replaces ALL occurrences of the target domain in the raw HTML, including inside JavaScript strings, JSON payloads, CSS, and inline scripts. For pages with large inline scripts containing the domain, this regex scans the entire document multiple times (10 regex passes total over the full HTML). A large HTML response with pathological content could cause catastrophic backtracking.

Additionally, step 1 modifies content inside `<script>` blocks that may contain strings matching the domain pattern, corrupting JavaScript literals and JSON data.

**Fix:** Use an HTML parser (e.g., `node-html-parser` or `jsdom`) to rewrite only URL attributes in elements, not raw text content. Limit regex rewriting to attribute values only.

---

### CR-04 Native prototype pollution via injected proxy script

**File:** `server.js:186-213`, injected into proxied HTML at line 217-221  
**Type:** Security Vulnerability / Bug

The injected `overrideScript` monkey-patches native browser APIs on every proxied page:

```js
Object.defineProperty(HTMLImageElement.prototype, "src", { ... });
Object.defineProperty(HTMLScriptElement.prototype, "src", { ... });
Object.defineProperty(HTMLLinkElement.prototype, "href", { ... });
Element.prototype.setAttribute = function(n, v) { ... };
```

This breaks fundamental browser APIs. Pages that rely on native property setter behavior (e.g., frameworks like React, Vue, or Svelte that use property setters internally via their virtual DOM) will malfunction. The `setAttribute` override intercepts ALL attribute sets, not just URL attributes. The `MutationObserver` rewrites `src` on dynamically added elements, which can break scripts that set computed/relative URLs.

**Fix:** Instead of patching prototypes, use a Service Worker as the interception layer. Service Workers can intercept `fetch()` natively without DOM pollution. For non-fetch resources, configure the server to rewrite URLs at the HTML level only, using a proper HTML parser.

---

## WARNING

### WR-01 HTML rewriting corrupts JavaScript/JSON data

**File:** `server.js:66-154`  
**Type:** Bug

The 8 regex-based HTML rewriting steps operate on the raw HTML string, including content inside `<script>` tags. Steps 1-8 will match and replace strings inside JavaScript code, JSON-LD (`<script type="application/ld+json">`), React's `__NEXT_DATA__`, and RSC payloads. For example, if a script contains `const domain = "https://rifaahdubai.com/path"`, step 1 will rewrite it to `const domain = "/proxy/https:/rifaahdubai.com/path"`, breaking the JavaScript.

Step 4 (`srcset`) uses a multiline regex `[\s\S]*?` that can match across element boundaries. Step 8 matches file extensions inside any quoted string, including template literals and JSON values.

**Impact:** Proxied SPAs (Next.js, React apps) will have corrupted JavaScript state, broken API calls, and malformed client-side data.

**Fix:** Use an HTML parser to rewrite only HTML attributes, leaving script/text content untouched.

---

### WR-02 Binary content proxying broken — OTS font parsing errors

**File:** `server.js:53-63`, `server.js:227-229`  
**Type:** Bug

Console logs from `test-proxy.mjs` show repeated `OTS parsing error: invalid sfntVersion` for `.woff2` font files. The proxy decides whether to parse content based on `content-type`, but when it does parse binary content (due to incorrect content-type detection), it corrupts binary data. The `content-length` header is only deleted for HTML responses (line 227), but the issue also occurs when binary content passes through without proper passthrough.

**Fix:** Ensure binary content (non-text MIME types) passes through completely unmodified. Add explicit MIME-type passthrough logic.

---

### WR-03 Path traversal in static file serving

**File:** `server.js:260`  
**Type:** Security

```js
let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
```

While `path.join` resolves `..` sequences, URL-encoded traversal (`%2e%2e%2f`) or queries with special characters can cause issues. Additionally, the file serving does not check that the resolved path is within `__dirname` — a symlink or path like `...` could potentially escape.

**Fix:** Verify the resolved path starts with `__dirname` before serving:

```js
if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end(); return; }
```

---

### WR-04 Monolithic inline script — poor maintainability

**File:** `index.html:762-1156`  
**Type:** Code Quality

The ~400-line inline `<script>` block contains 7 discrete concerns:
1. Nav scroll class toggling
2. GSAP scroll reveals
3. Card tilt effect
4. Terminal typewriter
5. iframe proxy management + history patching
6. Three.js 3D robot
7. Intersection observers

Cross-file analysis reveals:
- The proxy management in index.html duplicates URL rewriting logic from `server.js` (though client-side vs server-side)
- `liquidframe.js` has its own clock and wheel-scroll logic that overlaps with the inline script
- No error recovery between modules — if Three.js fails to load, the entire script block is unaffected, but there's no graceful degradation

**Fix:** Split into separate files by concern, load with `async`/`defer`.

---

### WR-05 Open error disclosure in proxy failure response

**File:** `server.js:250-253`  
**Type:** Security

```js
res.end('<html>...<p>' + err.message + '</p>...</html>');
```

When proxy requests fail, the error message is reflected verbatim in the response. Error messages can leak internal paths, network topology, and failure modes.

**Fix:** Log the detailed error server-side and return a generic "Failed to load" message to the client.

---

### WR-06 Runtime interception breaks SPA frameworks

**File:** `server.js:156-214`  
**Type:** Bug

The injected `po()` function patches property descriptors on `HTMLImageElement`, `HTMLScriptElement`, `HTMLVideoElement`, `HTMLSourceElement`, and `HTMLLinkElement` prototypes. This interferes with React's and Vue's DOM diffing/reconciliation, which rely on native property setters. The `setAttribute` override (line 198) breaks any framework that uses `setAttribute()` internally for non-URL attributes.

The `MutationObserver` (lines 202-213) rewrites `src` on every dynamically added IMG/SCRIPT/VIDEO/SOURCE element, including elements that frameworks create with data URLs, blob URLs, or computed paths.

---

### WR-07 Unused `http-proxy` npm dependency

**File:** `package.json:14`  
**Type:** Code Quality

`http-proxy` ^1.18.1 is listed as a dependency but `server.js` implements its own proxy using Node's `http`/`https` modules. This adds unnecessary install time and attack surface.

**Fix:** Remove `http-proxy` from `dependencies`.

---

### WR-08 `playwright` should be a devDependency

**File:** `package.json:15`  
**Type:** Code Quality

`playwright` is listed under `dependencies` instead of `devDependencies`. It's only used for testing in `test-proxy.mjs` and should not be installed in production.

**Fix:** Move to `devDependencies`.

---

### WR-09 Large synchronous script tags block rendering

**File:** `index.html:52-54`  
**Type:** Performance

Three.js (~500KB minified), GSAP (~40KB), and ScrollTrigger are loaded via synchronous `<script>` tags without `async` or `defer`:

```html
<script src="assets/js/three.min.js"></script>
<script src="assets/js/gsap.min.js"></script>
<script src="assets/js/scrolltrigger.min.js"></script>
```

These block HTML parsing and rendering. Three.js in particular is large and only used for the 92×92px robot mascot.

**Fix:** Add `defer` to all three tags, or load Three.js dynamically only when the robot element is visible (via IntersectionObserver).

---

### WR-10 Three.js renderer leak on mobile

**File:** `index.html:980-983`, `index.html:238-240`  
**Type:** Bug / Memory Leak

The 3D robot canvas is created inside `#botStage` (line 983). At `max-width: 720px`, the stage is hidden with `display: none` (CSS line 239). However, the Three.js `animate()` loop continues running via `requestAnimationFrame`, consuming CPU/GPU.

**Fix:** Use an IntersectionObserver to pause/resume the animation loop when the element is hidden.

---

## INFO

### IN-01 Loose image files at project root

**Files:** `Dental clini.png`, `Gottlich.png`, `Rifaah.png`, `smart Qr.png`  
**Type:** Housekeeping

Four image files sit at the project root directory with spaces in filenames. They appear unused by `index.html` (which references files under `assets/img/projects/`).

**Fix:** Remove unused files.

---

### IN-02 README project image mismatch

**File:** `assets/img/projects/README.md` vs `index.html`  
**Type:** Documentation

The README suggests `.jpg` filenames but `index.html` references `.png` files. Both formats exist in the directory, causing confusion.

**Fix:** Standardize on one format and update documentation.

---

### IN-03 Missing .gitignore

**Type:** Housekeeping

No `.gitignore` file. The following should be excluded:
- `node_modules/`
- `test-results/`
- `.playwright-mcp/`
- `.DS_Store`

**Fix:** Add a `.gitignore`.

---

### IN-04 robots.txt sitemap may not resolve

**File:** `robots.txt:66`  
**Type:** Documentation

References `https://hanzalaq24.github.io/portfolio/sitemap.xml` — verify this URL exists.

---

### IN-05 No build system or linting configured

**Type:** Process

No ESLint, Prettier, TypeScript, or build step. While intentional, adding Prettier would standardize formatting across the codebase.

---

### IN-06 `test-proxy.mjs` uses hardcoded 8-second wait

**File:** `test-proxy.mjs:41`  
**Type:** Test Quality

```js
await page.waitForTimeout(8000);
```

Waits 8 seconds unconditionally. Should use Playwright's built-in wait strategies (`waitForSelector`, `waitForFunction`, or network idle).

---

### IN-07 Duplicate safari URL HTML in index.html

**File:** `index.html:486-506`  
**Type:** Code Quality

The Safari URL bar HTML with the same SVG icons (page menu, reload) is duplicated three times — once for top capsule, once for bottom liquid address row, once for compact pill. Total SVG markup duplicated across ~6 instances.

**Fix:** Use a `<template>` element or generate via JavaScript.

---

### IN-08 Email address hardcoded in 5+ locations

**Type:** Maintainability

`support@akmal.in` appears in:
1. SEO description meta
2. Schema.org JSON-LD
3. Hero CTA
4. Footer CTA (×2)
5. "Schedule a call" mailto link

**Fix:** Store in a single constant in JavaScript and reference from there.

---

## Summary by File

| File | Lines | Critical | Warning | Info |
|---|---|---|---|---|
| `index.html` | 1160 | 0 | 3 | 4 |
| `server.js` | 290 | 4 | 5 | 0 |
| `assets/css/liquidframe.css` | 526 | 0 | 0 | 0 |
| `assets/js/liquidframe.js` | 125 | 0 | 0 | 0 |
| `test-proxy.mjs` | 167 | 0 | 0 | 1 |
| `package.json` | 17 | 0 | 2 | 0 |
| `robots.txt` | 66 | 0 | 0 | 1 |

## Cross-cutting concerns

- **Proxy architecture**: The server-side 10-step regex rewrite + client-side native API patching is fragile. A Service Worker approach would be more maintainable and less invasive.
- **SPA compatibility**: The proxy will not work correctly with React, Vue, or any framework that uses pushState, service workers, or dynamic imports.
- **Security**: Open proxy + disabled SSL + error disclosure + missing path validation = high-risk profile if exposed beyond localhost.
- **Maintainability**: The monolithic inline script in index.html should be decomposed into modules. The duplication of Safari chrome markup suggests a component-based approach would reduce code.
