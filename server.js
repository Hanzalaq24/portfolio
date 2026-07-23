const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

const PORT = 8080;
const MAX_REDIRECTS = 5;

const ALLOWED_DOMAINS = [
  'rifaahdubai.com', 'www.rifaahdubai.com',
  'qr.akmal.in',
  'nplusonefashion.com', 'www.nplusonefashion.com',
  'al-aafiyah.akmal.in',
  'mhctrust.in', 'www.mhctrust.in',
  'texna.in', 'www.texna.in',
  'gottlichhardware.com', 'www.gottlichhardware.com',
  'united-states-kappa.vercel.app',
];

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.txt': 'text/plain',
};

const BLOCKED_HEADERS = ['x-frame-options', 'content-security-policy', 'frame-options'];

const URL_ATTRS = ['src', 'href', 'action', 'poster', 'data-src'];

function proxyUrl(targetUrl) {
  return '/proxy/' + targetUrl.replace('://', ':/');
}

function isAllowed(hostname) {
  return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}

function proxyUrlFromRoot(urlPath, originProxyBase) {
  if (urlPath.startsWith('proxy/')) return urlPath;
  return originProxyBase.replace(/\/$/, '') + '/' + urlPath.replace(/^\//, '');
}

function fetchUrl(targetUrl, redirects, cb) {
  const mod = targetUrl.startsWith('https') ? https : http;
  let parsed;
  try { parsed = new URL(targetUrl); } catch (e) { return cb(new Error('Invalid URL')); }

  if (!isAllowed(parsed.hostname)) {
    return cb(new Error('Domain not allowed: ' + parsed.hostname));
  }

  const req = mod.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    timeout: 15000,
  }, (proxyRes) => {
    const code = proxyRes.statusCode;
    if ([301, 302, 307, 308].includes(code) && redirects < MAX_REDIRECTS) {
      const location = proxyRes.headers.location;
      if (location) {
        const next = new URL(location, targetUrl).href;
        proxyRes.resume();
        fetchUrl(next, redirects + 1, cb);
        return;
      }
    }

    const headers = {};
    for (const key of Object.keys(proxyRes.headers)) {
      const lower = key.toLowerCase();
      if (!BLOCKED_HEADERS.includes(lower)) {
        headers[key] = proxyRes.headers[key];
      }
    }
    headers['Access-Control-Allow-Origin'] = '*';

    const ct = (proxyRes.headers['content-type'] || '').toLowerCase();
    const chunks = [];
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      try {
        let body = Buffer.concat(chunks);
        if (ct.includes('text/html')) {
          let html = body.toString();
          const origin = parsed.origin;
          const domain = parsed.hostname;
          const originProxyBase = proxyUrl(origin) + '/';

          const rewrittenHtml = rewriteHtml(html, domain, originProxyBase);

          delete headers['content-length'];
          body = Buffer.from(rewrittenHtml);
        }
        cb(null, code, headers, body);
      } catch (err) {
        cb(new Error('Failed to process response'));
      }
    });
  });
  req.on('error', () => cb(new Error('Failed to fetch remote')));
  req.setTimeout(15000, () => { req.destroy(); cb(new Error('Request timeout')); });
}

