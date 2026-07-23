(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.getElementById('siteNav');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });

  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('.reveal').forEach(el => {
      gsap.fromTo(el, { opacity: 0, y: 32 }, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 84%' }
      });
    });
    document.querySelectorAll('.work-grid, .chip-row, .ach-list').forEach(group => {
      gsap.fromTo(group.children, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: group, start: 'top 88%' }
      });
    });
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.eyebrow', { opacity: 0, y: 14, duration: 0.6 })
      .from('h1.name', { opacity: 0, y: 20, duration: 0.7 }, '-=0.4')
      .from('.subhead', { opacity: 0, y: 16, duration: 0.6 }, '-=0.4')
      .from('.cta-row .btn', { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, '-=0.3')
      .from('.avail', { opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.bot-stage', { opacity: 0, scale: 0.85, duration: 0.8 }, '-=0.9');
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.style.opacity = 1);
  }

  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const rotX = ((y - r.height / 2) / r.height) * -8;
        const rotY = ((x - r.width / 2) / r.width) * 8;
        card.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  const termLines = [
    { t: 'whoami', cls: 't-cmd' },
    { t: 'Hanzala Qureshi — full-stack engineer, founder @ Akmal', cls: 't-out' },
    { t: '', cls: 't-out' },
    { t: 'cat stack.json', cls: 't-cmd' },
    { t: '["Next.js","React","Node.js","Supabase","PocketBase","Gemini API"]', cls: 't-out' },
    { t: '', cls: 't-out' },
    { t: './ship rifaah-dubai --env production', cls: 't-cmd' },
    { t: '✓ build complete — deployed', cls: 't-out' },
  ];
  const termBody = document.getElementById('termBody');
  let termStarted = false;

  function typeTerminal(){
    if (termStarted) return;
    termStarted = true;
    let li = 0;
    function nextLine(){
      if (li >= termLines.length) return;
      const spec = termLines[li];
      const div = document.createElement('div');
      div.className = 't-line ' + spec.cls;
      termBody.appendChild(div);
      if (reduceMotion || spec.t === '') {
        div.textContent = spec.t;
        li++;
        setTimeout(nextLine, 120);
        return;
      }
      let ci = 0;
      const speed = spec.cls === 't-cmd' ? 34 : 10;
      const iv = setInterval(() => {
        div.textContent = spec.t.slice(0, ci + 1);
        ci++;
        if (ci >= spec.t.length) {
          clearInterval(iv);
          li++;
          setTimeout(nextLine, spec.cls === 't-cmd' ? 260 : 420);
        }
      }, speed);
    }
    nextLine();
    setTimeout(() => {
      const cursor = document.createElement('span');
      cursor.className = 't-cursor';
      termBody.appendChild(cursor);
    }, termLines.reduce((a, s) => a + (s.t.length * (s.cls==='t-cmd'?34:10) + 300), 400));
  }

  const termObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { typeTerminal(); termObserver.disconnect(); } });
  }, { threshold: 0.3 });
  termObserver.observe(document.querySelector('.terminal-window'));

  (function(){
    const iframe = document.getElementById('browserIframe');
    const fallback = document.getElementById('browserFallback');
    const urlBars = document.querySelectorAll('.safari-url, .compact-pill-url');
    const slider = document.getElementById('siteSlider');
    var homeSrc = '';
    var originDomain = '';
    var displayUrl = '';
    var currentSiteIdx = 0;
    var patched = false;

    const sites = [
      { url: 'https://qr.akmal.in', label: 'Smart QR' },
      { url: 'http://rifaahdubai.com', label: 'Rifaah Dubai' },
      { url: 'http://nplusonefashion.com', label: 'N Plus One Fashion' },
      { url: 'http://al-aafiyah.akmal.in/residences/', label: 'Al-Aafiyah' },
      { url: 'http://united-states-kappa.vercel.app', label: 'United States' },
      { url: 'http://mhctrust.in', label: 'MHC Trust' },
    ];

    function loadSite(index){
      currentSiteIdx = index;
      const site = sites[index];
      const url = site.url;
      originDomain = new URL(url).hostname;
      homeSrc = '/proxy/' + url.replace('://', ':/');
      displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (fallback) fallback.style.display = 'flex';
      iframe.src = homeSrc;
      urlBars.forEach(function(el){ el.textContent = displayUrl; });
      document.querySelectorAll('.site-btn').forEach(function(btn, i){
        btn.classList.toggle('active', i === index);
      });
    }

    sites.forEach(function(site, i){
      var btn = document.createElement('button');
      btn.className = 'site-btn' + (i === 0 ? ' active' : '');
      btn.textContent = site.label;
      btn.addEventListener('click', function(){ loadSite(i); });
      slider.appendChild(btn);
    });

    loadSite(0);

    function redirectIfNotHome(currentUrl) {
      if (!currentUrl || currentUrl.indexOf('about:') === 0) return;
      if (currentUrl.indexOf(homeSrc) >= 0) return;
      var actualUrl = currentUrl;
      if (currentUrl.indexOf('/proxy/') < 0 && currentUrl.indexOf(originDomain) < 0) {
        actualUrl = 'https://' + originDomain + new URL(currentUrl).pathname;
      }
      window.open(actualUrl, '_blank');
      iframe.src = homeSrc;
    }

    function patchHistory() {
      if (patched) return;
      try {
        var win = iframe.contentWindow;
        if (!win || !win.history) return;

        var origPush = win.history.pushState;
        win.history.pushState = function(s, t, u) {
          if (u && !u.toString().startsWith('#')) {
            var fullUrl = new URL(u, win.location.href).href;
            var curUrl = win.location.href;
            if (fullUrl === curUrl || curUrl.split('#')[0] === fullUrl.split('#')[0]) {
              return origPush.apply(this, arguments);
            }
            redirectIfNotHome(fullUrl);
            return;
          }
          return origPush.apply(this, arguments);
        };

        var origReplace = win.history.replaceState;
        win.history.replaceState = function(s, t, u) {
          if (u && !u.toString().startsWith('#')) {
            var fullUrl = new URL(u, win.location.href).href;
            var curUrl = win.location.href;
            if (fullUrl === curUrl || curUrl.split('#')[0] === fullUrl.split('#')[0]) {
              return origReplace.apply(this, arguments);
            }
            redirectIfNotHome(fullUrl);
            return;
          }
          return origReplace.apply(this, arguments);
        };

        patched = true;
      } catch(e) {}
    }

    iframe.addEventListener('load', function(){
      if (fallback) fallback.style.display = 'none';
      patchHistory();
      try { redirectIfNotHome(iframe.contentWindow.location.href); } catch(e) {}
    });
  })();

  const stage = document.getElementById('botStage');
  if (window.THREE && stage) {
    const w = stage.clientWidth || 360, h = stage.clientHeight || 360;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
    camera.position.set(0, 1.05, 4.6);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xfff3df, 0.7);
    dir.position.set(2, 3, 3);
    scene.add(dir);
    const accentLight = new THREE.PointLight(0xC9A24B, 0.6, 6);
    accentLight.position.set(-1.2, 1.6, 1.5);
    scene.add(accentLight);

    const bodyColor = 0xF3ECDC;
    const inkColor = 0x2A2419;
    const accentColor = 0xC9A24B;

    const robot = new THREE.Group();

    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.1, 1.3),
      new THREE.MeshStandardMaterial({ color: 0xE6DBC3, roughness: 0.9 })
    );
    desk.position.y = -0.62;
    robot.add(desk);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.15, 0.8),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55, metalness: 0.08 })
    );
    body.position.y = 0.05;
    robot.add(body);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.4, 0.06),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, emissive: 0x3a2c10, emissiveIntensity: 0.3 })
    );
    chest.position.set(0, 0.1, 0.43);
    robot.add(chest);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.86, 0);
    robot.add(headGroup);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.66, 0.72),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 })
    );
    headGroup.add(head);

    const screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.34),
      new THREE.MeshStandardMaterial({ color: inkColor, roughness: 0.6 })
    );
    screenFace.position.set(0, 0, 0.365);
    headGroup.add(screenFace);

    const eyeGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.9 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.13, 0.03, 0.395);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.13;
    headGroup.add(eyeL, eyeR);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8),
      new THREE.MeshStandardMaterial({ color: inkColor })
    );
    antenna.position.set(0, 0.5, 0);
    headGroup.add(antenna);
    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1 })
    );
    antennaTip.position.set(0, 0.68, 0);
    headGroup.add(antennaTip);

    function makeArm(sign){
      const pivot = new THREE.Group();
      pivot.position.set(sign * 0.58, 0.35, 0.15);
      const upper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.55 })
      );
      upper.position.y = -0.25;
      pivot.add(upper);
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 10),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 })
      );
      hand.position.y = -0.5;
      pivot.add(hand);
      return pivot;
    }
    const armL = makeArm(-1);
    const armR = makeArm(1);
    robot.add(armL, armR);

    const laptop = new THREE.Group();
    const lapBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.05, 0.42),
      new THREE.MeshStandardMaterial({ color: 0xD9CCA9, roughness: 0.6 })
    );
    laptop.add(lapBase);
    const lapScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.4, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xD9CCA9, roughness: 0.6 })
    );
    lapScreen.position.set(0, 0.2, -0.19);
    lapScreen.rotation.x = -0.32;
    laptop.add(lapScreen);
    const lapGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x8FBB99, emissive: 0x8FBB99, emissiveIntensity: 0.55 })
    );
    lapGlow.position.set(0, 0.2, -0.174);
    lapGlow.rotation.x = -0.32;
    laptop.add(lapGlow);
    laptop.position.set(0, -0.55, 0.55);
    robot.add(laptop);

    robot.position.y = -0.05;
    scene.add(robot);

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    function onResize(){
      const nw = stage.clientWidth, nh = stage.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    }
    window.addEventListener('resize', onResize);

    let animating = true;
    const clock = new THREE.Clock();

    const botObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => { animating = e.isIntersecting; });
    });
    botObserver.observe(stage);

    function animate(){
      if (!animating) {
        requestAnimationFrame(animate);
        return;
      }
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      robot.position.y = -0.05 + Math.sin(t * 1.2) * 0.045;
      robot.rotation.y = Math.sin(t * 0.4) * 0.06;

      const targetRotY = mouseX * 0.35;
      const targetRotX = -mouseY * 0.18;
      headGroup.rotation.y += (targetRotY - headGroup.rotation.y) * 0.06;
      headGroup.rotation.x += (targetRotX - headGroup.rotation.x) * 0.06;

      armL.rotation.x = -0.15 + Math.sin(t * 5) * 0.3;
      armR.rotation.x = -0.15 + Math.sin(t * 5 + Math.PI) * 0.3;

      const blink = (Math.sin(t * 0.7) > 0.965) ? 0.1 : 1;
      eyeL.scale.y = blink; eyeR.scale.y = blink;
      antennaTip.material.emissiveIntensity = 0.7 + Math.sin(t * 2) * 0.3;

      renderer.render(scene, camera);
    }
    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
