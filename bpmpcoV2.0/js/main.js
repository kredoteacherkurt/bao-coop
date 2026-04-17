document.addEventListener('DOMContentLoaded', () => {
  // 1. Tab Navigation System (Slug-based)
  const handleRoute = () => {
    const hash = window.location.hash || '#home';
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    // Show target tab
    const target = document.querySelector(hash);
    if (target) {
      target.classList.add('active');
      window.scrollTo({
        top: -5,
        behavior: 'smooth'
      });
      // Ensure map resets to main branch when clicking into Branches tab
      if (hash === '#branches' && window.updateBranchMap) {
        window.updateBranchMap('main', true);
      }
    } else {
      // Fallback
      const home = document.querySelector('#home');
      if (home) home.classList.add('active');
    }
    // Update Nav Active States
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.querySelector(`a[href="${hash}"]`)) {
        item.classList.add('active');
      }
    });
  };
  window.addEventListener('hashchange', handleRoute);
  document.querySelectorAll('a[href]').forEach(a => {
    a.addEventListener('click', function() {
      const href = this.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
        localStorage.setItem('baaocoop_last_hash', window.location.hash || '#home');
      }
    });
  });
  let fabOpen = false;
  // Chat Widget
  window.chatOpen = false;
  let currentChatTab = 'home';
  window.toggleChat = () => {
    window.chatOpen = !window.chatOpen;
    const panel = document.getElementById('chat-panel');
    const icon = document.getElementById('chat-fab-icon');
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    requestAnimationFrame(() => {
      panel.style.opacity = window.chatOpen ? '1' : '0';
      panel.style.transform = window.chatOpen ? 'translateY(0)' : 'translateY(10px)';
    });
    if (!window.chatOpen) setTimeout(() => panel.style.display = 'none', 300);
    icon.className = window.chatOpen ? 'fas fa-times' : 'far fa-comment-dots';
  };
  window.switchChatTab = (tab) => {
    currentChatTab = tab;
    ['home','message','help'].forEach(t => {
      const pane = document.getElementById(`chat-pane-${t}`);
      const btn = document.getElementById(`chat-tab-${t}`);
      if (pane) pane.style.display = t === tab ? 'flex' : 'none';
      if (btn) {
        btn.style.background = t === tab ? 'white' : 'transparent';
        btn.style.color = t === tab ? 'var(--text-main)' : '#64748b';
      }
    });
  };
  window.sendChatMessage = () => {
    const input = document.getElementById('chat-input');
    if(!input) return;
    const val = input.value.trim();
    if (!val) return;
    const messages = document.getElementById('chat-messages');
    // User bubble
    const userDiv = document.createElement('div');
    userDiv.style.cssText = 'background:var(--primary);color:white;border-radius:12px 12px 0 12px;padding:0.8rem 1rem;max-width:85%;font-size:0.88rem;align-self:flex-end;line-height:1.5;margin-left:auto';
    userDiv.textContent = val;
    messages.appendChild(userDiv);
    input.value = '';
    messages.scrollTop = messages.scrollHeight;
    // Auto-reply
    setTimeout(() => {
      const replyDiv = document.createElement('div');
      replyDiv.style.cssText = 'background:#f1f5f9;border-radius:12px 12px 12px 0;padding:0.8rem 1rem;max-width:85%;font-size:0.88rem;color:var(--text-main);line-height:1.5';
      replyDiv.textContent = 'Thanks for reaching out! Our team will get back to you shortly. For urgent concerns, please visit any of our branches.';
      messages.appendChild(replyDiv);
      messages.scrollTop = messages.scrollHeight;
    }, 800);
  };
  handleRoute(); // Run on initial load

