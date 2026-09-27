(function () {
  document.documentElement.classList.add('js');

  /* header shade on scroll */
  var header = document.querySelector('.header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* mobile drawer */
  var btn = document.querySelector('.menu-btn');
  var drawer = document.querySelector('.drawer');
  if (btn && drawer) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* news list from data.js */
  var list = document.getElementById('news-list');
  if (list && window.AA_DATA) {
    var news = window.AA_DATA.news.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var INITIAL = 8;
    news.forEach(function (n, i) {
      var li = document.createElement('li');
      if (i >= INITIAL) li.className = 'is-hidden';
      li.innerHTML =
        '<a href="' + n.url + '" target="_blank" rel="noopener">' +
        '<time datetime="' + n.date.replace(/\//g, '-') + '">' + n.date + '</time>' +
        '<span class="t"></span>' +
        '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z"/></svg>' +
        '</a>';
      li.querySelector('.t').textContent = n.title;
      list.appendChild(li);
    });
    var more = document.getElementById('news-more');
    if (more) {
      if (news.length <= INITIAL) more.hidden = true;
      more.addEventListener('click', function () {
        list.querySelectorAll('.is-hidden').forEach(function (li) { li.classList.remove('is-hidden'); });
        more.hidden = true;
      });
    }
  }


  /* generic "show more" buttons */
  document.querySelectorAll('[data-reveal]').forEach(function (b) {
    var target = document.querySelector(b.getAttribute('data-reveal'));
    if (!target || !target.querySelector('.is-hidden')) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      target.querySelectorAll('.is-hidden').forEach(function (el) { el.classList.remove('is-hidden'); });
      b.hidden = true;
    });
  });

  /* YouTube facade: load iframe on click */
  document.querySelectorAll('.yt').forEach(function (el) {
    el.addEventListener('click', function () {
      var id = el.getAttribute('data-id');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = el.getAttribute('aria-label') || 'YouTube video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      el.innerHTML = '';
      el.appendChild(f);
    }, { once: true });
  });

  /* reveal on scroll */
  var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function show(el) { el.classList.add('is-in'); }
  function inView(el) { var r = el.getBoundingClientRect(); return r.top < window.innerHeight * 0.96 && r.bottom > 0; }
  /* anything already on screen is shown immediately (no observer round-trip) */
  items.forEach(function (el) { if (inView(el)) show(el); });
  var rest = items.filter(function (el) { return !el.classList.contains('is-in'); });
  if ('IntersectionObserver' in window && rest.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    rest.forEach(function (el) { io.observe(el); });
    /* safety net: never leave content hidden */
    var sweep = function () { rest.forEach(function (el) { if (inView(el)) show(el); }); };
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 800);
  } else {
    rest.forEach(show);
  }

  /* current nav */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav a, .drawer a.link').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (href === path || (path === 'index.html' && href === './')) a.setAttribute('aria-current', 'page');
  });
})();

/* CoCoLab: contact form */
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var type = new URLSearchParams(location.search).get('type');
  if (type && form.type.querySelector('option[value="' + type + '"]')) form.type.value = type;
  var err = document.getElementById('form-error');
  var done = document.getElementById('form-done');
  function fail(msg) { err.textContent = msg; err.hidden = false; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var bad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var ok = el.type === 'checkbox' ? el.checked : (el.value.trim() !== '' && (el.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())));
      if (el.type !== 'checkbox') el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = el;
    });
    if (bad) { fail(bad.type === 'checkbox' ? 'プライバシーポリシーへの同意が必要です。' : '必須項目を正しくご入力ください。'); bad.focus(); return; }
    var endpoint = form.getAttribute('data-endpoint');
    var mailto = form.getAttribute('data-mailto');
    var data = new FormData(form);
    data.set('type', form.type.options[form.type.selectedIndex].text);
    if (endpoint) {
      fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(); form.hidden = true; done.hidden = false; done.scrollIntoView({ block: 'center' }); })
        .catch(function () { fail('送信に失敗しました。時間をおいて再度お試しください。'); });
    } else if (mailto) {
      var body = ['お問い合わせ種別：' + data.get('type'), '会社名：' + data.get('company'), 'お名前：' + data.get('name'), 'メール：' + data.get('email'), '電話：' + data.get('tel'), '', data.get('body')].join('\n');
      location.href = 'mailto:' + mailto + '?subject=' + encodeURIComponent('【HPお問い合わせ】' + data.get('type')) + '&body=' + encodeURIComponent(body);
    } else {
      fail('現在、フォームの送信先を準備中です。公開までしばらくお待ちください。');
    }
  });
})();
