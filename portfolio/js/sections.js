'use strict';

/* ============================================================
   CASE STUDY TABS
   ============================================================ */
(function initCsTabs() {
  document.querySelectorAll('.cs-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.cs-tab').forEach(function(t) {
        t.setAttribute('aria-selected', 'false');
      });
      tab.setAttribute('aria-selected', 'true');
      var target = tab.dataset.tab;
      document.querySelectorAll('.cs-panel').forEach(function(p) {
        if (p.dataset.panel === target) p.setAttribute('data-active', '');
        else p.removeAttribute('data-active');
      });
    });
  });
})();

/* ============================================================
   NOW BLOCK — live date
   ============================================================ */
(function initNowDate() {
  var el = document.getElementById('nowDate');
  if (!el) return;
  var d = new Date();
  el.textContent = d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).toUpperCase();
})();

/* ============================================================
   TECH STACK GRID — viewport-triggered staggered reveal
   ============================================================ */
(function initStack() {
  var grid = document.getElementById('stackGrid');
  if (!grid) return;
  var cells = Array.from(grid.querySelectorAll('.stack-cell'));
  var STAGGER = 110;

  function revealAll() {
    grid.classList.add('in-view');
    cells.forEach(function(cell, i) {
      setTimeout(function() { cell.classList.add('revealed'); }, i * STAGGER);
      setTimeout(function() { cell.classList.add('done'); }, i * STAGGER + 700);
    });
  }

  if (!('IntersectionObserver' in window)) { revealAll(); return; }

  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { revealAll(); obs.disconnect(); }
    });
  }, { threshold: 0.15 });
  obs.observe(grid);
})();

/* ============================================================
   PIPELINE VIZ — AML investigation demo
   ============================================================ */