// --- SYNC DATA FROM ADMIN ---
  const savedTagline = localStorage.getItem('baaocoop_hero_tagline');
  if (savedTagline) {
    document.querySelectorAll('.hero-island h1, #about-who h1').forEach(h1 => {
      if (h1.textContent.includes('Rooted in Faith')) h1.textContent = savedTagline;
    });
  }

  let savedVids = JSON.parse(localStorage.getItem('baaocoop_vid_links') || 'null');
  if (!savedVids && localStorage.getItem('baaocoop_vid_link')) {
    savedVids =[localStorage.getItem('baaocoop_vid_link')];
  }

  if (savedVids && savedVids.length > 0) {
    const grid = document.getElementById('index-media-grid');
    if (grid) {
      const count = savedVids.length;
      
      // Inject smart symmetrical count data
      grid.setAttribute('data-count', count);
      if (count > 4) grid.classList.add('many-vids');
      else grid.classList.remove('many-vids');

      grid.innerHTML = savedVids.map(src => {
        const isFb = src.includes('facebook.com');
        const isDrive = src.includes('drive.google.com');
        return `<div class="vid-wrapper ${isDrive ? 'drive-wrapper' : ''}">
          <iframe src="${src}" allowfullscreen loading="lazy"
            ${isFb ? 'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"' : ''}
          ></iframe>
        </div>`;
      }).join('');
    }
  }
  // --- RENDER DYNAMIC FORMS ---
  const savedForms = JSON.parse(localStorage.getItem('baaocoop_form_links') || '[]');
  const formsGrid = document.getElementById('dynamic-forms-grid');
  if (formsGrid) {
    if (savedForms.length > 0) {
      formsGrid.innerHTML = savedForms.map(form => `
        <a href="${form.url}" target="_blank" rel="noopener noreferrer" class="form-card">
          <i class="fas fa-file-pdf"></i>
          <div>
            <h3 style="color:var(--text-main);font-size:1.1rem">${form.title}</h3>
            <p style="color:var(--text-muted);font-size:.85rem">Download Document</p>
          </div>
        </a>
      `).join('');
    } else {
      formsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">No forms available at the moment.</div>`;
    }
  }
  // ----------------------------
  // ----------------------------

  // Scroll to Top FAB Visibility
  const fabTop = document.getElementById('fabTop');
  window.addEventListener('scroll', () => {
    if (fabTop) {
      if (window.scrollY > window.innerHeight * 0.75) {
        fabTop.style.opacity = '1';
        fabTop.style.pointerEvents = 'auto';
        fabTop.style.transform = 'translateY(0)';
      } else {
        fabTop.style.opacity = '0';
        fabTop.style.pointerEvents = 'none';
        fabTop.style.transform = 'translateY(20px)';
      }
    }
  });
  // 2. Command Palette Logic
  const cmdModal = document.getElementById('cmdModal');
  const cmdInput = document.getElementById('cmdInput');
  const cmdResults = document.getElementById('cmdResults');
  const searchLinks = [
    { name: 'Home', icon: 'fa-home', slug: '#home' }, 
    { name: 'About Us', icon: 'fa-info-circle', slug: '#about' }, 
    { name: 'Our History', icon: 'fa-history', slug: '#about' }, 
    { name: 'Executives', icon: 'fa-university', slug: '#about' }, 
    { name: 'Management', icon: 'fa-sitemap', slug: '#about' }, 
    { name: 'Our Partners', icon: 'fa-handshake', slug: '#our-partners' }, 
    { name: 'Products & Services', icon: 'fa-box', slug: '#services' }, 
    { name: 'Membership Requirements', icon: 'fa-file-contract', slug: '#join-us' }, 
    { name: 'Download Forms', icon: 'fa-download', slug: '#forms' }, 
    { name: 'Apply Online', icon: 'fa-laptop', url: 'membership.html' }, 
    { name: 'Loan Calculator', icon: 'fa-calculator', slug: '#calculator' }, 
    { name: 'News', icon: 'fa-newspaper', slug: '#news' }, 
    { name: 'Branches', icon: 'fa-map-marker-alt', slug: '#branches' }, 
    { name: 'Feedback', icon: 'fa-comment-dots', slug: '#feedback' }
  ];
  const renderCmdResults = (items, label = "NAVIGATION") => {
    cmdResults.innerHTML = items.length > 0 ? `<div class="cmd-group-label">${label}</div>` : `<div class="cmd-group-label">NO RESULTS FOUND</div>`;
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cmd-result-item';
      div.innerHTML = `<i class="fas ${item.icon || 'fa-arrow-right'}"></i> ${item.name}`;
      div.onclick = () => {
        closeSearch();
        if (item.url) window.location.href = item.url;
        else window.location.hash = item.slug;
      };
      cmdResults.appendChild(div);
    });
  };
  window.openSearch = () => {
    if(!cmdModal) return;
    cmdModal.classList.add('active');
    cmdInput.value = '';
    renderCmdResults(searchLinks, "QUICK ACCESS");
    setTimeout(() => cmdInput.focus(), 100);
  };
  window.closeSearch = () => cmdModal && cmdModal.classList.remove('active');
  // Trigger via Ctrl+K
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') closeSearch();
  });
  // Close on overlay click
  if (cmdModal) {
    cmdModal.addEventListener('click', (e) => {
      if (e.target === cmdModal) closeSearch();
    });
  }
  // Search Filtering
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      if (val.length < 1) {
        renderCmdResults(searchLinks, "QUICK ACCESS");
        return;
      }
      const filtered = searchLinks.filter(l => l.name.toLowerCase().includes(val));
      renderCmdResults(filtered, "SEARCH RESULTS");
    });
  }
  // 3. Footer Smart Branch Switcher
  const branchDetails = document.getElementById('branch-details');
  const branches = {
    main: `
              <p><strong>Baao Parish Multi-Purpose Cooperative</strong></p>
              <p>Rizal Street, San Nicolas District, Baao, 4432 <br> Camarines Sur</p>
              <p>Mon-Fri 8:30 AM–2:30 PM</p>
              <p><i class="fas fa-phone"></i> 0542663199</p>`,
    goa: `
              <p><strong>Goa Branch-Baao Parish Multi-Purpose Cooperative</strong></p>
              <p>Rivero Building, San Jose St Goa N/A, 4422 Camarines Sur</p>
              <p>Mon-Fri 8:30 AM–3:30 PM</p>
              <p><i class="fas fa-phone" style="margin-right: 10px;"></i> 09508983131</p>`
  };
  const mapIframes = {
    main: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3880.3040773402536!2d123.36318577508484!3d13.455343886906247!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a197438f68d539%3A0x87a534f84abc3f68!2sBaao%20Parish%20Multi-Purpose%20Cooperative!5e0!3m2!1sen!2sph!4v1776357602995!5m2!1sen!2sph',
    goa: 'https://maps.google.com/maps?q=Goa+Branch-Baao+Parish+Multi-Purpose+Cooperative&t=&z=17&ie=UTF8&iwloc=&output=embed'
  };
  // About Us Sub-Tab Logic
  window.openAboutTab = (tabId, event) => {
    document.querySelectorAll('.about-sub-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
const navContainer = document.querySelector('.about-nav-container'); if (navContainer) {
      const y = navContainer.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  // Stagger Slide-Up Animation (Only on scroll & first load)
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        staggerObserver.unobserve(entry.target); // Runs only once
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.stagger-up').forEach(el => staggerObserver.observe(el));
  // Dedicated function for Branch Section Map Buttons
  window.updateBranchMap = (id, preventScroll = false) => {
    const mapEl = document.querySelector('#branches #shared-branch-map');
    if (mapEl) {
      mapEl.src = mapIframes[id];
      // Scroll down to the map cleanly without changing the URL hash
      const mapContainer = document.getElementById('view-on-maps');
      if (mapContainer && !preventScroll) mapContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };
  window.updateFooterBranch = (id, name) => {
    if (branchDetails) branchDetails.innerHTML = branches[id];
    const displaySpan = document.querySelector('#branch-select-display span');
    if (displaySpan && name) displaySpan.innerText = name;
    // Close specific footer dropdown robustly
    const dropdown = document.querySelector('.footer-branch-dropdown .dropdown-menu');
    if (dropdown) { dropdown.style.display = 'none'; setTimeout(() => dropdown.style.display = '', 100); }
  };
  if (branchDetails) branchDetails.innerHTML = branches['main'];
  // 6. Feedback Gate & Logic
  const mockUser = JSON.parse(localStorage.getItem('baaocoop_user') || 'null');
  const feedbackGate = document.getElementById('feedback-gate');
  const feedbackAuth = document.getElementById('feedback-authenticated');
  if (mockUser && feedbackGate && feedbackAuth) {
    feedbackGate.style.display = 'none';
    feedbackAuth.style.display = 'block';
    const nameInput = document.getElementById('fb-name');
    if (nameInput) nameInput.value = mockUser.name;
  }
  // Star Rating
  let selectedRating = 0;
  document.querySelectorAll('.fb-star').forEach(star => {
    star.addEventListener('mouseenter', () => {
      document.querySelectorAll('.fb-star').forEach(s =>
        s.style.color = parseInt(s.dataset.val) <= parseInt(star.dataset.val) ? '#f59e0b' : '#cbd5e1');
    });
    star.addEventListener('mouseleave', () => {
      document.querySelectorAll('.fb-star').forEach(s =>
        s.style.color = parseInt(s.dataset.val) <= selectedRating ? '#f59e0b' : '#cbd5e1');
    });
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.val);
      document.querySelectorAll('.fb-star').forEach(s =>
        s.style.color = parseInt(s.dataset.val) <= selectedRating ? '#f59e0b' : '#cbd5e1');
    });
  });
  // Render Feedbacks
  const renderFeedbacks = () => {
    const list = document.getElementById('feedback-list');
    if (!list) return;
    const items = JSON.parse(localStorage.getItem('baaocoop_feedbacks') || '[]');
    if (items.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:3rem 0">No feedback yet. Be the first to share!</p>`;
      return;
    }
    list.innerHTML = items.slice().reverse().map(f => `
      <div style="padding:1.2rem;background:var(--bg-alt);border-radius:var(--radius-md);border:var(--glass-border);box-shadow:var(--shadow-sm)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-weight:700;color:var(--text-main)">${f.name}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${f.date}</span>
        </div>
        <div style="margin-bottom:0.6rem">${'★'.repeat(f.rating)}<span style="color:#cbd5e1">${'★'.repeat(5 - f.rating)}</span></div>
        <p style="color:var(--text-muted);font-size:0.92rem;line-height:1.6;margin:0">${f.message}</p>
      </div>
    `).join('');
  };
  renderFeedbacks();
  window.clearFeedbackForm = () => {
    const msgInput = document.getElementById('fb-message');
    if(msgInput) msgInput.value = '';
    selectedRating = 0;
    document.querySelectorAll('.fb-star').forEach(s => s.style.color = '#cbd5e1');
    const fbMsg = document.getElementById('fb-msg');
    if(fbMsg) fbMsg.textContent = '';
  };
  window.submitFeedback = () => {
    const message = document.getElementById('fb-message').value.trim();
    const fbMsg = document.getElementById('fb-msg');
    if (!selectedRating) { fbMsg.style.color = 'var(--primary)'; fbMsg.textContent = 'Please select a star rating.'; return; }
    if (!message) { fbMsg.style.color = 'var(--primary)'; fbMsg.textContent = 'Please write a message.'; return; }
    const feedbacks = JSON.parse(localStorage.getItem('baaocoop_feedbacks') || '[]');
    feedbacks.push({
      name: mockUser ? mockUser.name : 'Verified Member',
      rating: selectedRating,
      message,
      date: new Date().toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })
    });
    localStorage.setItem('baaocoop_feedbacks', JSON.stringify(feedbacks));
    clearFeedbackForm();
    renderFeedbacks();
    fbMsg.style.color = 'var(--secondary)';
    fbMsg.textContent = 'Feedback submitted! Thank you.';
  };
  // 4. Lazy Loading & Animations (Stats Count Up)
  
  // Update Target Values from Admin settings if available
  const storedAssets = localStorage.getItem('baaocoop_assets');
  const storedMembers = localStorage.getItem('baaocoop_members');
  const storedYears = localStorage.getItem('baaocoop_years');
  
  if (storedAssets) { const el = document.querySelector('.count-up[data-target="500"]'); if(el) el.setAttribute('data-target', storedAssets); }
  if (storedMembers) { const el = document.querySelector('.count-up[data-target="15000"]'); if(el) el.setAttribute('data-target', storedMembers); }
  if (storedYears) { const el = document.querySelector('.count-up[data-target="30"]'); if(el) el.setAttribute('data-target', storedYears); }

  const animateCountUp = (el) => {
    const target = parseInt(el.getAttribute('data-target')) || 0;
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const update = () => {
      current += step;
      if (current < target) {
        el.innerText = Math.ceil(current);
        requestAnimationFrame(update);
      } else {
        el.innerText = target;
      }
    };
    update();
  };
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('.count-up');
        counters.forEach(c => {
          if (!c.classList.contains('counted')) {
            c.classList.add('counted');
            animateCountUp(c);
          }
        });
      }
    });
  }, observerOptions);
  document.querySelectorAll('.coop-stats').forEach(el => revealObserver.observe(el));
  // 5. Loan Calculator Logic
  window.selectCalcLoan = (name, icon, event) => {
    // Handle active state
    document.querySelectorAll('.calc-icon-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    // Update Title (Bigger size to match new layout)
    const targetName = document.getElementById('calcTargetName');
    if (targetName) {
      targetName.innerHTML = `<i class="fas ${icon}" style="color:var(--secondary); margin-right:15px; font-size:2.5rem;"></i> ${name}`;
    }
    // Trigger calc update
    calculateLoan();
  };
  window.calculateLoan = () => {
    const amtInput = document.getElementById('calcAmount');
    if (!amtInput) return; // Prevent errors if not on index
    const amt = parseFloat(amtInput.value) || 0;
    const termsEl = document.getElementById('calcTerms');
    const terms = termsEl ? (parseInt(termsEl.value) || 36) : 36;
    if (amt > 0) {
      // Sample computation mirroring the reference
      const serviceFee = amt * 0.03; // 3%
      const lifeIns = 1000;
      const loanProt = 792; // Dummy flat rate based on reference image
      const savingsRet = 68; // Dummy flat rate based on reference image
      const totalDeductions = serviceFee + lifeIns + loanProt + savingsRet;
      const net = amt - totalDeductions;
      const formatPhp = (val) => '₱ ' + val.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      document.getElementById('calcService').value = formatPhp(serviceFee);
      document.getElementById('calcLife').value = formatPhp(lifeIns);
      document.getElementById('calcProtection').value = formatPhp(loanProt);
      document.getElementById('calcSavings').value = formatPhp(savingsRet);
      document.getElementById('calcNet').value = formatPhp(net);
    } else {
      // Reset fields
      ['calcService', 'calcLife', 'calcProtection', 'calcSavings', 'calcNet'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
      });
    }
  };
});