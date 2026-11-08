(function(){
  "use strict";

  document.documentElement.classList.add('js');

  // ---------- Performance: Full / Lite ----------
  // Full effects by default. Lite switches on in two ways:
  //  - the footer "Visual effects" switch: the visitor's choice, remembered
  //    and always respected (the automatic check then stays out of the way);
  //  - otherwise, a frame-rate check (bottom of this file) that finds this
  //    machine and browser can't keep up. That result only lasts for the
  //    current visit, so every visit gets a fresh check.
  var perfRoot = document.documentElement;
  var perfPref = null;
  try { perfPref = localStorage.getItem('perfMode'); } catch (e) {}
  var setLite = function(on, chosen){
    perfRoot.classList.toggle('perf-lite', on);
    try {
      if (chosen) localStorage.setItem('perfMode', on ? 'lite' : 'full');
      else if (on) sessionStorage.setItem('perfLite', '1');
    } catch (e) {}
    var t = document.getElementById('perfToggle');
    if (t) {
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
      t.querySelector('b').textContent = on ? 'Lite' : 'Full';
    }
  };
  var perfAutoLite = false;
  try { perfAutoLite = sessionStorage.getItem('perfLite') === '1'; } catch (e) {}
  if (perfPref === 'lite' || (!perfPref && perfAutoLite)) perfRoot.classList.add('perf-lite');

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Footer "last updated": the page's Last-Modified date from the server
  // (on GitHub Pages, the deploy time). Browsers report "now" when the
  // server sends no date, so in that case the line stays hidden.
  var updatedEl = document.getElementById('lastUpdated');
  if (updatedEl) {
    var modified = new Date(document.lastModified);
    if (!isNaN(modified) && Date.now() - modified.getTime() > 60 * 1000) {
      var iso = modified.getFullYear() + '-' +
        String(modified.getMonth() + 1).padStart(2, '0') + '-' +
        String(modified.getDate()).padStart(2, '0');
      var timeEl = updatedEl.querySelector('time');
      timeEl.textContent = iso;
      timeEl.setAttribute('datetime', iso);
      updatedEl.hidden = false;
    }
  }

  // ---------- Ticker: seamless loop at any screen width ----------
  // The CSS loop slides the track left by half its width, so each half
  // must be at least as wide as the screen or a blank gap scrolls in.
  // Repeat the phrases until it is, keep the speed constant in px/s, and
  // tie the position to the clock so it carries on across page loads.
  (function tickerLoop(){
    var ticker = document.querySelector('.ticker');
    var track = ticker && ticker.querySelector('.ticker-track');
    if (!track || !track.children.length) return;

    var SPEED = 40;   // px per second, about the original pace
    var phrases = Array.prototype.slice.call(track.children, 0, track.children.length / 2);
    var lastWidth = -1;

    function appendSet(){
      phrases.forEach(function(p){ track.appendChild(p.cloneNode(true)); });
    }

    function build(){
      track.textContent = '';
      appendSet();
      var setWidth = track.getBoundingClientRect().width;
      if (!setWidth) return;
      var copies = Math.max(1, Math.ceil(ticker.clientWidth / setWidth));
      for (var i = 1; i < copies * 2; i++) appendSet();

      var duration = (setWidth * copies) / SPEED;
      track.style.animationDuration = duration.toFixed(2) + 's';
      track.style.animationDelay = (-(Date.now() / 1000) % duration).toFixed(2) + 's';
      lastWidth = ticker.clientWidth;
    }

    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    var resizeTimer = null;
    window.addEventListener('resize', function(){
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function(){
        if (ticker.clientWidth !== lastWidth) build();
      }, 150);
    });
  })();

  // ---------- Boot sequence (first page of a tab session, skippable) ----------
  (function bootSequence(){
    var screen = document.getElementById('bootScreen');
    if (!screen) return;

    var alreadySeen = false;
    try { alreadySeen = !!sessionStorage.getItem('bootSeen'); } catch (e) {}
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { sessionStorage.setItem('bootSeen', '1'); } catch (e) {}

    if (alreadySeen || reduceMotion) {
      screen.style.display = 'none';
      return;
    }

    // The CRT turn-on itself is pure CSS and starts with the page.
    // This only removes the overlay when it ends, or fades it out early
    // on a click or key press.
    var fallback = setTimeout(done, 1200);
    function done(){
      clearTimeout(fallback);
      screen.style.display = 'none';
      screen.removeEventListener('animationend', onEnd);
      document.removeEventListener('keydown', skip);
      document.removeEventListener('click', skip);
    }
    function onEnd(e){
      if (e.target === screen && e.animationName === 'crtGlow') done();
    }
    function skip(){
      screen.classList.add('hide');
      setTimeout(done, 180);
    }

    screen.addEventListener('animationend', onEnd);
    document.addEventListener('keydown', skip);
    document.addEventListener('click', skip);
  })();

  // ---------- Konami code easter egg ----------
  (function konamiEgg(){
    var toast = document.getElementById('konamiToast');
    if (!toast) return;
    var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var pos = 0;
    var toastTimer = null;

    document.addEventListener('keydown', function(e){
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = (key === seq[pos]) ? pos + 1 : (key === seq[0] ? 1 : 0);

      if (pos === seq.length) {
        pos = 0;
        var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduceMotion) {
          document.body.classList.remove('konami-active');
          void document.body.offsetWidth;
          document.body.classList.add('konami-active');
        }
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 2600);
      }
    });
  })();

  // ---------- Scrolling tab title while the tab is unfocused ----------
  (function tabTitleMarquee(){
    var marqueeText = '◆ ERIC RANGEL ◆ PERSONAL SITE ◆ ';
    var originalTitle = document.title;
    var visibleLen = Math.min(32, marqueeText.length);
    var pos = 0;
    var timer = null;

    function tick(){
      var doubled = marqueeText + marqueeText;
      document.title = doubled.slice(pos, pos + visibleLen);
      pos = (pos + 1) % marqueeText.length;
    }

    document.addEventListener('visibilitychange', function(){
      if (document.hidden) {
        pos = 0;
        clearInterval(timer);
        timer = setInterval(tick, 320);
      } else {
        clearInterval(timer);
        timer = null;
        document.title = originalTitle;
      }
    });
  })();

  // ---------- Theme toggle, with a CRT-glitch transition ----------
  var root = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  var themeFx = document.getElementById('themeFx');

  if (themeToggle && themeFx) {
    function reflectTheme(theme){
      themeToggle.dataset.state = theme;
      themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      var label = themeToggle.querySelector('.tt-label');
      if (label) label.textContent = theme.toUpperCase();
    }

    // Sync the toggle control to whatever the pre-paint script already set.
    reflectTheme(root.getAttribute('data-theme') || 'light');

    function setTheme(theme, animate){
      var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function commit(){
        root.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) {}
        try { document.cookie = 'theme=' + theme + '; path=/; max-age=31536000; SameSite=Lax'; } catch (e) {}
        reflectTheme(theme);
      }
      if (!animate || reduceMotion) {
        commit();
        return;
      }
      themeFx.classList.remove('active');
      void themeFx.offsetWidth; // restart the animation if it's mid-flight
      themeFx.classList.add('active');
      setTimeout(commit, 240);
      setTimeout(function(){ themeFx.classList.remove('active'); }, 520);
    }

    themeToggle.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      setTheme(next, true);
    });
  }

  // ---------- Mobile nav toggle ----------
  var navToggleBtn = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if (navToggleBtn && navList) {
    navToggleBtn.addEventListener('click', function(){
      var open = navList.classList.toggle('open');
      navToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navList.addEventListener('click', function(e){
      if (e.target.tagName === 'A') {
        navList.classList.remove('open');
        navToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- Scroll-reveal (loading bar + fade) ----------
  var revealTargets = document.querySelectorAll('.reveal, .reveal-item');
  // Give each skill tag its position so they pop in one after another.
  document.querySelectorAll('.skill-card .tag-row').forEach(function(row){
    Array.prototype.forEach.call(row.children, function(tag, i){ tag.style.setProperty('--i', i); });
  });
  if ('IntersectionObserver' in window) {
    // Items that come into view in the same moment (a row of cards,
    // a grid of skills) open one after another instead of all at once.
    var io = new IntersectionObserver(function(entries){
      var n = 0;
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.style.setProperty('--reveal-delay', (n++ * 0.09) + 's');
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function(el){ io.observe(el); });
  } else {
    revealTargets.forEach(function(el){ el.classList.add('is-visible'); });
  }

  // ---------- Active nav link ----------
  // On the scrolling homepage, highlight by which section is in view.
  // On every other page, just mark the link matching this page's slug.
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a'));
  var currentPage = document.body.getAttribute('data-page') || '';

  if (currentPage === 'home') {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
    function setActive(id){
      navLinks.forEach(function(a){
        a.classList.toggle('active', a.getAttribute('data-nav') === id);
      });
    }
    if ('IntersectionObserver' in window) {
      var navIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) { setActive(entry.target.id); }
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function(s){ navIo.observe(s); });
    }
  } else if (currentPage) {
    navLinks.forEach(function(a){
      a.classList.toggle('active', a.getAttribute('data-nav') === currentPage);
    });
  }

  // ---------- Contact form (sends via Formspree — no backend required) ----------
  // Sign up at https://formspree.io, create a form, and paste its endpoint here.
  var CONTACT_ENDPOINT = 'https://formspree.io/f/mrpgnrzz';

  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  if (form && status) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (form.elements['hp'] && form.elements['hp'].value) return; // honeypot

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      status.classList.remove('ok', 'err');
      status.textContent = 'TRANSMITTING…';

      fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          name: form.elements['name'].value,
          email: form.elements['email'].value,
          message: form.elements['message'].value
        })
      })
        .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
        .then(function(result){
          if (result.ok) {
            status.textContent = 'TRANSMISSION RECEIVED. Thanks for reaching out, I\'ll reply soon.';
            status.classList.add('ok');
            form.reset();
          } else {
            var msg = result.data && result.data.errors && result.data.errors[0] && result.data.errors[0].message;
            status.textContent = msg || 'Transmission failed. Please try again.';
            status.classList.add('err');
          }
        })
        .catch(function(){
          status.textContent = 'Could not reach the mail service. Please email me directly instead.';
          status.classList.add('err');
        })
        .finally(function(){
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  // ---------- Hero pointer effects ----------
  // Glare: a light disc on the hero window's glass that follows the pointer.
  // Parallax: the aurora and the hero window shift by different amounts,
  // so they read as layers at different depths.
  // Performance: only `transform`/`translate` are written, straight onto
  // the few elements that move (no inherited CSS variables, so the rest of
  // the hero is never restyled), at most once per frame, and element
  // positions are measured on enter/scroll/resize instead of every move.
  var hero = document.querySelector('.hero');
  var heroFrame = document.querySelector('.hero-frame');
  if (hero && heroFrame) {
    // Pause the hero's looping animations while it's scrolled out of view.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(entries){
        hero.classList.toggle('is-offscreen', !entries[0].isIntersecting);
      }).observe(hero);
    }

    if (window.matchMedia('(hover: hover)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var aurora = hero.querySelector('.aurora');
      var glare = document.createElement('span');
      glare.className = 'glare';
      glare.setAttribute('aria-hidden', 'true');
      var glareDot = document.createElement('span');
      glareDot.className = 'glare-dot';
      glare.appendChild(glareDot);
      heroFrame.insertBefore(glare, heroFrame.firstChild);

      var heroRect = null, frameRect = null, queued = false, px = 0, py = 0, mx = 0, my = 0;
      var measure = function(){
        heroRect = hero.getBoundingClientRect();
        frameRect = heroFrame.getBoundingClientRect();
      };
      var invalidate = function(){ heroRect = null; };
      window.addEventListener('scroll', invalidate, { passive: true });
      window.addEventListener('resize', invalidate);

      var apply = function(){
        queued = false;
        if (perfRoot.classList.contains('perf-lite')) return;
        if (!heroRect) measure();
        px = ((mx - heroRect.left) / heroRect.width) * 2 - 1;
        py = ((my - heroRect.top) / heroRect.height) * 2 - 1;
        write(px, py);
        glareDot.style.transform = 'translate3d(' + (mx - frameRect.left) + 'px,' + (my - frameRect.top) + 'px,0)';
      };
      var write = function(x, y){
        if (aurora) aurora.style.transform = 'translate3d(' + (x * -16).toFixed(1) + 'px,' + (y * -10).toFixed(1) + 'px,0)';
        heroFrame.style.transform = 'translate3d(' + (x * -5).toFixed(1) + 'px,' + (y * -4).toFixed(1) + 'px,0)';
      };

      hero.addEventListener('pointerenter', measure);
      hero.addEventListener('pointermove', function(e){
        mx = e.clientX; my = e.clientY;
        if (!queued) { queued = true; requestAnimationFrame(apply); }
      });
      hero.addEventListener('pointerleave', function(){ write(0, 0); });
    }
  }

  // ---------- Experience Explorer window ----------
  // Folders filter the file list; selecting a row shows its entry in the
  // details pane. Arrow keys move the selection while a row has focus.
  var explorer = document.querySelector('.explorer');
  if (explorer) {
    var exRows = Array.prototype.slice.call(explorer.querySelectorAll('.ex-row'));
    var exFolders = Array.prototype.slice.call(explorer.querySelectorAll('.ex-folder'));
    var exCrumb = document.getElementById('exCrumb');

    var exSelect = function(row){
      exRows.forEach(function(r){ r.setAttribute('aria-pressed', r === row ? 'true' : 'false'); });
      explorer.querySelectorAll('.ex-detail').forEach(function(d){
        d.classList.toggle('is-active', row && d.id === row.getAttribute('data-target'));
      });
    };
    var exVisible = function(){ return exRows.filter(function(r){ return !r.hidden; }); };
    var exFilter = function(folder){
      var cat = folder.getAttribute('data-filter');
      exFolders.forEach(function(f){ f.setAttribute('aria-pressed', f === folder ? 'true' : 'false'); });
      exRows.forEach(function(r){ r.hidden = cat !== 'all' && r.getAttribute('data-cat') !== cat; });
      if (exCrumb) exCrumb.textContent = folder.childNodes[1].textContent.trim();
      var current = exRows.filter(function(r){ return r.getAttribute('aria-pressed') === 'true' && !r.hidden; })[0];
      exSelect(current || exVisible()[0]);
    };

    exRows.forEach(function(r){
      r.addEventListener('click', function(){ exSelect(r); });
      r.addEventListener('keydown', function(e){
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        var vis = exVisible(), i = vis.indexOf(r);
        var next = vis[i + (e.key === 'ArrowDown' ? 1 : -1)];
        if (next) { e.preventDefault(); next.focus(); exSelect(next); }
      });
    });
    exFolders.forEach(function(f){ f.addEventListener('click', function(){ exFilter(f); }); });
    exFilter(exFolders[0]);
  }

  // ---------- Taskbar tray clock: the visitor's local time ----------
  var tbClock = document.getElementById('tbClock');
  if (tbClock) {
    var tick = function(){
      var now = new Date();
      tbClock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      tbClock.setAttribute('datetime', now.toISOString());
      var tbDate = document.getElementById('tbDate');
      if (tbDate) tbDate.textContent = now.toLocaleDateString();
      // Wake again right at the next minute, not on a busy interval
      setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
  }

  // ---------- Sign-off "Restart": CRT power-off, back to the top, replay the start-up ----------
  var signoff = document.querySelector('.signoff');
  if (signoff && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(entries){
      signoff.classList.toggle('is-offscreen', !entries[0].isIntersecting);
    }).observe(signoff);
  }
  var powerOff = document.getElementById('powerOff');
  if (powerOff) {
    powerOff.addEventListener('click', function(){
      var root = document.documentElement;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, 0);
        return;
      }
      root.classList.add('is-shutting-down');
      setTimeout(function(){
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        root.style.scrollBehavior = '';
        // Replay the CRT turn-on: a fresh copy of the boot overlay restarts its animation
        var boot = document.getElementById('bootScreen');
        if (boot) {
          var fresh = boot.cloneNode(true);
          fresh.classList.remove('hide');
          fresh.style.display = 'block';
          boot.parentNode.replaceChild(fresh, boot);
          setTimeout(function(){ fresh.style.display = 'none'; }, 950);
        }
        root.classList.remove('is-shutting-down');
      }, 520);
    });
  }

  // ---------- Performance: footer switch ----------
  var perfToggle = document.getElementById('perfToggle');
  if (perfToggle) {
    setLite(perfRoot.classList.contains('perf-lite'), false);
    perfToggle.addEventListener('click', function(){
      perfPref = 'chosen';
      setLite(!perfRoot.classList.contains('perf-lite'), true);
    });
  }

  // ---------- Performance: frame-rate check ----------
  // A few seconds after load (once the intro has played), time ~2 seconds
  // of frames while the page is visible. Only a sustained slowdown (median
  // frame over 25ms, i.e. under ~40fps) switches this visit to Lite.
  if (!perfPref && !perfRoot.classList.contains('perf-lite') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener('load', function(){
      setTimeout(function(){
        if (document.visibilityState !== 'visible') return;
        var times = [], last = 0;
        (function frame(now){
          if (last) times.push(now - last);
          last = now;
          if (times.length < 120 && document.visibilityState === 'visible') { requestAnimationFrame(frame); return; }
          if (times.length < 90) return;
          times.sort(function(a, b){ return a - b; });
          // A choice made with the switch meanwhile always wins
          if (!perfPref && times[Math.floor(times.length / 2)] > 25) setLite(true, false);
        })(0);
      }, 3000);
    });
  }

})();
