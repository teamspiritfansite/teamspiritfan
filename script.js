// Minimal JS: mobile nav toggle and play buttons
document.addEventListener('DOMContentLoaded', function(){
  var toggle = document.querySelector('.nav-toggle');
  var header = document.querySelector('.site-header');
  var nav = document.querySelector('.main-nav');
  if(toggle && header){
    toggle.addEventListener('click', function(){
      header.classList.toggle('nav-open');
    });
  }

  // close mobile nav when clicking a link
  if(nav){
    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ header.classList.remove('nav-open'); });
    });
  }

  // Clicking the header logo should return the user to the top of the page
  var logoEl = document.querySelector('.logo');
  if(logoEl){
    // indicate interactivity
    logoEl.style.cursor = 'pointer';
    logoEl.addEventListener('click', function(ev){
      ev.preventDefault();
      try{
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }catch(e){
        // fallback
        window.scrollTo(0,0);
      }
    });
  }

  // --- Confetti / firework effect ---
  (function confettiModule(){
    var canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if(!ctx) return;

    var DPR = window.devicePixelRatio || 1;
    function resize(){
      canvas.width = Math.max(1, Math.floor(window.innerWidth * DPR));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * DPR));
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(DPR, DPR);
    }
    resize();
    window.addEventListener('resize', function(){ DPR = window.devicePixelRatio || 1; resize(); });

    // small particle system
    var particles = [];
    var raf = null;

    var COLORS = [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c39ff', getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#cfa3ff', '#ffd166', '#ffffff'];

    function random(min,max){ return Math.random()*(max-min)+min }

    function spawnBurst(x,y,count){
      for(var i=0;i<count;i++){
        var angle = random(0, Math.PI*2);
        var speed = random(2,9);
        var size = Math.round(random(6,14));
        particles.push({
          x: x + random(-8,8),
          y: y + random(-8,8),
          vx: Math.cos(angle)*speed + random(-1,1),
          vy: Math.sin(angle)*speed + random(-2,2),
          life: random(900,1700),
          born: performance.now(),
          size: size,
          color: COLORS[Math.floor(Math.random()*COLORS.length)],
          rotate: random(0,Math.PI*2),
          angularV: random(-0.06,0.06)
        });
      }
      // ensure animation loop runs
      if(!raf) loop();
    }

    function loop(){
      raf = requestAnimationFrame(loop);
      var now = performance.now();
      // clear (use rgba so we don't fully erase quickly for streaky effect)
      ctx.clearRect(0,0,canvas.width/DPR, canvas.height/DPR);
      // draw and update
      for(var i=particles.length-1;i>=0;i--){
        var p = particles[i];
        var age = now - p.born;
        if(age > p.life){ particles.splice(i,1); continue; }
        // physics
        p.vy += 0.06; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotate += p.angularV;
        var t = age / p.life;
        var alpha = 1 - t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotate);
        // draw rectangle particle
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
      if(particles.length===0){ cancelAnimationFrame(raf); raf = null; canvas.classList.remove('confetti-active'); }
    }

    // helper to get center coords of element relative to viewport
    function getElementCenter(el){
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }

    // wire clicks on highlighted cards to fire confetti
    document.addEventListener('click', function(ev){
      var card = ev.target.closest('.card.highlight');
      if(!card) return;
      // compute center
      var c = getElementCenter(card);
      // convert to canvas coords (canvas is full-screen CSS pixels)
      var cx = c.x; var cy = c.y;
      // show canvas and spawn
      canvas.classList.add('confetti-active');
      spawnBurst(cx, cy, 80);
      // small secondary burst slightly above
      spawnBurst(cx, cy - 30, 28);
    });
  })();

  // gallery play buttons: if the media element has data-youtube (video ID) open a lightbox
  // otherwise fallback to opening the underlying background image in a new tab
  function createVideoLightbox(videoId){
    // build overlay
    var overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.tabIndex = -1;
    overlay.innerHTML = '<div class="lightbox-inner" role="dialog" aria-label="Video player">'
      + '<button class="lightbox-close" aria-label="Close video">✕</button>'
      + '<div class="video-wrap"><iframe src="https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?rel=0&autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
      + '</div>';

    document.body.appendChild(overlay);

    // focus management
    overlay.querySelector('.lightbox-close').focus();

    function remove(){
      try{ document.body.removeChild(overlay); }catch(e){}
      document.removeEventListener('keydown', escHandler);
    }

    // close when clicking close button or outside inner
    overlay.addEventListener('click', function(ev){
      if(ev.target === overlay || ev.target.closest('.lightbox-close')) remove();
    });

    function escHandler(e){ if(e.key === 'Escape') remove(); }
    document.addEventListener('keydown', escHandler);
  }

  document.querySelectorAll('.media .play').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var el = e.currentTarget.parentElement;
      if(!el) return;
      var vid = el.getAttribute('data-youtube') || el.dataset.youtube || el.getAttribute('data-video');
      if(vid){
        // if user provided a full URL, try to extract ID
        var id = vid;
        var m = vid.match(/[?&]v=([^&]+)/);
        if(!m){
          // try format youtu.be/ID
          var m2 = vid.match(/youtu\.be\/(.+)$/);
          if(m2) id = m2[1];
        } else id = m[1];
        // strip any extra params
        if(id && id.indexOf('&')!==-1) id = id.split('&')[0];
        createVideoLightbox(id);
        return;
      }
      // fallback: open the background image in a new tab (previous behavior)
      var bg = window.getComputedStyle(el).backgroundImage;
      var mm = /url\(("|')?(.*?)("|')?\)/.exec(bg);
      if(mm && mm[2]) window.open(mm[2], '_blank');
    });
  });

  // Load latest news from news.html into homepage news panel (if present)
  (function loadLatestNewsOnHome(){
    var homeNewsGrid = document.querySelector('.cards-grid.news-grid');
    if(!homeNewsGrid) return;
    // try to fetch the news index and extract .news-card elements
    fetch('news.html').then(function(resp){
      if(!resp.ok) throw new Error('Network response not ok');
      return resp.text();
    }).then(function(html){
      try{
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var cards = doc.querySelectorAll('.news-card');
        if(!cards || cards.length===0) return;
        // clear current static cards
        homeNewsGrid.innerHTML = '';
        // take up to 3 latest cards
        Array.prototype.slice.call(cards, 0, 3).forEach(function(c){
          // clone the card into the homepage
          var clone = c.cloneNode(true);
          homeNewsGrid.appendChild(clone);
        });
      }catch(e){
        // parsing failed — leave static content
        console.warn('Failed to parse news.html for homepage:', e);
      }
    }).catch(function(err){
      // fetch failed — likely opened via file:// or network error; keep static cards
      console.warn('Could not load news.html to update homepage:', err);
    });
  })();

  // --- Donation modal / support button
  (function donationHandler(){
    var supportBtn = document.getElementById('support-btn');
    var modal = document.getElementById('donation-modal');
    var list = modal && modal.querySelector('#donation-list');
    var closeBtn = modal && modal.querySelector('.donation-close');

    function close(){ if(!modal) return; modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }
    function open(){ if(!modal) return; modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); }

    if(closeBtn) closeBtn.addEventListener('click', close);
    if(modal) modal.addEventListener('click', function(e){ if(e.target===modal) close(); });

    if(!supportBtn || !modal || !list) return;

    // try to fetch donation-links.json from project root
    function loadLinks(cb){
      fetch('donation-links.json').then(function(r){ if(!r.ok) throw new Error('no links'); return r.json(); }).then(function(json){ cb(null,json); }).catch(function(){ cb(new Error('no links')); });
    }

    // helper to build PayPal.me url with amount (available to whole donationHandler scope)
      function buildPayPalHref(base, amount){
      if(!amount) return base;
      var val = amount.toString().trim();
      // remove common thousands separators and all whitespace (including NBSP)
      val = val.replace(/\u00A0/g, ''); // NBSP
      val = val.replace(/\s+/g, '');    // any other spaces
      // keep digits, dot and comma, then normalize comma to dot
      val = val.replace(/[^0-9.,]/g,'').replace(',','.');
      if(!val) return base;
      var num = parseFloat(val);
      if(isNaN(num) || num<=0) return base;
      var formatted = (Math.round(num*100)/100).toString().replace(/\.0+$/,'');
      return base.replace(/\/$/,'') + '/' + encodeURIComponent(formatted);
    }

    function renderLinks(links){
      if(!list) return;
      list.innerHTML = '';
      // preferred order
      var providers = ['paypal_me','stripe_link','patreon','yoomoney','other'];
      var added = 0;
      var amountEl = document.getElementById('donation-amount');
      var currencyEl = document.getElementById('donation-currency');

      providers.forEach(function(p){
        var url = links && links[p];
        if(!url) return;
        var opt = document.createElement('div'); opt.className='donation-option';
        var left = document.createElement('div');
        var label = document.createElement('div'); label.className='label';
        label.textContent = (p==='paypal_me')? 'PayPal' : (p==='stripe_link')? 'Stripe' : (p==='patreon')? 'Patreon' : (p==='yoomoney')? 'YooMoney' : 'Ссылка';
        var desc = document.createElement('div'); desc.className='desc'; desc.textContent = url;
        left.appendChild(label); left.appendChild(desc);

        var act = document.createElement('div'); act.className='action';

        // build the action button(s)
        var a = document.createElement('a'); a.className='donation-action-btn'; a.textContent='Перейти'; a.target='_blank'; a.rel='noopener';
        // store provider metadata for centralized click handling
        a.dataset.provider = p;
        a.dataset.base = url;
        a.href = url; // default

        act.appendChild(a);
        opt.appendChild(left); opt.appendChild(act);
        list.appendChild(opt);
        added++;
      });

      if(!added){
        var n = document.createElement('div'); n.className='donation-option donation-disabled'; n.innerHTML = '<div class="label">Ссылки не настроены</div><div>Отредактируйте <code>donation-links.json</code>, чтобы подключить реальные платёжные ссылки.</div>';
        list.appendChild(n);
      }

      // wire preset buttons (idempotent)
      var presets = document.querySelectorAll('.preset-btn');
      presets.forEach(function(pb){
        // remove previous listeners by cloning if necessary
        var newPb = pb.cloneNode(true);
        pb.parentNode.replaceChild(newPb, pb);
        newPb.addEventListener('click', function(ev){ ev.preventDefault(); var v = newPb.getAttribute('data-amount'); if(amountEl) amountEl.value = v; });
      });
    }

    // centralized click handler for donation actions (ensures amount is current)
    if(list){
      list.addEventListener('click', function(ev){
        var btn = ev.target.closest('.donation-action-btn');
        if(!btn) return;
        ev.preventDefault();
        var provider = btn.dataset.provider;
        var base = btn.dataset.base;
        var amountVal = (document.getElementById('donation-amount') && document.getElementById('donation-amount').value) || '';
        var href = base;
        if(provider === 'paypal_me' && amountVal){
          href = buildPayPalHref(base, amountVal);
        }
        try{ window.open(href, '_blank'); }catch(e){ location.href = href; }
      });
    }

    // handler for preset donation buttons (Pay €5, €10, etc.)
    var presetLinks = document.querySelectorAll('.preset-links a.donation-action-btn');
    presetLinks.forEach(function(btn){
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        var amountVal = (document.getElementById('donation-amount') && document.getElementById('donation-amount').value) || '';
        var paypalBase = 'https://www.paypal.me/integral999';
        var href = paypalBase;
        if(amountVal){
          href = buildPayPalHref(paypalBase, amountVal);
        } else {
          // fallback to button's preset amount if no input value
          var presetAmount = btn.getAttribute('href').split('/').pop();
          if(presetAmount){
            href = buildPayPalHref(paypalBase, presetAmount);
          }
        }
        try{ window.open(href, '_blank'); }catch(e){ location.href = href; }
      });
    });

    supportBtn.addEventListener('click', function(e){
      e.preventDefault(); open();
      loadLinks(function(err,json){ if(err) return renderLinks(null); renderLinks(json || {}); });
    });
  })();

  // TOURNAMENT FILTER
  (function tournamentFilter(){
    var buttons = document.querySelectorAll('.filter-btn');
    var sections = document.querySelectorAll('.disc-section');
    function applyFilter(disc){
      console.log('applyFilter', disc);
      sections.forEach(function(sec){
        if(sec.dataset.disc===disc || !disc){ sec.style.display=''; }
        else { sec.style.display='none'; }
      });
    }
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){
        buttons.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilter(btn.dataset.disc);
      });
    });
    var initial = document.querySelector('.filter-btn.active');
    if(initial) applyFilter(initial.dataset.disc);
  })();

  // Team card expand animation + navigate
  document.querySelectorAll('.card-btn[data-target]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var card = e.currentTarget.closest('.team-card');
      if(!card) return;
      var target = e.currentTarget.getAttribute('data-target');

      // get bounding rect and computed background
      var rect = card.getBoundingClientRect();
      var style = window.getComputedStyle(card);
      var bg = style.backgroundImage;

      // create expander clone
      var exp = document.createElement('div');
      exp.className = 'expander';
      exp.style.position = 'fixed';
      exp.style.left = rect.left + 'px';
      exp.style.top = rect.top + 'px';
      exp.style.width = rect.width + 'px';
      exp.style.height = rect.height + 'px';
      exp.style.backgroundImage = bg;
      exp.style.backgroundSize = style.backgroundSize;
      exp.style.backgroundPosition = style.backgroundPosition;
      exp.style.zIndex = 9999;
      exp.style.borderRadius = window.getComputedStyle(card).borderRadius || '12px';
      exp.style.boxShadow = '0 30px 80px rgba(0,0,0,0.6)';
      exp.style.transition = 'all 520ms cubic-bezier(.2,.9,.2,1)';
      exp.style.willChange = 'left, top, width, height, transform';

      // clone inner content (title)
      var inner = document.createElement('div');
      inner.className = 'expander-inner';
      inner.style.position = 'absolute';
      inner.style.left = '18px';
      inner.style.bottom = '18px';
      inner.style.color = '#fff';
      inner.style.zIndex = 2;
      var title = card.querySelector('h3');
      if(title) inner.innerHTML = '<h2 style="margin:0;font-size:28px;letter-spacing:1px">' + title.textContent + '</h2>';
      exp.appendChild(inner);

      document.body.appendChild(exp);

      // force layout
      exp.getBoundingClientRect();

      // open to full screen
      exp.style.left = '0px';
      exp.style.top = '0px';
      exp.style.width = window.innerWidth + 'px';
      exp.style.height = window.innerHeight + 'px';
      exp.style.borderRadius = '0px';

      // after animation, navigate to target page
      var done = false;
      function navigateNow(){
        if(done) return; done = true;
        window.location.href = target;
      }
      exp.addEventListener('transitionend', function(ev){
        // ensure we only react to the height/width transition
        if(ev.propertyName === 'height' || ev.propertyName === 'width') navigateNow();
      });

      // fallback in case transitionend doesn't fire
      setTimeout(navigateNow, 700);
    });
  });

  // also make whole card clickable (not just the button)
  document.querySelectorAll('.team-card').forEach(function(card){
    card.addEventListener('click', function(e){
      if(e.target.closest('.card-btn[data-target]')) return;
      var btn = card.querySelector('.card-btn[data-target]');
      if(btn) btn.click();
    });
  });

  // News panel: clicking mini-cards loads full article into the right detail pane
  var newsDetail = document.getElementById('news-detail');
  var miniCards = document.querySelectorAll('.mini-card');
  function clearActive(){
    miniCards.forEach(function(c){ c.classList.remove('active'); });
  }
  function loadNewsById(id){
    if(!id) return;
    // normalize id (may come with leading '#')
    id = id.replace(/^#/, '');
    var article = document.getElementById(id);
    if(!article || !newsDetail) return false;
    // show loading state for a smooth swap
    newsDetail.classList.add('loading');
    // small delay to allow CSS transition
    setTimeout(function(){
      // copy article contents into newsDetail
      newsDetail.innerHTML = '';
      var copy = article.cloneNode(true);
      // remove id on clone to avoid duplicates
      copy.removeAttribute('id');
      // build a hero image block if mini-thumb exists for the corresponding mini-card
      var topImage = document.createElement('div');
      topImage.className = 'news-hero';
      var thumb = document.querySelector('.mini-card[data-target="#'+id+'"] .mini-thumb');
      if(thumb){
        var bg = window.getComputedStyle(thumb).backgroundImage;
        topImage.style.backgroundImage = bg;
        newsDetail.appendChild(topImage);
      }
      // append cloned article
      newsDetail.appendChild(copy);
      // add a small 'source' indicator if article has links
      var links = copy.querySelectorAll('a');
      if(links.length){
        var src = document.createElement('div');
        src.className = 'source';
        src.innerHTML = 'Источник: ' + Array.prototype.slice.call(links).map(function(a){ return '<a href="'+a.href+'" target="_blank" rel="noopener">'+a.hostname+'</a>'; }).join(', ');
        newsDetail.appendChild(src);
      }
      // highlight matching mini-card
      clearActive();
      var activeMini = document.querySelector('.mini-card[data-target="#'+id+'"]');
      if(activeMini) activeMini.classList.add('active');
      // update location.hash without jumping
      try{ history.replaceState(null, '', '#'+id); }catch(e){ location.hash = id; }
      // remove loading to fade in
      requestAnimationFrame(function(){ newsDetail.classList.remove('loading'); });
    }, 80);
    return true;
  }

  miniCards.forEach(function(card){
    card.addEventListener('click', function(){
      var target = card.getAttribute('data-target');
      if(!target) return;
      loadNewsById(target);
    });
  });

  // On page load, if hash present, load corresponding news into the archive detail; otherwise load first item
  if(newsDetail){
    var initial = location.hash || (miniCards[0] && miniCards[0].getAttribute('data-target'));
    if(initial) loadNewsById(initial);
  }

  // --- Tournament panel: populate recent matches when user selects a tournament ---
  (function tournamentMatches(){
    var matches = []; // populate from data if needed
    var container = document.getElementById('tournament-matches-container');
    if(!container) return;
    var list = document.createElement('div'); list.className = 'matches-list';

    matches.forEach(function(m){
      var el = document.createElement('div'); el.className = 'match-item';
      var row = document.createElement('div'); row.className = 'match-row';
      
      var opp = document.createElement('div'); opp.className = 'opponent'; opp.textContent = m.opponent || 'Unknown';
      var scoreEl = document.createElement('div'); scoreEl.className = 'score'; scoreEl.textContent = m.score || '0:0';
      
      row.appendChild(opp);
      row.appendChild(scoreEl);
      el.appendChild(row);

      try{
        var parts = (m.score||'').toString().split(':').map(function(p){ return parseInt(p,10); });
        if(parts.length===2 && !isNaN(parts[0]) && !isNaN(parts[1])){
          if(parts[0] > parts[1]){ scoreEl.classList.add('success'); el.classList.add('win'); scoreEl.setAttribute('title','Победа'); }
          else if(parts[0] < parts[1]){ scoreEl.classList.add('lost'); el.classList.add('lost'); scoreEl.setAttribute('title','Поражение'); }
          else{ scoreEl.classList.add('draw'); el.classList.add('draw'); scoreEl.setAttribute('title','Ничья'); }
        }
      }catch(e){ /* ignore parsing errors */ }

      // expandable details
      var details = document.createElement('div'); details.className = 'match-details';
      if(m.details){
        var dHtml = '<div><strong>Maps:</strong> '+(m.details.maps? m.details.maps.join(', '): '—')+'</div>';
        if(m.details.mvp) dHtml += '<div><strong>MVP:</strong> '+m.details.mvp+'</div>';
        if(m.details.picks) dHtml += '<div><strong>Picks:</strong> '+m.details.picks.join(', ')+'</div>';
        details.innerHTML = dHtml;
      } else {
        details.innerHTML = '<div class="muted">Деталей нет</div>';
      }
      el.appendChild(details);

      var clickable = el.querySelector('.match-row');
      if(clickable){
        clickable.addEventListener('click', function(e){
          if(e.target.closest('a')) return;
          el.classList.toggle('expanded');
        });
      }

      list.appendChild(el);
    });
    container.appendChild(list);
  })();

  // Recent matches module (migrated from index.html)
  (function(){
    const matches = {
      dota2: {
        last: [
          {date:'2026-03-07', teamA:'Team Spirit', teamB:'OG', result:'2:1'},
          {date:'2026-02-28', teamA:'Team Spirit', teamB:'Team Liquid', result:'1:2'},
          {date:'2026-02-20', teamA:'Team Spirit', teamB:'G2', result:'2:0'}
        ],
  next: {teamA:'Team Spirit', teamB:'Nigma Galaxy', datetime:'2026-03-20T18:00:00Z', link:'#', tournament:'DreamLeague Season 28', teamALogo:'images/logo-team-spirit.png', teamBLogo:'images/logo-opponent.jpg'}
      },
      cs2: {
        last: [
          {date:'2026-03-05', teamA:'Team Spirit', teamB:'FaZe', result:'1:2'},
          {date:'2026-02-25', teamA:'Team Spirit', teamB:'Natus Vincere', result:'2:0'},
          {date:'2026-02-14', teamA:'Team Spirit', teamB:'Astralis', result:'2:1'}
        ],
  next: {teamA:'Team Spirit', teamB:'Heroic', datetime:'2026-03-18T20:30:00Z', link:'#', tournament:'BLAST Premier', teamALogo:'images/logo-team-spirit.png', teamBLogo:'images/logo-opponent.jpg'}
      },
      mlbb: {
        last: [
          {date:'2026-03-02', teamA:'Team Spirit', teamB:'RRQ', result:'2:0'},
          {date:'2026-02-19', teamA:'Team Spirit', teamB:'EVOS', result:'2:1'},
          {date:'2026-01-29', teamA:'Team Spirit', teamB:'ONIC', result:'1:2'}
        ],
  next: {teamA:'Team Spirit', teamB:'Bigetron', datetime:'2026-03-22T16:00:00Z', link:'#', tournament:'MLBB Invitational', teamALogo:'images/logo-team-spirit.png', teamBLogo:'images/logo-opponent.jpg'}
      },
      csacademy: {
        last: [
          {date:'2026-02-28', teamA:'Team Spirit', teamB:'LanDaLan #2 Final', result:'2:1'},
          {date:'2026-02-10', teamA:'Team Spirit', teamB:'CCT Europe #15', result:'2:0'},
          {date:'2026-01-18', teamA:'Team Spirit', teamB:'ESL Challenger Qualifier', result:'1:2'}
        ],
  next: {teamA:'Team Spirit', teamB:'Rising Stars', datetime:'2026-03-21T17:00:00Z', link:'#', tournament:'CS Academy Cup', teamALogo:'images/logo-team-spirit.png', teamBLogo:'images/logo-opponent.jpg'}
      }
    };

    let activeDisc = 'dota2';
    let countdownTimer = null;

    function initSidebar(){
      const items = document.querySelectorAll('.disc-item');
      items.forEach(i => {
        i.addEventListener('click', () => { setActive(i.getAttribute('data-disc')); });
        if(i.getAttribute('data-disc')===activeDisc) i.classList.add('active');
      });
    }

    function setActive(d){
      activeDisc = d;
      document.querySelectorAll('.disc-item').forEach(el=>el.classList.toggle('active', el.getAttribute('data-disc')===d));
      renderTable();
      showNext();
    }

    function renderTable(){
      const tbody = document.querySelector('#matches-table tbody');
      const data = (matches[activeDisc] && matches[activeDisc].last) || [];
      tbody.innerHTML = data.map(m => {
        var scoreText = (m.result||'').toString();
        var parts = scoreText.split(':').map(function(s){ return parseInt(s,10); });
        var cls = 'draw'; var icon = '';
        if(parts.length===2 && !isNaN(parts[0]) && !isNaN(parts[1])){
          if(parts[0] > parts[1]){ cls = 'success'; icon = '✔'; }
          else if(parts[0] < parts[1]){ cls = 'lost'; icon = '✖'; }
          else{ cls = 'draw'; icon = '' }
        }
        var teamA = m.teamA || 'Team Spirit';
        var teamB = m.teamB || m.opponent || 'Opponent';
        return `
        <tr>
          <td><time class="meta">${m.date}</time></td>
          <td class="match-teams"><span class="team-left">${teamA}</span> <span class="vs-small">vs</span> <span class="team-right">${teamB}</span></td>
          <td class="match-result"><span class="score-badge ${cls}" aria-label="Результат: ${scoreText}">${icon} ${scoreText}</span></td>
        </tr>
      `}).join('');
    }

    function showNext(){
      const next = matches[activeDisc] && matches[activeDisc].next;
      const nextOpponent = document.getElementById('next-opponent');
      const nextTournament = document.getElementById('next-tournament');
      const nextDatetimeEl = document.getElementById('next-datetime');
      const cd = document.getElementById('next-overview-countdown');
      const teamLeftLogo = document.querySelector('#next-match .team-left .team-logo');
      const teamRightLogo = document.querySelector('#next-match .team-right .team-logo');
      const watchBtn = document.getElementById('watch-match-btn');
      if(!next){ if(nextOpponent) nextOpponent.textContent='—'; if(nextTournament) nextTournament.textContent='—'; if(nextDatetimeEl) nextDatetimeEl.textContent='—'; if(cd) cd.textContent='--:--:--:--'; return; }
      if(nextOpponent) nextOpponent.textContent = next.teamB || next.opponent || '—';
      if(nextTournament) nextTournament.textContent = next.tournament || '';
      if(nextDatetimeEl) nextDatetimeEl.textContent = new Date(next.datetime).toLocaleString();
      if(teamLeftLogo){
        var leftDefault = teamLeftLogo.getAttribute('src') || 'images/logo-team-spirit.png';
        if(next.teamALogo) teamLeftLogo.src = next.teamALogo;
        // fallback to default if the provided logo fails to load
        teamLeftLogo.onerror = function(){ this.onerror = null; this.src = leftDefault; };
      }
      if(teamRightLogo){
        var rightDefault = teamRightLogo.getAttribute('src') || 'images/logo-opponent.jpg';
        if(next.teamBLogo) teamRightLogo.src = next.teamBLogo;
        // fallback to default if the provided logo fails to load
        teamRightLogo.onerror = function(){ this.onerror = null; this.src = rightDefault; };
      }
      if(watchBtn){
        // Only overwrite the existing href when a meaningful link is provided.
        // This prevents the script from replacing the default Twitch URL with '#' or an empty value.
        if(next.link && next.link !== '#' && next.link.trim() !== ''){
          watchBtn.href = next.link;
        }
        // ensure the watch button opens in a new tab and uses safe rel attributes
        try{ watchBtn.target = '_blank'; watchBtn.rel = 'noopener noreferrer'; }catch(e){}
      }
      if(cd) startCountdownBlocks(next.datetime);
    }

    function startCountdownBlocks(datetime, el){
      if(countdownTimer) clearInterval(countdownTimer);
      function pad(n){ return n<10? '0'+n: ''+n }
      const countdownEl = document.getElementById('next-overview-countdown');
      function tick(){
        const diff = new Date(datetime) - new Date();
        if(diff <= 0){ if(countdownEl) countdownEl.textContent='00:00:00:00'; clearInterval(countdownTimer); return; }
        const d = Math.floor(diff/86400000);
        const h = Math.floor((diff%86400000)/3600000);
        const m = Math.floor((diff%3600000)/60000);
        const s = Math.floor((diff%60000)/1000);
        if(countdownEl) countdownEl.textContent = pad(d) + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
      }
      tick();
      countdownTimer = setInterval(tick,1000);
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', ()=>{ initSidebar(); renderTable(); showNext(); });
    } else {
      initSidebar(); renderTable(); showNext();
    }
  })();


  // SINGLE ARTICLE MODE: if user opens news.html#id directly, create a full-page article reader
  function openFullArticleFromHash(){
    if(!location.hash) return;
    var id = location.hash.replace(/^#/, '');
    var article = document.getElementById(id);
    if(!article) return;

    // create reader container
    var reader = document.createElement('div');
    reader.className = 'single-article-view';

    // back link
    var back = document.createElement('a');
    back.href = 'news.html';
    back.className = 'back-link';
    back.textContent = '← НАЗАД К БЛОГУ';
    reader.appendChild(back);

    // title
    var h = article.querySelector('h3');
    var title = document.createElement('h1');
    title.textContent = h ? h.textContent : 'Новость';
    reader.appendChild(title);

    // date
    var date = article.querySelector('.news-date');
    var meta = document.createElement('div');
    meta.className = 'article-meta';
    if(date) meta.textContent = date.textContent;
    reader.appendChild(meta);

    // hero: prefer any image inside article, else try to use .news-media from the homepage cards
    var heroUrl = null;
    var img = article.querySelector('img');
    if(img) heroUrl = img.src;
    else {
      var media = document.querySelector('.news-media[style*="'+id.split('-').slice(0,3).join('')+'"]');
      // fallbacks
      var thumb = article.querySelector('.mini-thumb');
      if(thumb){
        var bg = window.getComputedStyle(thumb).backgroundImage;
        var m = /url\(("|')?(.*?)("|')?\)/.exec(bg);
        if(m && m[2]) heroUrl = m[2];
      }
      if(!heroUrl){
        var pageMedia = article.querySelector('.news-hero') || document.querySelector('.news-media');
        if(pageMedia){
          var bg2 = window.getComputedStyle(pageMedia).backgroundImage;
          var m2 = /url\(("|')?(.*?)("|')?\)/.exec(bg2);
          if(m2 && m2[2]) heroUrl = m2[2];
        }
      }
    }
    if(heroUrl){
      var hero = document.createElement('div');
      hero.className = 'article-hero';
      hero.style.backgroundImage = 'url("'+heroUrl+'")';
      reader.appendChild(hero);
    }

    // clone article body (paragraphs) into content
    var content = document.createElement('div');
    content.className = 'article-content';
    // pick paragraphs and other nodes within the article
    var nodes = Array.prototype.slice.call(article.childNodes);
    nodes.forEach(function(node){
      // skip the h3 and .news-date nodes (we already used them)
      if(node.nodeType===1){
        if(node.tagName.toLowerCase()==='h3') return;
        if(node.classList && node.classList.contains('news-date')) return;
      }
      content.appendChild(node.cloneNode(true));
    });
    reader.appendChild(content);

    // insert reader at top of main
    var main = document.querySelector('main');
    main.parentNode.insertBefore(reader, main.nextSibling);
    document.body.classList.add('single-article-mode');
    window.scrollTo({top:0,behavior:'instant'});
  }

  // if the page was opened with hash pointing to an article, show it as a full page
  if(location.pathname && (location.pathname.indexOf('news.html')!==-1 || location.pathname.endsWith('/')) && location.hash){
    openFullArticleFromHash();
  }

  // TIMELINE: show prize pool and Team Spirit winnings when timeline card is clicked
  (function timelinePrizeHandlers(){
    var timelineCards = document.querySelectorAll('.timeline-item .card');
    if(!timelineCards || !timelineCards.length) return;
    timelineCards.forEach(function(card){
      // toggle expand on click (but ignore clicks on edit button)
      card.addEventListener('click', function(e){
        if(e.target.closest('.edit-prize')) return;
        card.classList.toggle('expanded');
      });

      // helper to create a stable localStorage key for this card
      function slugify(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9а-яё\s-]/g,'').replace(/\s+/g,'_').substr(0,64); }
      var yearEl = card.querySelector('.year');
      var titleEl = card.querySelector('h4');
      var year = yearEl ? yearEl.textContent.trim() : '';
      var title = titleEl ? titleEl.textContent.trim() : '';
      var storageKey = 'timeline_prize_' + (year||'') + '_' + slugify(title);

      // load from localStorage (if user previously edited)
      try{
        var stored = localStorage.getItem(storageKey);
        if(stored){
          var obj = JSON.parse(stored);
          if(obj.prize) card.dataset.prize = obj.prize;
          if(obj.won) card.dataset.won = obj.won;
        }
      }catch(e){ /* ignore localStorage parse errors */ }

      // populate display from data attributes (either from HTML or loaded from localStorage)
      var poolEl = card.querySelector('.prize-pool');
      var wonEl = card.querySelector('.prize-won');
      var storedPool = card.getAttribute('data-prize') || card.dataset.prize || '';
      var storedWon = card.getAttribute('data-won') || card.dataset.won || '';
      if(storedPool) poolEl.textContent = storedPool;
      if(storedWon) wonEl.textContent = storedWon;

      // edit button to allow entering values (saved to dataset for the session)
      var edit = card.querySelector('.edit-prize');
      if(edit){
        edit.addEventListener('click', function(ev){
          ev.stopPropagation();
          var p = prompt('Введите общий призовой фонд (например: 1 000 000 $)', storedPool || '');
          if(p!==null){
            card.dataset.prize = p.trim();
            if(poolEl) poolEl.textContent = card.dataset.prize || 'Не задано';
          }
          var w = prompt('Сколько Team Spirit получили с этого турнира? (например: 300 000 $)', storedWon || '');
          if(w!==null){
            card.dataset.won = w.trim();
            if(wonEl) wonEl.textContent = card.dataset.won || 'Не задано';
          }
          // persist the edited values to localStorage so they survive reloads
          try{
            var objToSave = { prize: card.dataset.prize || '', won: card.dataset.won || '' };
            localStorage.setItem(storageKey, JSON.stringify(objToSave));
          }catch(e){ /* ignore localStorage errors (e.g., disabled) */ }
          // open the card to show updated info
          card.classList.add('expanded');
        });
      }
    });
  })();

  // TIMELINE: show items on scroll (intersection observer)
  // items should remain visible once revealed so the "Путь драконов" never disappears
  (function timelineVisibilityOnScroll(){
    var timelineItems = document.querySelectorAll('.timeline-item');
    if(!timelineItems || !timelineItems.length) return;

    // Respect user's motion preferences: if they prefer reduced motion, reveal all immediately
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReduced){
      timelineItems.forEach(function(item){ item.classList.add('visible'); });
      return;
    }

    if('IntersectionObserver' in window){
      // small stagger: items will appear one after another when intersecting
      var revealedCount = 0;
      var STAGGER_MS = 110; // milliseconds between items
      var observer = new IntersectionObserver(function(entries){
        // sort entries by visual position so reveal order follows rows (top -> left)
        // this makes items appear left-to-right within the same horizontal band
        entries.sort(function(a,b){
          var ta = Math.round(a.boundingClientRect.top || 0);
          var tb = Math.round(b.boundingClientRect.top || 0);
          if(ta !== tb) return ta - tb;
          var la = Math.round(a.boundingClientRect.left || 0);
          var lb = Math.round(b.boundingClientRect.left || 0);
          return la - lb;
        });

        entries.forEach(function(entry){
          if(entry.isIntersecting){
            try{
              // compute a simple incremental delay based on how many items we've revealed so far
              var delay = revealedCount * STAGGER_MS;
              entry.target.style.transitionDelay = (delay) + 'ms';
            }catch(e){}
            entry.target.classList.add('visible');
            revealedCount++;
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      timelineItems.forEach(function(item){
        // ensure a clean initial state
        item.style.transitionDelay = '0ms';
        observer.observe(item);
      });
    } else {
      // fallback for very old browsers: reveal all
      timelineItems.forEach(function(item){ item.classList.add('visible'); });
    }
  })();

  // QUIZ
  (function quizHandler(){
    var quizData = [
      {
        question: 'В каком году Team Spirit выиграла свой первый The International?',
        options: ['2020', '2021', '2022', '2023'],
        correct: 1
      },
      {
        question: 'Сколько раз Team Spirit выигрывала The International?',
        options: ['1 раз', '2 раза', '3 раза', '4 раза'],
        correct: 1
      },
      {
        question: 'Какую сумму команда получила за победу на TI 2021?',
        options: ['$10 млн', '$15 млн', '$18 млн', '$20 млн'],
        correct: 2
      },
      {
        question: 'К какому турниру относится призовой фонд $15,000,000?',
        options: ['ESL One', 'Riyadh Masters 2023', 'The International 2022', 'IEM Katowice'],
        correct: 1
      },
      {
        question: 'Какой игрок считался ключевым на TI 2021 (Dota 2)?',
        options: ['Yatoro', 'Collapse', 'RAMZES666', 'No[o]ne'],
        correct: 0
      },
      {
        question: 'В каком городе проходил PGL Arlington Major 2022?',
        options: ['Арлингтон', 'Бостон', 'Катовице', 'Франкфурт'],
        correct: 0
      },
      {
        question: 'Какая дисциплина Team Spirit выиграла IEM Katowice 2024?',
        options: ['CS2', 'Dota 2', 'MLBB', 'HS'],
        correct: 0
      },
      {
        question: 'Какой состав был известен как "Драконы"?',
        options: ['Dota 2 2021', 'CS2 2024', 'MLBB 2026', 'PUBG 2023'],
        correct: 0
      },
      {
        question: 'На каком турнире Team Spirit победили в 2023, став чемпионами вновь?',
        options: ['TI 2023', 'Riyadh Masters', 'ESL Pro League', 'DreamLeague'],
        correct: 0
      },
      {
        question: 'Сколько игроков было в основном составе Dota 2 при первой победе на TI?',
        options: ['5', '6', '4', '7'],
        correct: 0
      }
    ];

    var currentQuestion = 0;
    var score = 0;
    var answered = false;

    var container = document.getElementById('quiz-container');
    var contentEl = document.getElementById('quiz-content');
    var resultsEl = document.getElementById('quiz-results');
    var counterEl = document.getElementById('quiz-counter');
    var progressFill = document.getElementById('progress-fill');

    if(!contentEl) return;
    // set total questions count in UI
    var totalEl = document.getElementById('total-questions');
    var totalFinalEl = document.getElementById('total-questions-final');
    if(totalEl) totalEl.textContent = quizData.length;
    if(totalFinalEl) totalFinalEl.textContent = quizData.length;

    function renderQuestion(){
      answered = false;
      var q = quizData[currentQuestion];
      var html = '<div class="quiz-question">' +
        '<h3>' + (currentQuestion + 1) + '. ' + q.question + '</h3>';
      
      q.options.forEach(function(opt, idx){
        html += '<button class="quiz-option" data-index="' + idx + '">' + opt + '</button>';
      });
      
      html += '<div class="quiz-nav">' +
        '<button class="btn" id="restart-btn">Рестарт</button>' +
        '<button class="btn" id="next-btn" ' + (currentQuestion === quizData.length - 1 ? 'style="display:none"' : '') + '>Далее →</button>' +
        '<button class="btn" id="finish-btn" ' + (currentQuestion !== quizData.length - 1 ? 'style="display:none"' : '') + '>Завершить</button>' +
      '</div></div>';

      contentEl.innerHTML = html;
      updateProgress();

      var opts = contentEl.querySelectorAll('.quiz-option');
      opts.forEach(function(opt){
        opt.addEventListener('click', function(e){
          if(answered) return;
          answered = true;
          var idx = parseInt(e.target.getAttribute('data-index'));
          
          opts.forEach(function(o, i){
            o.disabled = true;
            if(i === quizData[currentQuestion].correct){
              o.classList.add('correct');
            }
            if(i === idx && idx !== quizData[currentQuestion].correct){
              o.classList.add('incorrect');
            }
          });

          if(idx === quizData[currentQuestion].correct){
            score++;
          }
        });
      });

      var restartBtn = document.getElementById('restart-btn');
      var nextBtn = document.getElementById('next-btn');
      var finishBtn = document.getElementById('finish-btn');

      // Note: previous "← Назад" button removed per request. Restart is available.
      if(restartBtn){
        restartBtn.addEventListener('click', function(){
          currentQuestion = 0;
          score = 0;
          answered = false;
          // ensure results (if visible) are hidden and quiz content shown
          if(contentEl) contentEl.style.display = 'block';
          if(resultsEl) resultsEl.style.display = 'none';
          renderQuestion();
        });
      }

      if(nextBtn){
        nextBtn.addEventListener('click', function(){
          if(answered && currentQuestion < quizData.length - 1){
            currentQuestion++;
            renderQuestion();
          }
        });
      }

      if(finishBtn){
        finishBtn.addEventListener('click', function(){
          if(answered){
            showResults();
          }
        });
      }
    }

    function updateProgress(){
      var percent = ((currentQuestion + 1) / quizData.length) * 100;
      progressFill.style.width = percent + '%';
      counterEl.textContent = 'Вопрос ' + (currentQuestion + 1) + ' из ' + quizData.length;
    }

    function showResults(){
      contentEl.style.display = 'none';
      resultsEl.style.display = 'block';
      
      var percent = Math.round((score / quizData.length) * 100);
      document.getElementById('result-score').textContent = score;
      
      var messages = [
        'Хм, может быть стоит лучше следить за новостями команды? 😊',
        'Не плохо! Ты в курсе основных моментов.',
        'Отлично! Ты настоящий фан Team Spirit!',
        'Великолепно! Ты профессиональный знаток команды!',
        'Просто легендарно! Ты истинный дух Team Spirit! 🏆'
      ];

  // Map numeric score to message index using explicit, easy-to-tune ranges.
  // For a 10-question quiz this yields:
  // 0-2 -> messages[0] (poor), 3-4 -> messages[1] (ok), 5-6 -> messages[2] (good),
  // 7-8 -> messages[3] (great), 9-10 -> messages[4] (legendary).
  var idx;
  var max = quizData.length || 10;
  var p20 = Math.floor(max * 0.2); // e.g. 2
  var p40 = Math.floor(max * 0.4); // e.g. 4
  var p60 = Math.floor(max * 0.6); // e.g. 6
  var p80 = Math.floor(max * 0.8); // e.g. 8

  if(score <= p20) idx = 0;
  else if(score <= p40) idx = 1;
  else if(score <= p60) idx = 2;
  else if(score <= p80) idx = 3;
  else idx = 4;

  document.getElementById('result-message').textContent = messages[Math.min(idx, messages.length - 1)];

      var retryBtn = document.getElementById('retry-quiz');
      if(retryBtn){
        retryBtn.addEventListener('click', function(){
          currentQuestion = 0;
          score = 0;
          answered = false;
          contentEl.style.display = 'block';
          resultsEl.style.display = 'none';
          renderQuestion();
        });
      }
    }

    renderQuestion();
  })();

});
