/* Ellen Ma – interactions & motion */
(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- text splitting ---------- */
  $$('.split-lines').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(w => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  });
  $$('.split-chars').forEach(el => {
    el.innerHTML = [...el.textContent].map(c => `<span class="ch">${c}</span>`).join('');
  });

  /* No animation library or reduced motion → show everything statically */
  if (!hasGsap || reduced) {
    root.classList.remove('js');
    $('.loader')?.remove();
  }

  /* ---------- counters ---------- */
  const fmt = (v, d) => d ? v.toFixed(d) : String(Math.round(v));
  const runCount = el => {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || 0, 10);
    if (reduced) { el.textContent = fmt(end, dec); return; }
    const dur = 1600, t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = dec ? (end * e).toFixed(dec) : Math.round(end * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- generic in-view observer (works without GSAP) ---------- */
  const onView = (els, cb, opts = { threshold: 0.25 }) => {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { cb(en.target); io.unobserve(en.target); }
    }), opts);
    els.forEach(el => io.observe(el));
  };
  onView($$('[data-count]'), runCount, { threshold: 0.6 });
  onView($$('[data-dash]'), el => el.classList.add('is-in'), { threshold: 0.2 });

  /* ---------- nav: hide on scroll, theme, active link ---------- */
  const nav = $('[data-nav]');
  const darkZones = () => [$('.hero'), $('.footer')];
  let lastY = scrollY;
  const navUpdate = () => {
    const y = scrollY;
    if (!document.body.classList.contains('menu-open')) {
      nav.classList.toggle('is-hidden', y > lastY && y > 200);
    }
    lastY = y;
    const probe = 50;
    const overDark = darkZones().some(z => { const r = z.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
    nav.classList.toggle('is-light', !overDark);
    const ids = ['about', 'expertise', 'projects'];
    let active = null;
    ids.forEach(id => { const s = document.getElementById(id); if (s && s.getBoundingClientRect().top < innerHeight * .4) active = id; });
    $$('.nav__links a').forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + active));
  };
  addEventListener('scroll', navUpdate, { passive: true });
  navUpdate();

  /* ---------- mobile menu ---------- */
  const burger = $('[data-burger]');
  const menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    nav.classList.remove('is-hidden');
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Resume link placeholder */
  $$('[data-resume]').forEach(a => a.addEventListener('click', e => {
    if (a.getAttribute('href') === '#') { e.preventDefault(); location.hash = '#contact'; }
  }));

  /* ---------- custom cursor ---------- */
  if (finePointer && !reduced) {
    const cur = $('.cursor'), label = $('.cursor__label');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
    const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', e => {
      const lab = e.target.closest('[data-cursor]');
      const hov = e.target.closest('a,button,[data-hover],summary,.ind li,.hero__skills li');
      cur.classList.toggle('is-label', !!lab);
      cur.classList.toggle('is-hover', !lab && !!hov);
      label.textContent = lab ? lab.dataset.cursor : '';
    });
  }

  /* ---------- magnetic button ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnet]').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * .3}px,${dy * .4}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform .6s cubic-bezier(.2,.75,.15,1)';
        btn.style.transform = '';
        setTimeout(() => (btn.style.transition = ''), 600);
      });
    });
  }

  /* ---------- logo marquee (mobile) : duplicate set for a seamless loop ---------- */
  const track = $('.logos__track');
  if (track) {
    [...track.children].forEach(n => { const c = n.cloneNode(true); c.classList.add('dup'); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
  }

  /* ---------- radar chart ---------- */
  const radar = $('[data-radar]');
  if (radar) {
    const labels = $$('.radar__labels li', radar);
    const n = labels.length, C = 300, R = 220;
    const base = [0.9, 0.78, 0.82, 0.92, 0.86, 0.84, 0.9, 0.8, 0.88, 0.94, 0.86, 0.76];
    const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
    const NS = 'http://www.w3.org/2000/svg';
    const rings = $('.radar__rings', radar), axes = $('.radar__axes', radar), dots = $('.radar__dots', radar), shape = $('.radar__shape', radar);
    for (let k = 1; k <= 6; k++) {
      const p = document.createElementNS(NS, 'polygon');
      p.setAttribute('points', labels.map((_, i) => pt(i, R * k / 6).join(',')).join(' '));
      rings.appendChild(p);
    }
    labels.forEach((li, i) => {
      const l = document.createElementNS(NS, 'line'); const [x, y] = pt(i, R);
      l.setAttribute('x1', C); l.setAttribute('y1', C); l.setAttribute('x2', x); l.setAttribute('y2', y); axes.appendChild(l);
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 4); dots.appendChild(c);
    });
    const placeLabels = () => labels.forEach((li, i) => {
      const [lx, ly] = pt(i, R + 54);
      const svg = $('.radar__svg', radar).getBoundingClientRect(), box = radar.getBoundingClientRect();
      const s = svg.width / 600;
      li.style.setProperty('--x', (svg.left - box.left + lx * s) + 'px');
      li.style.setProperty('--y', (svg.top - box.top + ly * s) + 'px');
    });
    let current = base.map(() => 0), target = base.slice(), raf;
    const draw = () => {
      let moving = false;
      current = current.map((v, i) => { const d = target[i] - v; if (Math.abs(d) > .002) moving = true; return v + d * .12; });
      shape.setAttribute('points', current.map((v, i) => pt(i, R * v).join(',')).join(' '));
      $$('circle', dots).forEach((c, i) => { const [x, y] = pt(i, R * current[i]); c.setAttribute('cx', x); c.setAttribute('cy', y); });
      if (moving) raf = requestAnimationFrame(draw);
    };
    const setTarget = t => { target = t; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    const highlight = (fn) => {
      labels.forEach((li, i) => li.classList.toggle('is-hot', fn(i)));
      $$('circle', dots).forEach((c, i) => { c.classList.toggle('is-hot', fn(i)); c.setAttribute('r', fn(i) ? 7 : 4); });
    };
    const focusArea = area => {
      const hit = i => area !== null && labels[i].dataset.area.split(' ').includes(String(area));
      highlight(hit);
      setTarget(base.map((v, i) => area === null ? v : hit(i) ? 1 : v * .72));
    };
    labels.forEach((li, i) => {
      li.addEventListener('mouseenter', () => { highlight(j => j === i); setTarget(base.map((v, j) => j === i ? 1 : v * .8)); });
      li.addEventListener('mouseleave', () => focusArea(openArea));
    });
    shape.setAttribute('points', base.map((_, i) => pt(i, 0).join(',')).join(' '));
    placeLabels();
    addEventListener('resize', placeLabels);
    let openArea = 0;
    onView([radar], () => focusArea(openArea), { threshold: 0.3 });

    /* accordion linked to radar */
    const items = $$('.acc__item');
    items.forEach(item => {
      const btn = $('.acc__head', item);
      btn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach(o => { o.classList.remove('is-open'); $('.acc__head', o).setAttribute('aria-expanded', 'false'); });
        if (willOpen) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
        openArea = willOpen ? Number(item.dataset.index) : null;
        focusArea(openArea);
        if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 650);
      });
      item.addEventListener('mouseenter', () => focusArea(Number(item.dataset.index)));
      item.addEventListener('mouseleave', () => focusArea(openArea));
    });
  }

  /* ---------- AI agents demo ---------- */
  const agents = $('[data-agents]');
  if (agents) {
    const steps = $$('.agent', agents), log = $('[data-agents-log]', agents), approve = $('[data-approve]', agents);
    const status = $('.agents__review span', agents);
    const msgs = [
      ['demand', 'Scanning 2,400 listings · 38 rising keywords'],
      ['demand', 'Top niche: <b>minimal ceramic planters</b> (+64% QoQ)'],
      ['product', 'Drafted 3 variants · cost model attached'],
      ['product', 'Material spec + margin check: <b>41%</b>'],
      ['image', 'Generated 6 mockup angles · lifestyle set'],
      ['image', 'Brand consistency score: <b>0.92</b>'],
      ['marketing', 'Listing title + 13 tags drafted'],
      ['marketing', 'Launch plan: <b>Pinterest + Etsy Ads</b>'],
    ];
    let step = 0, timer, waiting = false;
    const add = html => {
      const p = document.createElement('p'); p.innerHTML = '› ' + html; log.appendChild(p);
      while (log.children.length > 7) log.firstChild.remove();
    };
    const run = () => {
      steps.forEach((s, i) => { s.classList.toggle('is-run', i === step); s.classList.toggle('is-done', i < step); });
      status.textContent = `Agent ${step + 1}/4 running…`;
      approve.disabled = true; waiting = false;
      const [m1, m2] = msgs.slice(step * 2, step * 2 + 2);
      setTimeout(() => add(`<b>${m1[0]}</b> ${m1[1]}`), 500);
      setTimeout(() => add(`<b>${m2[0]}</b> ${m2[1]}`), 1500);
      setTimeout(() => {
        status.textContent = 'Awaiting human review'; approve.disabled = false; waiting = true;
        timer = setTimeout(next, 3200); /* auto-approve so the demo keeps moving */
      }, 2300);
    };
    const next = () => {
      clearTimeout(timer);
      if (!waiting) return;
      add('<b>human</b> approved ✓');
      step = (step + 1) % steps.length;
      if (step === 0) { steps.forEach(s => s.classList.remove('is-done')); add('<b>cycle</b> complete · restarting'); }
      setTimeout(run, 400);
    };
    approve.addEventListener('click', next);
    onView([agents], run, { threshold: 0.3 });
  }

  /* ---------- coffee-shop comparison ---------- */
  const cBody = $('[data-compare-body]');
  if (cBody) {
    const items = [
      ['Espresso beans (kg)', 18.5, 16.2, 14.9],
      ['Oat milk (L)', 2.9, 2.6, 2.2],
      ['Cups 12oz (100)', 11.0, 9.4, 8.1],
      ['Lids (100)', 6.5, 5.9, 4.8],
      ['Pastry flour (kg)', 1.9, 1.7, 1.45],
    ];
    const qty = [12, 40, 6, 6, 20];
    const total = $('[data-compare-total]');
    const money = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let shown = 0;
    const render = mult => {
      let save = 0;
      cBody.innerHTML = items.map(([name, a, b, c], i) => {
        const q = qty[i] * mult, best = Math.min(b, c), s = (a - best) * q; save += s;
        return `<tr><td>${name}</td><td>${money(a * q)}</td><td class="${b <= c ? 'best' : ''}">${money(b * q)}</td><td class="${c < b ? 'best' : ''}">${money(c * q)}</td><td>−${money(s)}</td></tr>`;
      }).join('');
      const from = shown, to = save, t0 = performance.now();
      const tick = now => { const p = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - p, 3); total.textContent = money(from + (to - from) * e); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); shown = save;
    };
    $$('[data-basket]').forEach(b => b.addEventListener('click', () => {
      $$('[data-basket]').forEach(o => o.classList.toggle('is-on', o === b));
      render(Number(b.dataset.basket));
    }));
    render(1);
  }

  /* ---------- transcript, OS tiles, lifecycle loops ---------- */
  const tr = $('[data-transcript]');
  if (tr) onView([tr], () => {
    const msgs = $$('.msg', tr); let i = 0;
    const show = () => {
      if (i < msgs.length) { msgs[i++].classList.add('is-in'); setTimeout(show, 900); }
      else setTimeout(() => { msgs.forEach(m => m.classList.remove('is-in')); i = 0; setTimeout(show, 700); }, 4000);
    };
    show();
  });
  const os = $('[data-os]');
  if (os) onView([os], () => {
    const tiles = $$('span', os); let i = 0;
    const t = setInterval(() => { if (i >= tiles.length) return clearInterval(t); tiles[i++].classList.add('is-on'); }, 140);
  });
  const cycle = $('[data-cycle]');
  if (cycle) onView([cycle], () => {
    const li = $$('li', cycle); let i = 0;
    const step = () => { li.forEach((l, j) => l.classList.toggle('is-on', j === i)); i = (i + 1) % li.length; };
    step(); setInterval(step, 1300);
    li.forEach((l, j) => l.addEventListener('mouseenter', () => { i = j; step(); }));
  });

  /* ---------- Capital One table filter ---------- */
  const itable = $('[data-itable]');
  if (itable) $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
    $$('[data-filter]').forEach(o => o.classList.toggle('is-on', o === b));
    $$('tbody tr', itable).forEach(r => r.classList.toggle('is-hidden', b.dataset.filter !== 'all' && $('.st', r).textContent !== b.dataset.filter));
  }));

  /* ---------- dotted world map ---------- */
  const map = $('[data-map]');
  if (map) {
    const g = $('.map__dots', map), NS = 'http://www.w3.org/2000/svg';
    /* coarse continent blobs: [cx, cy, rx, ry] in a 600x260 frame */
    const land = [[120, 80, 70, 45], [150, 125, 35, 30], [185, 185, 30, 50], [300, 70, 35, 28], [310, 150, 38, 55], [400, 80, 90, 45], [440, 140, 35, 25], [500, 205, 35, 20], [215, 40, 25, 15], [490, 75, 20, 25]];
    const inside = (x, y) => land.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
    const hubs = [[132, 98], [180, 188], [300, 78], [468, 120]];
    for (let x = 6; x < 600; x += 9) for (let y = 6; y < 260; y += 9) {
      if (!inside(x, y)) continue;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 2.2);
      if (hubs.some(([hx, hy]) => Math.hypot(hx - x, hy - y) < 26) && Math.random() > .45) c.classList.add('is-lit');
      g.appendChild(c);
    }
    if (!reduced) {
      const all = $$('circle', g);
      setInterval(() => { const c = all[Math.floor(Math.random() * all.length)]; c.classList.add('is-lit'); setTimeout(() => c.classList.remove('is-lit'), 1600); }, 260);
    }
  }

  /* ---------- industries hover direction ---------- */
  $$('[data-ind] li').forEach(li => {
    li.addEventListener('mouseenter', e => {
      const r = li.getBoundingClientRect();
      li.classList.toggle('from-top', e.clientY < r.top + r.height / 2);
      requestAnimationFrame(() => li.classList.add('is-hover'));
    });
    li.addEventListener('mouseleave', e => {
      const r = li.getBoundingClientRect();
      li.classList.toggle('from-top', e.clientY < r.top + r.height / 2);
      li.classList.remove('is-hover');
    });
  });

  /* ---------- project sub-nav ---------- */
  const pnav = $('[data-pnav]');
  if (pnav) {
    const links = $$('a', pnav);
    const setActive = id => links.forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) pnav.scrollTo({ left: a.offsetLeft - 20, behavior: 'smooth' });
    });
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    $$('.case').forEach(c => io.observe(c));
  }

  /* ---------- misc ---------- */
  $('[data-totop]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));
  const yr = $('[data-year]'); if (yr) yr.textContent = new Date().getFullYear();

  /* ==========================================================
     GSAP motion
     ========================================================== */
  if (!hasGsap || reduced) {
    $$('.line__path').forEach(p => p.style.strokeDasharray = 'none');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('has-gsap');
  const ez = 'expo.out';

  /* line charts draw on enter */
  $$('.line__path').forEach(p => {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(p, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', scrollTrigger: { trigger: p, start: 'top 85%' } });
  });

  /* section headings / reveals / gridlines */
  $$('.split-lines').forEach(el => {
    gsap.to($$('.w > span', el), { y: 0, yPercent: 0, duration: 1.1, ease: ez, stagger: .035, scrollTrigger: { trigger: el, start: 'top 88%' } });
  });
  ScrollTrigger.batch('.reveal:not(.hero .reveal)', {
    start: 'top 90%',
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: ez, stagger: .08 }),
  });
  $$('.section .gridlines, .footer .gridlines').forEach(g => {
    gsap.from($$('i', g), { scaleY: 0, duration: 1.6, ease: 'power3.inOut', stagger: .08, scrollTrigger: { trigger: g.parentElement, start: 'top 85%' } });
  });

  /* staggered blocks */
  const stag = (sel, trig, vars = {}) => $$(trig).forEach(t => {
    const els = $$(sel, t); if (!els.length) return;
    gsap.from(els, { y: 40, opacity: 0, duration: 1, ease: ez, stagger: .08, ...vars, scrollTrigger: { trigger: t, start: 'top 82%' } });
  });
  stag('.stat:not(.stat--empty)', '.stats');
  stag('.acc__item', '.acc');
  stag('.step', '.steps');
  stag('.ind li', '.ind');
  stag('.acard', '.award-grid');
  stag('.kpis > div', '.case');
  stag('.panel', '.dash', { y: 30, scale: .97 });
  stag('.logo:not(.dup)', '.trusted', { y: 20 });
  stag('.foot > *', '.foot');

  /* radar + labs screens subtle scale-in */
  gsap.from('.radar', { clipPath: 'inset(12% 12% 12% 12%)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.radar', start: 'top 80%' } });
  $$('.lab .screen').forEach(s => gsap.from(s, { y: 60, opacity: 0, rotate: 1.5, duration: 1.2, ease: ez, scrollTrigger: { trigger: s, start: 'top 85%' } }));
  $$('.dash').forEach(d => gsap.from(d, { clipPath: 'inset(0 0 100% 0)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: d, start: 'top 85%' } }));

  /* process progress bar scrubbed by scroll */
  gsap.to('.process__progress span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top 70%', end: 'bottom 70%', scrub: .6 } });

  /* hero parallax */
  gsap.to('.hero__portrait', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__name', { yPercent: 40, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  if (finePointer) {
    const hero = $('.hero');
    const qx = gsap.quickTo('.hero__glow', 'x', { duration: 1.2, ease: 'power3' });
    const qy = gsap.quickTo('.hero__glow', 'y', { duration: 1.2, ease: 'power3' });
    const px = gsap.quickTo('.portrait', 'x', { duration: 1.4, ease: 'power3' });
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect(), dx = (e.clientX - r.width / 2) / r.width, dy = (e.clientY - r.height / 2) / r.height;
      qx(dx * 160); qy(dy * 120); px(dx * -14);
    });
  }

  /* footer giant name */
  gsap.from('.foot__name .ch', { yPercent: 100, opacity: 0, duration: 1.2, ease: ez, stagger: .05, scrollTrigger: { trigger: '.foot__name', start: 'top 95%' } });

  /* case-study toggle animation */
  $$('.story').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) gsap.from($$('.story__block', d), { y: 24, opacity: 0, duration: .8, ease: ez, stagger: .06 });
    ScrollTrigger.refresh();
  }));

  /* ---------- intro sequence ---------- */
  const heroIn = () => {
    const tl = gsap.timeline({ defaults: { ease: ez } });
    tl.from('.hero .gridlines i', { scaleY: 0, duration: 1.4, stagger: .08, ease: 'power3.inOut' }, 0)
      .from('.hero__name .ch', { yPercent: 110, rotate: 6, duration: 1.4, stagger: .05 }, .1)
      .from('.portrait', { yPercent: 18, opacity: 0, scale: 1.06, duration: 1.6 }, .35)
      .to('.hero .reveal', { opacity: 1, y: 0, duration: 1, stagger: .08 }, .7)
      .from('.hero__skills li', { x: 40, opacity: 0, duration: 1, stagger: .06 }, .75)
      .from('.hero__feature', { y: 30, opacity: 0, duration: 1 }, .9)
      .from('.nav__inner', { y: -30, opacity: 0, duration: 1 }, .6)
      .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.1);
  };
  gsap.set($$('.hero__name .ch'), { display: 'inline-block' });

  const loader = $('.loader');
  if (loader && !sessionStorageSafe('ellen-seen')) {
    const count = $('[data-loader-count]', loader), bar = $('.loader__bar span', loader);
    const state = { v: 0 };
    const ready = Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise(r => setTimeout(r, 1300)),
    ]);
    gsap.to(state, { v: 92, duration: 1.3, ease: 'power2.out', onUpdate: () => { count.textContent = Math.round(state.v); bar.style.transform = `scaleX(${state.v / 100})`; } });
    ready.then(() => {
      gsap.timeline()
        .to(state, { v: 100, duration: .35, ease: 'power1.out', onUpdate: () => { count.textContent = Math.round(state.v); bar.style.transform = `scaleX(${state.v / 100})`; } })
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '+=.1')
        .add(heroIn, '-=.55')
        .add(() => loader.remove());
    });
    sessionStorageSafe('ellen-seen', '1');
  } else {
    loader?.remove();
    heroIn();
  }

  function sessionStorageSafe(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; }
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