(function initPipeline() {
  var kafkaEl   = document.getElementById('kafkaEvents');
  var ledgerEl  = document.getElementById('ledgerEvents');
  var statRecv  = document.getElementById('statRecv');
  var statDups  = document.getElementById('statDups');
  var statWrites = document.getElementById('statWrites');
  var statVol   = document.getElementById('statVol');
  var statP99   = document.getElementById('statP99');
  if (!kafkaEl) return;

  var seenKeys = new Set();
  var lastKey = null;
  var recv = 0, dups = 0, writes = 0, totalCost = 0, lastLatency = 0;
  var MAX_EVENTS = 8;

  var TRIGGERS = ['velocity_breach', 'round_trip', 'watchlist_hit', 'ml_score_0.' + Math.floor(77 + Math.random() * 18)];
  var VERDICTS = [
    { verdict: 'SUSPICIOUS', confidence: 0.87, recommendation: 'file_SAR', hops: 3 },
    { verdict: 'CLEAN',      confidence: 0.91, recommendation: 'close_clean', hops: 1 },
  ];

  function txnId() {
    return 'TXN_' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function pushEvent(container, html, cls) {
    var div = document.createElement('div');
    div.className = 'pipe-event ' + (cls || '');
    div.innerHTML = html;
    container.prepend(div);
    while (container.children.length > MAX_EVENTS) container.lastChild.remove();
  }

  function updateStats() {
    statRecv.textContent   = recv;
    statDups.textContent   = dups;
    statWrites.textContent = writes;
    statVol.textContent    = '$' + totalCost.toFixed(4);
    statP99.textContent    = lastLatency ? lastLatency + ' ms' : '— ms';
  }

  function flagTransaction(forceDup) {
    var key = (forceDup && lastKey) ? lastKey : txnId();
    var trigger = TRIGGERS[Math.floor(Math.random() * TRIGGERS.length)];
    var riskScore = (0.76 + Math.random() * 0.18).toFixed(2);
    lastKey = key;
    recv++;

    pushEvent(kafkaEl,
      '<div class="pipe-event-row">' +
        '<span class="pipe-event-id">txn: ' + key + '</span>' +
        '<span class="pipe-event-amount">risk ' + riskScore + '</span>' +
      '</div>' +
      '<div class="pipe-event-row">' +
        '<span class="pipe-event-status">offset ' + (recv * 7 + 100) + '</span>' +
        '<span class="pipe-event-id">' + trigger + '</span>' +
      '</div>'
    );

    setTimeout(function() {
      var isDup = seenKeys.has(key);
      if (isDup) {
        dups++;
        pushEvent(ledgerEl,
          '<div class="pipe-event-row">' +
            '<span class="pipe-event-id">txn: ' + key + '</span>' +
            '<span class="pipe-event-amount" style="text-decoration:line-through;">BLOCKED</span>' +
          '</div>' +
          '<div class="pipe-event-row">' +
            '<span class="pipe-event-status dup">MUTEX BLOCKED · already investigating</span>' +
            '<span class="pipe-event-id">0.2ms</span>' +
          '</div>',
          'duplicate'
        );
      } else {
        seenKeys.add(key);
        writes++;
        var v = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
        var cost = 0.0003 + Math.random() * 0.0001;
        totalCost += cost;
        lastLatency = Math.floor(4800 + Math.random() * 3000);
        pushEvent(ledgerEl,
          '<div class="pipe-event-row">' +
            '<span class="pipe-event-id">txn: ' + key + '</span>' +
            '<span class="pipe-event-amount">' + v.verdict + ' · conf ' + v.confidence + '</span>' +
          '</div>' +
          '<div class="pipe-event-row">' +
            '<span class="pipe-event-status ok">RESOLVED · ' + v.recommendation + ' · ' + v.hops + ' hops</span>' +
            '<span class="pipe-event-id">' + lastLatency + 'ms</span>' +
          '</div>',
          'committed'
        );
      }
      updateStats();
    }, 800);
    updateStats();
  }

  document.getElementById('pipeSend').addEventListener('click', function() { flagTransaction(false); });
  document.getElementById('pipeDup').addEventListener('click', function() { flagTransaction(true); });
  document.getElementById('pipeReset').addEventListener('click', function() {
    seenKeys.clear(); lastKey = null;
    recv = dups = writes = totalCost = lastLatency = 0;
    kafkaEl.innerHTML = ''; ledgerEl.innerHTML = '';
    statP99.textContent = '— ms';
    updateStats();
  });

  setTimeout(function() { flagTransaction(false); }, 400);
})();

/* ============================================================
   SECTION HEADINGS — vertical slide-up reveal on scroll
   ============================================================ */
(function initSectionHeadings() {
  var els = Array.from(document.querySelectorAll('.ps-section-label, .ps-section-title'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(el) { el.classList.add('in-view'); });
    return;
  }
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        var delay = e.target.classList.contains('ps-section-title') ? 120 : 0;
        setTimeout(function() { e.target.classList.add('in-view'); }, delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function(el) { obs.observe(el); });
})();

/* ============================================================
   ⌘K COMMAND PALETTE — removed
   ============================================================ */
(function initCmdk() {
  if (true) return;

  var COMMANDS = [
    { group: 'Navigate', icon: '◧', label: 'Go to About',          action: function() { goTo('about'); } },
    { group: 'Navigate', icon: '◨', label: 'Go to Tech Stack',     action: function() { goTo('stack'); } },
    { group: 'Navigate', icon: '◧', label: 'Go to Projects',       action: function() { goTo('projects'); } },
    { group: 'Navigate', icon: '◨', label: 'Go to Case Study',     action: function() { goTo('case-study'); } },
    { group: 'Navigate', icon: '◧', label: 'Go to Architecture',   action: function() { goTo('architecture'); } },
    { group: 'Navigate', icon: '◨', label: 'Go to Pipeline Demo',  action: function() { goTo('pipeline'); } },
    { group: 'Navigate', icon: '◧', label: 'Go to /Now',           action: function() { goTo('now'); } },
    { group: 'Navigate', icon: '◨', label: 'Go to Contact',        action: function() { goTo('contact'); } },
    { group: 'Actions',  icon: '@', label: 'Copy email — ayushsam3@gmail.com', action: function() { copyText('ayushsam3@gmail.com'); } },
    { group: 'Actions',  icon: '↓', label: 'Download résumé (PDF)', action: function() { alert('Wire to /resume.pdf'); closeCmdk(); } },
    { group: 'Actions',  icon: '◐', label: 'Toggle theme',          action: function() { var btn = document.getElementById('theme-toggle'); if (btn) btn.click(); closeCmdk(); } },
    { group: 'Links',    icon: '↗', label: 'Open GitHub — Ash-bot19', action: function() { window.open('https://github.com/Ash-bot19', '_blank'); closeCmdk(); } },
    { group: 'Links',    icon: '↗', label: 'Open LinkedIn',           action: function() { window.open('https://linkedin.com/in/ayush-samantaray', '_blank'); closeCmdk(); } },
  ];

  var filtered = COMMANDS;
  var activeIdx = 0;

  function goTo(id) {
    closeCmdk();
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function copyText(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    toast('Copied: ' + text);
    closeCmdk();
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'ps-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 1800);
  }

  function render() {
    var q = input.value.toLowerCase().trim();
    filtered = q
      ? COMMANDS.filter(function(c) { return c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q); })
      : COMMANDS;
    activeIdx = 0;

    if (!filtered.length) {
      listEl.innerHTML = '<div class="cmdk-empty">No matches.</div>';
      return;
    }
    var html = '';
    var lastGroup = null;
    filtered.forEach(function(c, i) {
      if (c.group !== lastGroup) {
        html += '<div class="cmdk-group">' + c.group + '</div>';
        lastGroup = c.group;
      }
      html += '<div class="cmdk-item' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' +
        '<div class="cmdk-item-icon">' + c.icon + '</div>' +
        '<div class="cmdk-item-text">' + c.label + '</div>' +
        '</div>';
    });
    listEl.innerHTML = html;
    listEl.querySelectorAll('.cmdk-item').forEach(function(el) {
      el.addEventListener('mouseenter', function() { setActive(parseInt(el.dataset.i)); });
      el.addEventListener('click', function() { filtered[parseInt(el.dataset.i)].action(); });
    });
  }

  function setActive(i) {
    activeIdx = i;
    listEl.querySelectorAll('.cmdk-item').forEach(function(el, idx) {
      el.classList.toggle('active', idx === activeIdx);
    });
  }

  function openCmdk() {
    overlay.setAttribute('data-open', '');
    input.value = '';
    render();
    setTimeout(function() { input.focus(); }, 30);
  }
  function closeCmdk() {
    overlay.removeAttribute('data-open');
  }

  document.querySelectorAll('[data-cmdk-open]').forEach(function(b) {
    b.addEventListener('click', openCmdk);
  });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeCmdk(); });
  input.addEventListener('input', render);

  window.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); openCmdk(); return;
    }
    if (!overlay.hasAttribute('data-open')) return;
    if (e.key === 'Escape')    { e.preventDefault(); closeCmdk(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (filtered[activeIdx]) filtered[activeIdx].action(); }
  });
})();
