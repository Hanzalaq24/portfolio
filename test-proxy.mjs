import { chromium } from 'playwright';

const SITES = [
  { name: 'texna.in', url: 'http://localhost:8080/proxy/https:/texna.in/' },
  { name: 'gottlichhardware.com', url: 'http://localhost:8080/proxy/https:/gottlichhardware.com/' },
  { name: 'nplusonefashion.com', url: 'http://localhost:8080/proxy/https:/nplusonefashion.com/' },
  { name: 'united-states-kappa.vercel.app', url: 'http://localhost:8080/proxy/https:/united-states-kappa.vercel.app/' },
];

const results = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

for (const site of SITES) {
  console.log(`\n=== Testing ${site.name} ===`);
  const page = await context.newPage();

  const consoleMessages = [];
  const networkRequests = [];
  const failedRequests = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfailed', request => {
    failedRequests.push({ url: request.url(), failure: request.failure()?.errorText });
  });

  page.on('response', response => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      ok: response.ok(),
    });
  });

  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: `/tmp/screenshot-${site.name}.png`, fullPage: false });

    let bodyText = '';
    try {
      bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
    } catch { }

    const hasContent = bodyText.length > 20 && !bodyText.toLowerCase().startsWith('loading');

    const consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');
    const networkFailures = networkRequests.filter(r => r.status >= 400);
    const cssLoaded = networkRequests.some(r => r.url.includes('style.css') && r.status === 200);
    const jsErrors = consoleMessages.filter(m => m.type === 'error').map(m => m.text);
    const fetchErrors = consoleMessages.filter(m =>
      m.text.toLowerCase().includes('fetch') ||
      m.text.toLowerCase().includes('url') ||
      m.text.toLowerCase().includes('route')
    );
    const proxiedImages = networkRequests.filter(r =>
      r.url.includes('/proxy/') && (r.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i))
    );
    const proxiedImagesLoaded = proxiedImages.filter(r => r.status === 200);

    const report = {
      site: site.name,
      rendered: hasContent,
      bodyPreview: bodyText.slice(0, 200),
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 10),
      networkFailureCount: networkFailures.length,
      networkFailures: networkFailures.slice(0, 10),
      failedRequestCount: failedRequests.length,
      failedRequests: failedRequests.slice(0, 10),
      totalRequests: networkRequests.length,
    };

    if (site.name === 'gottlichhardware.com') {
      report.cssLoaded = cssLoaded;
      report.cssFiles = networkRequests.filter(r => r.url.includes('.css'));
    }

    if (site.name === 'nplusonefashion.com') {
      report.jsErrors = jsErrors.slice(0, 10);
      report.fetchUrlRoutingErrors = fetchErrors.slice(0, 10);
    }

    if (site.name === 'united-states-kappa.vercel.app') {
      report.proxiedImagesTotal = proxiedImages.length;
      report.proxiedImagesLoaded = proxiedImagesLoaded.length;
      report.proxiedImages = proxiedImages.slice(0, 10);
    }

    results.push(report);

    console.log(`  Rendered: ${hasContent}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    console.log(`  Network failures: ${networkFailures.length}`);
    console.log(`  Failed requests: ${failedRequests.length}`);

  } catch (err) {
    console.log(`  ERROR loading ${site.name}: ${err.message}`);
    results.push({ site: site.name, error: err.message });
  } finally {
    await page.close();
  }
}

await browser.close();

console.log('\n\n========== FINAL SUMMARY ==========');
for (const r of results) {
  console.log(`\n--- ${r.site} ---`);
  if (r.error) {
    console.log(`  ERROR: ${r.error}`);
    continue;
  }
  console.log(`  Rendered: ${r.rendered}`);
  console.log(`  Body preview: ${r.bodyPreview}`);
  console.log(`  Console errors: ${r.consoleErrorCount}`);
  if (r.consoleErrors?.length) {
    for (const e of r.consoleErrors) {
      console.log(`    [${e.type}] ${e.text.slice(0, 200)}`);
    }
  }
  console.log(`  Network failures: ${r.networkFailureCount}`);
  if (r.networkFailures?.length) {
    for (const f of r.networkFailures) {
      console.log(`    ${f.status} ${f.url.slice(0, 150)}`);
    }
  }
  console.log(`  Failed requests: ${r.failedRequestCount}`);
  if (r.failedRequests?.length) {
    for (const f of r.failedRequests) {
      console.log(`    ${f.url.slice(0, 150)} => ${f.failure}`);
    }
  }
  console.log(`  Total requests: ${r.totalRequests}`);

  if (r.cssLoaded !== undefined) {
    console.log(`  CSS style.css loaded: ${r.cssLoaded}`);
    if (r.cssFiles?.length) {
      for (const c of r.cssFiles) {
        console.log(`    CSS file: ${c.status} ${c.url.slice(0, 150)}`);
      }
    }
  }
  if (r.jsErrors !== undefined) {
    console.log(`  JS errors: ${r.jsErrors.length}`);
    for (const e of r.jsErrors) {
      console.log(`    ${e.slice(0, 200)}`);
    }
  }
  if (r.fetchUrlRoutingErrors !== undefined) {
    console.log(`  Fetch/URL/Routing errors: ${r.fetchUrlRoutingErrors.length}`);
    for (const e of r.fetchUrlRoutingErrors) {
      console.log(`    ${e.slice(0, 200)}`);
    }
  }
  if (r.proxiedImages !== undefined) {
    console.log(`  Proxied images: ${r.proxiedImagesLoaded}/${r.proxiedImagesTotal} loaded`);
    for (const img of r.proxiedImages) {
      console.log(`    ${img.status} ${img.url.slice(0, 150)}`);
    }
  }
}
