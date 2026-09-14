(function(){
  "use strict";

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Retro hit counter (real, shared count via a free public counter API) ----------
  var hitCounterEl = document.getElementById('hitCounter');
  if (hitCounterEl) {
    fetch('https://countapi.mileshilliard.com/api/v1/hit/ericrangel-dev.portfolio-visits')
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (data && typeof data.value === 'number') {
          hitCounterEl.textContent = String(data.value).padStart(6, '0');
        }
      })
      .catch(function(){
        // Counter API unreachable — leave the default digits.
      });
  }

  // ---------- Boot sequence (once per tab session, skippable) ----------
  (function bootSequence(){
    var screen = document.getElementById('bootScreen');
    var lines = document.getElementById('bootLines');
    if (!screen || !lines) return;

    var alreadySeen = false;
    try { alreadySeen = !!sessionStorage.getItem('bootSeen'); } catch (e) {}
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function finish(){
      screen.classList.add('hide');
      try { sessionStorage.setItem('bootSeen', '1'); } catch (e) {}
      document.removeEventListener('keydown', finish);
      document.removeEventListener('click', finish);

      // The page "switches on" — same flicker sweep as the theme toggle,
      // plus a CRT unfold (squished bright line expanding to full height).
      var fx = document.getElementById('themeFx');
      var siteRoot = document.getElementById('siteRoot');
      if (fx) {
        fx.classList.remove('active');
        void fx.offsetWidth;
        fx.classList.add('active');
      }
      if (siteRoot) {
        siteRoot.classList.remove('crt-on');
        void siteRoot.offsetWidth;
        siteRoot.classList.add('crt-on');
      }

      setTimeout(function(){ screen.style.display = 'none'; }, 180);
      if (fx) setTimeout(function(){ fx.classList.remove('active'); }, 520);
      if (siteRoot) setTimeout(function(){ siteRoot.classList.remove('crt-on'); }, 620);
    }

    if (alreadySeen || reduceMotion) {
      screen.style.display = 'none';
      try { sessionStorage.setItem('bootSeen', '1'); } catch (e) {}
      return;
    }

    document.addEventListener('keydown', finish);
    document.addEventListener('click', finish);

    var script = [
      'PORTFOLIO.SYS v1.0',
      'INITIALIZING SYSTEM...',
      'LOADING MODULES: ABOUT / WORK / EXPERIENCE / SKILLS / CONTACT... OK',
      'ESTABLISHING CONNECTION...',
      'WELCOME, USER.'
    ];
    var out = '';
    var li = 0, ci = 0;

    function typeChar(){
      if (li >= script.length) { setTimeout(finish, 350); return; }
      var line = script[li];
      if (ci <= line.length) {
        lines.innerHTML = out + line.slice(0, ci) + '<span class="cur"></span>';
        ci++;
        setTimeout(typeChar, 14);
      } else {
        out += line + '\n';
        li++; ci = 0;
        setTimeout(typeChar, 160);
      }
    }
    typeChar();
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

  // ---------- System diagnostic readout (local browser info only) ----------
  (function sysDiagReadout(){
    var list = document.getElementById('sysDiag');
    if (!list) return;

    function detectBrowser(ua){
      var m;
      if (/Edg\//.test(ua)) { m = ua.match(/Edg\/([\d.]+)/); return 'Edge ' + (m ? m[1].split('.')[0] : ''); }
      if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) { m = ua.match(/Chrome\/([\d.]+)/); return 'Chrome ' + (m ? m[1].split('.')[0] : ''); }
      if (/Firefox\//.test(ua)) { m = ua.match(/Firefox\/([\d.]+)/); return 'Firefox ' + (m ? m[1].split('.')[0] : ''); }
      if (/Safari\//.test(ua) && /Version\//.test(ua)) { m = ua.match(/Version\/([\d.]+)/); return 'Safari ' + (m ? m[1].split('.')[0] : ''); }
      return 'Unknown';
    }

    var rows = [
      ['DISPLAY', screen.width + '×' + screen.height + ' @ ' + screen.colorDepth + '-bit'],
      ['VIEWPORT', window.innerWidth + '×' + window.innerHeight],
      ['BROWSER', detectBrowser(navigator.userAgent)],
      ['PLATFORM', navigator.platform || 'Unknown'],
      ['CORES', navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : '—'],
      ['LANGUAGE', navigator.language || 'Unknown'],
      ['CONNECTION', navigator.onLine ? 'ONLINE' : 'OFFLINE'],
      ['LOCAL TIME', '']
    ];

    list.innerHTML = rows.map(function(r){
      return '<dt>' + r[0] + '</dt><dd data-key="' + r[0] + '">' + r[1] + '</dd>';
    }).join('');

    var timeCell = list.querySelector('[data-key="LOCAL TIME"]');
    function tickClock(){
      if (!timeCell) return;
      timeCell.textContent = new Date().toLocaleTimeString();
    }
    tickClock();
    setInterval(tickClock, 1000);

    window.addEventListener('resize', function(){
      var vpCell = list.querySelector('[data-key="VIEWPORT"]');
      if (vpCell) vpCell.textContent = window.innerWidth + '×' + window.innerHeight;
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
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
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

})();