function rewriteHtml(html, domain, originProxyBase) {
  const root = parse(html);

  walkNodes(root, (node) => {
    if (node.nodeType === 1) {
      const tag = node.rawTagName ? node.rawTagName.toLowerCase() : '';

      for (const attr of URL_ATTRS) {
        const val = node.getAttribute(attr);
        if (val) {
          const rewritten = rewriteUrl(val, domain, originProxyBase);
          if (rewritten !== val) {
            node.setAttribute(attr, rewritten);
          }
        }
      }

      const srcset = node.getAttribute('srcset');
      if (srcset) {
        const rewritten = srcset.replace(/(\s*)\/([^\s,]+)/g, (w, ws, p) => {
          if (p.startsWith('proxy/')) return w;
          return ws + originProxyBase.replace(/\/$/, '') + '/' + p;
        });
        if (rewritten !== srcset) {
          node.setAttribute('srcset', rewritten);
        }
      }

      if (tag === 'style' || tag === 'script') {
        return 'skip-children';
      }

      if (tag === 'link') {
        const rel = node.getAttribute('rel') || '';
        if (['canonical', 'alternate'].includes(rel)) {
          const href = node.getAttribute('href');
          if (href && href.startsWith('/')) {
            node.setAttribute('href', originProxyBase.replace(/\/$/, '') + href);
          }
        }
      }
    }
  });

  let result = root.toString();

  result = result.replace(
    /url\(['"]?\/([^'")\s]+)['"]?\)/gi,
    (m, urlPath) => {
      if (urlPath.startsWith('proxy/')) return m;
      return 'url(' + originProxyBase.replace(/\/$/, '') + '/' + urlPath + ')';
    }
  );

  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  result = result.replace(
    new RegExp('https?://' + escapedDomain, 'gi'),
    (match) => proxyUrl(match)
  );

  const NEXT_RE = new RegExp(
    '((?:\\\\\\\\"|["\'`]))\\\\/(_next\\\\/(?:image|static)[^"\'`\\\\\\\\]*)', 'gi'
  );
  result = result.replace(NEXT_RE, (m, quote, urlPath) => {
    if (urlPath.startsWith('proxy/')) return m;
    return quote + originProxyBase.replace(/\/$/, '') + '/' + urlPath;
  });

  const RES_EXTS = 'js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|otf';
  const RES_RE = new RegExp(
    '((?:\\\\\\\\"|["\'`]))\\\\/([^"\'`\\\\\\\\]*\\\\.(?:' + RES_EXTS + ')(?:\\\\?[^"\'`\\\\\\\\]*)?)', 'gi'
  );
  result = result.replace(RES_RE, (m, quote, urlPath) => {
    if (urlPath.startsWith('proxy/')) return m;
    return quote + originProxyBase.replace(/\/$/, '') + '/' + urlPath;
  });

  const overrideScript =
    '<script>' +
    '(function(){' +
    'var d=' + JSON.stringify(domain) + ';' +
    'var pb="/proxy/https:/"+d;' +
    'var r=new RegExp("^https?://" + d.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&"),"i");' +
    'function pu(v){' +
    'if(typeof v!=="string")v=String(v);' +
    'if(v.indexOf("/proxy/")===0)return v;' +
    'if(v.charAt(0)==="/")return pb+v;' +
    'var o=window.location.origin+"/";' +
    'if(v.indexOf(o)===0)return v.replace(o,pb+"/");' +
    'return v;' +
    '}' +
    'var of=window.fetch;' +
    'window.fetch=function(u,o){' +
    'if(typeof u==="string"){' +
    'if(r.test(u))u=u.replace(/^(https?):\\/\\//,"/proxy/$1:/");' +
    'else u=pu(u);' +
    '}' +
    'return of.call(window,u,o);' +
    '};' +
    'var x=XMLHttpRequest.prototype.open;' +
    'XMLHttpRequest.prototype.open=function(m,u){' +
    'if(typeof u==="string"){' +
    'if(r.test(u))arguments[1]=u.replace(/^(https?):\\/\\//,"/proxy/$1:/");' +
    'else arguments[1]=pu(u);' +
    '}' +
    'return x.apply(this,arguments);' +
    '};' +
    'function pp(p,a){try{var d=Object.getOwnPropertyDescriptor(p.prototype,a);' +
    'if(d&&d.set){Object.defineProperty(p.prototype,a,{get(){return d.get.call(this);},' +
    'set(v){return d.set.call(this,pu(v));},configurable:true});}}catch(e){}}' +
    'pp(HTMLScriptElement,"src","src");' +
    'pp(HTMLImageElement,"src","src");' +
    'pp(HTMLVideoElement,"src","src");' +
    'pp(HTMLSourceElement,"src","src");' +
    'pp(HTMLLinkElement,"href","href");' +
    '})();' +
    '</script>';

  const headEnd = result.indexOf('</head>');
  if (headEnd > -1) {
    result = result.slice(0, headEnd) + overrideScript + result.slice(headEnd);
  } else {
    result = overrideScript + result;
  }

  result = result.replace(/\s+target=["']_blank["']/gi, ' target="_self"');

  return result;
}

function rewriteUrl(val, domain, originProxyBase) {
  if (!val || val.startsWith('/proxy/') || val.startsWith('data:') || val.startsWith('blob:') || val.startsWith('javascript:') || val.startsWith('#') || val.startsWith('mailto:') || val.startsWith('tel:')) {
    return val;
  }

  const absoluteUrlMatch = val.match(/^https?:\/\//);
  if (absoluteUrlMatch) {
    try {
      const u = new URL(val);
      if (u.hostname === domain || u.hostname.endsWith('.' + domain)) {
        return proxyUrl(val);
      }
      return val;
    } catch {
      return val;
    }
  }

  if (val.startsWith('/')) {
    return originProxyBase.replace(/\/$/, '') + val;
  }

  if (val.startsWith('./') || val.startsWith('../')) {
    return val;
  }

  return val;
}

function walkNodes(node, fn) {
  const result = fn(node);
  if (result === 'skip-children') return;
  if (node.childNodes) {
    for (const child of node.childNodes) {
      walkNodes(child, fn);
    }
  }
}

function parseProxyPath(reqUrl) {
  const rest = decodeURIComponent(reqUrl.slice('/proxy/'.length));
  return rest.replace(/^(https?):\//, '$1://');
}

function isPathInside(base, target) {
  const relative = path.relative(base, target);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/proxy/')) {
    const targetUrl = parseProxyPath(req.url);

    let parsed;
    try { parsed = new URL(targetUrl); } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Invalid proxy URL');
      return;
    }

    if (!isAllowed(parsed.hostname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Domain not allowed');
      return;
    }

    fetchUrl(targetUrl, 0, (err, code, headers, body) => {
      if (err) {
        console.error('Proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Failed to load remote content');
        return;
      }
      res.writeHead(code, headers);
      res.end(body);
    });
    return;
  }

  let reqPath = req.url.split('?')[0].split('#')[0];
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);

  if (!isPathInside(__dirname, filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ct = MIME[path.extname(filePath)] || 'application/octet-stream';

  const ext = path.extname(reqPath);
  const isPageRequest = !ext || ext === '.html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (isPageRequest) {
        fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(d2);
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err.message);
});

server.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT);
});
