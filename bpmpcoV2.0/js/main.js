import { db } from './config.js';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
document.addEventListener('DOMContentLoaded', async () => {
  function setHeaderHeight() {
  const h = document.querySelector('header')?.offsetHeight || 120;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
setHeaderHeight();
window.addEventListener('resize', setHeaderHeight);
  window.toggleMobileMenu = () => {
    const nav = document.querySelector('.nav-row-2');
    if (nav) nav.classList.toggle('active');
  };
  // Mobile Dropdown Accordion Logic
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.querySelector('.dropdown-menu')) {
      item.addEventListener('click', (e) => {
        // Only trigger on mobile and ignore if clicking an actual link inside the dropdown
        if (window.innerWidth <= 900 && !e.target.closest('.dropdown-menu a')) {
          item.classList.toggle('mobile-expanded');
        }
      });
    }
  });
  // 1. Tab Navigation System (Slug-based)
  const handleRoute = () => {
  const hash = window.location.hash || '#home';
  // Clean up default hash from URL
  if (window.location.hash === '#home') {
    history.replaceState(null, '', window.location.pathname);
  }
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    // Show target tab
    const target = document.querySelector(hash);
    if (target) {
      target.classList.add('active');
      requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
});
    document.body.style.minHeight = '100vh';
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
  window.addEventListener('hashchange', () => {
    handleRoute();
    const mobileNav = document.querySelector('.nav-row-2');
    if (mobileNav) mobileNav.classList.remove('active');
  });
  initArticlesListener();
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
  const chatSessionId = 'guest_' + (localStorage.getItem('baaocoop_chat_id') || (() => { const id = Date.now().toString(36); localStorage.setItem('baaocoop_chat_id', id); return id; })());
  const chatRef = collection(db, 'chat_sessions', chatSessionId, 'messages');
  function extractUrl(text) {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  }
  const SLUG_LABELS = {
    'home': '🏠 Home', 'about': '📖 About Us', 'services': '💼 Products & Services',
    'join-us': '🤝 Join Us', 'forms': '📄 Downloadable Forms', 'calculator': '🧮 Loan Calculator',
    'gallery': '🖼️ Gallery', 'news': '📰 News', 'branches': '📍 Branches',
    'feedback': '💬 Feedback', 'contact': '✉️ Contact Us', 'our-partners': '🤝 Our Partners'
  };
  function getLinkMeta(url) {
    try {
      const parsed = new URL(url);
      const isInternal = parsed.hostname === window.location.hostname || parsed.hostname === '127.0.0.1';
      if (isInternal) {
        const slug = parsed.hash?.replace('#', '') || parsed.pathname.split('/').pop().replace('.html','');
        const label = SLUG_LABELS[slug] || slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
        return { isInternal: true, label, icon: 'fa-arrow-right', color: 'var(--secondary)' };
      }
    } catch(e) {}
    return { isInternal: false, label: url.replace(/^https?:\/\//, '').split('/')[0], icon: 'fa-external-link-alt', color: 'var(--primary)' };
  }
  function renderChatBubble(data, container) {
    const div = document.createElement('div');
    const isUser = data.sender === 'user';
    div.style.cssText = isUser
      ? 'background:var(--primary);color:white;border-radius:12px 12px 0 12px;padding:0.8rem 1rem;max-width:85%;font-size:0.88rem;align-self:flex-end;line-height:1.5;margin-left:auto'
      : 'background:#f1f5f9;border-radius:12px 12px 12px 0;padding:0.8rem 1rem;max-width:85%;font-size:0.88rem;color:var(--text-main);line-height:1.5';
    const url = extractUrl(data.text);
    if (!isUser && url) {
      const meta = getLinkMeta(url);
      const label = data.text.replace(url, '').trim();
      const target = meta.isInternal ? '_self' : '_blank';
      div.innerHTML = `
        ${label ? `<p style="margin:0 0 0.5rem;font-size:0.85rem;color:var(--text-muted)">${label}</p>` : ''}
        <a href="${url}" target="${target}" rel="noopener noreferrer"
          style="display:flex;align-items:center;gap:0.75rem;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem 1rem;text-decoration:none;color:var(--text-main);transition:0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.06)"
          onmouseover="this.style.borderColor='var(--primary)'"
          onmouseout="this.style.borderColor='#e2e8f0'">
          <div style="width:36px;height:36px;border-radius:6px;background:rgba(220,38,38,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${meta.isInternal ? 'fa-arrow-right' : 'fa-link'}" style="color:${meta.color};font-size:0.9rem"></i>
          </div>
          <div style="overflow:hidden">
            <p style="margin:0;font-weight:600;font-size:0.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${meta.label}</p>
            <p style="margin:0;font-size:0.72rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${url}</p>
          </div>
          <i class="fas fa-external-link-alt" style="color:var(--text-muted);font-size:0.75rem;margin-left:auto;flex-shrink:0"></i>
        </a>`;
    } else {
      div.textContent = data.text;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
  let chatListenerStarted = false;
  async function startChatListener() {
    if (chatListenerStarted) return;
    // Check if session already ended before subscribing
    const { doc: fdoc, getDoc: fget } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const sessSnap = await fget(fdoc(db, 'chat_sessions', chatSessionId));
    if (sessSnap.exists() && sessSnap.data().ended) { resetChat(); return; }
    chatListenerStarted = true;
    const q = query(chatRef, orderBy('ts', 'asc'));
    onSnapshot(q, async snap => {
      const messages = document.getElementById('chat-messages');
      if (!messages) return;
      messages.innerHTML = '';
      snap.docs.forEach(d => renderChatBubble(d.data(), messages));
      // Check if admin ended session
      const { doc: fdoc, getDoc: fget } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      const sessSnap = await fget(fdoc(db, 'chat_sessions', chatSessionId));
      if (sessSnap.exists() && sessSnap.data().ended) {
        // Show email capture then reset after delay
        const body = document.getElementById('chat-message-body');
        if (body && !document.getElementById('chat-email-capture')) {
          const emailDiv = document.createElement('div');
          emailDiv.id = 'chat-email-capture';
          emailDiv.style.cssText = 'background:#f8fafc;border-radius:var(--radius-sm);padding:1rem;display:flex;flex-direction:column;gap:0.6rem;border:1px solid #e2e8f0;margin-top:0.5rem';
          emailDiv.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);margin:0">📬 <strong>Stay in the loop!</strong> Drop your email to receive Baao Coop updates (optional):</p>
            <div style="display:flex;gap:0.5rem"><input id="chat-email-input" type="email" placeholder="your@email.com" style="flex:1;padding:0.5rem 0.8rem;border:1px solid #e2e8f0;border-radius:var(--radius-sm);font-size:0.82rem;outline:0">
            <button onclick="submitChatEmail()" style="background:var(--primary);color:white;border:0;border-radius:var(--radius-sm);padding:0.5rem 0.8rem;font-size:0.8rem;font-weight:600;cursor:pointer">Send</button></div>
            <button onclick="resetChat()" style="background:none;border:none;color:var(--text-muted);font-size:0.78rem;cursor:pointer;text-align:center;margin-top:0.2rem">Skip & Close</button>`;
          body.appendChild(emailDiv);
          // Disable input
          const inp = document.getElementById('chat-input');
          if (inp) { inp.disabled = true; inp.placeholder = 'Chat has ended.'; }
        }
      }
    });
  }
  window.submitChatEmail = async () => {
    const emailVal = document.getElementById('chat-email-input')?.value.trim();
    if (emailVal) {
      const { doc: fdoc, setDoc: fset } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
      await fset(fdoc(db, 'chat_sessions', chatSessionId), { subscribedEmail: emailVal }, { merge: true });
    }
    resetChat();
  };
  window.guestEndChat = async () => {
    if (!confirm('End this chat session?')) return;
    const { doc: fdoc, setDoc: fset } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await fset(fdoc(db, 'chat_sessions', chatSessionId), { ended: true, endedAt: new Date().toISOString(), endedBy: 'guest' }, { merge: true });
    // Minimize then reset
    if (window.chatOpen) toggleChat();
    setTimeout(() => resetChat(), 350);
  };
  window.resetChat = () => {
    localStorage.removeItem('baaocoop_chat_name');
    localStorage.removeItem('baaocoop_chat_id');
    chatGuestName = '';
    chatListenerStarted = false;
    // Reset UI
    const gate = document.getElementById('chat-name-gate');
    const body = document.getElementById('chat-message-body');
    const messages = document.getElementById('chat-messages');
    const inp = document.getElementById('chat-input');
    const nameInp = document.getElementById('chat-name-input');
    if (gate) gate.style.display = 'flex';
    if (body) { body.style.display = 'none'; }
    if (messages) messages.innerHTML = '';
    if (inp) { inp.disabled = false; inp.placeholder = 'Type a message...'; }
    if (nameInp) nameInp.value = '';
    document.getElementById('chat-email-capture')?.remove();
    // Close panel
    window.chatOpen = true; toggleChat();
  };
  let chatGuestName = localStorage.getItem('baaocoop_chat_name') || '';
  window.askChatName = async () => {
    const input = document.getElementById('chat-name-input');
    const val = input ? input.value.trim() : '';
    if (!val) { if(input) input.style.border='1px solid var(--primary)'; return; }
    chatGuestName = val;
    localStorage.setItem('baaocoop_chat_name', val);
    // Save name to session doc
    const { doc: fdoc, setDoc: fset } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await fset(fdoc(db, 'chat_sessions', chatSessionId), { guestName: val, startedAt: new Date().toISOString() }, { merge: true });
    document.getElementById('chat-name-gate').style.display = 'none';
    document.getElementById('chat-message-body').style.display = 'flex';
    startChatListener();
  };
  window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    startChatListener();
    await addDoc(chatRef, { sender: 'user', text: val, ts: serverTimestamp() });
  };
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
    if (window.chatOpen) {
      if (chatGuestName) {
        const gate = document.getElementById('chat-name-gate');
        const body = document.getElementById('chat-message-body');
        if (gate) gate.style.display = 'none';
        if (body) body.style.display = 'flex';
        startChatListener();
      }
    }
  };
  handleRoute(); // Run on initial load
// --- SYNC DATA FROM ADMIN ---
  try {
    const heroSnap = await getDoc(doc(db, 'settings', 'home_hero'));
    if (heroSnap.exists()) {
        const { h2, h1, p } = heroSnap.data();
        if (h2 && document.getElementById('home-hero-h2')) document.getElementById('home-hero-h2').textContent = h2;
        if (h1 && document.getElementById('home-hero-h1')) document.getElementById('home-hero-h1').textContent = h1;
        if (p && document.getElementById('home-hero-p')) document.getElementById('home-hero-p').textContent = p;
    }
} catch(e) { console.error('Failed to load home hero:', e); }
  try {
    const taglineSnap = await getDoc(doc(db, 'settings', 'home_hero'));
    if (taglineSnap.exists() && taglineSnap.data().tagline) {
        const savedTagline = taglineSnap.data().tagline;
        document.querySelectorAll('.hero-island h1, #about-who h1').forEach(h1 => {
            if (h1.textContent.includes('Rooted in Faith')) h1.textContent = savedTagline;
        });
    }
  } catch(e) { console.error('Failed to load tagline:', e); }
  // --- LOAD BANNERS & MEDIA FROM FIREBASE ---
  try {
    const bannerSnap = await getDoc(doc(db, 'settings', 'banners'));
    if (bannerSnap.exists()) {
      const banners = bannerSnap.data();
      document.querySelectorAll('.tab-pane').forEach(pane => {
        if (banners[pane.id]) {
          const img = pane.querySelector('.hero-banner img');
          if (img) img.src = banners[pane.id];
        }
      });
    }
    const mediaSnap = await getDoc(doc(db, 'settings', 'media'));
    if (mediaSnap.exists() && mediaSnap.data().links) {
      const grid = document.getElementById('index-media-grid');
      if (grid) {
        const links = mediaSnap.data().links;
        grid.setAttribute('data-count', Math.min(links.length, 4));
        if (links.length > 4) grid.classList.add('many-vids');
        grid.innerHTML = links.map((item, i) => {
  const src = typeof item === 'string' ? item : (item.url || '');
  const title = typeof item === 'object' ? (item.title || '') : '';
  const isFb = src.includes('facebook.com');
  const isDrive = src.includes('drive.google.com');
  const isYt = src.includes('youtube.com') || src.includes('youtu.be');
  return `
  <div style="display:flex;flex-direction:column;gap:0;border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-md);background:#fff">
    <div class="vid-wrapper ${isDrive ? 'drive-wrapper' : ''}" style="border-radius:0;box-shadow:none;margin:0">
    <iframe src="${src}" allowfullscreen loading="lazy"
      ${isFb ? 'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"' : ''}
    ></iframe>
  </div>
    <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:#fff">
      <img src="assets/images/logo.png" style="width:36px;height:36px;border-radius:50%;object-fit:contain;flex-shrink:0;border:1px solid rgba(0,0,0,0.08)">
      <div style="overflow:hidden">
        <p style="font-weight:700;font-size:0.88rem;color:var(--text-main);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title || 'Baao Coop Video'}</p>
        <p style="font-size:0.75rem;color:var(--text-muted);margin:0">Baao Parish Multi-Purpose Cooperative</p>
      </div>
    </div>
  </div>`;
}).join('');
      }
    }
  } catch(e) {
    console.error('Failed to load banners/media:', e);
  }
  // --- RENDER DYNAMIC ABOUT DATA ---
  try {
        // 1. Load Text & Graphic
        const aboutSnap = await getDoc(doc(db, 'settings', 'about_us'));
        if (aboutSnap.exists()) {
          const data = aboutSnap.data();
          const fieldMapping = {
            'admin-about-hero-h2': 'about-hero-h2', 'admin-about-hero-h1': 'about-hero-h1', 'admin-about-hero-p': 'about-hero-p',
            'admin-who-h3': 'about-who-h3', 'admin-who-h1': 'about-who-h1', 'admin-who-p': 'about-who-p',
            'admin-identity-h3': 'about-identity-h3', 'admin-identity-h1': 'about-identity-h1', 'admin-identity-p': 'about-identity-p',
            'admin-card-1': 'about-card-1', 'admin-card-2': 'about-card-2', 'admin-card-3': 'about-card-3'
          };
          for (const [adminKey, frontId] of Object.entries(fieldMapping)) {
            const el = document.getElementById(frontId);
            if (data[adminKey] && el) {
              if (adminKey.endsWith('-p')) el.innerHTML = data[adminKey].replace(/\n/g, '<br><br>');
              else el.textContent = data[adminKey];
            }
          }
          if (data['who_img'] && document.getElementById('about-who-graphic')) {
            document.getElementById('about-who-graphic').style.backgroundImage = `url('${data['who_img']}')`;
            document.getElementById('about-who-graphic').style.boxShadow = 'var(--shadow-md)';
          }
        }
        // 2. Load History
        const histTl = document.getElementById('history-timeline');
        if (histTl) {
          const histSnap = await getDoc(doc(db, 'settings', 'history'));
          let histData = histSnap.exists() ? (histSnap.data().items || []) : [];
          if (histData.length === 0) {
              histData = [
                  {year: '1963', title: 'Foundation', desc: 'Registered as Baao Parish Cooperative Credit Union, Inc. on August 26, 1963, starting with 50 members.'},
                  {year: '1991', title: 'Formal Registration', desc: 'Re-registered with the Cooperative Development Authority under Republic Act No. 6938.'},
                  {year: 'Today', title: 'Continuing the Mission', desc: 'BPMPCO continues to uphold cooperative values while delivering inclusive financial services.'}
              ];
          }
          histTl.innerHTML = histData.map(item => `<div class="tl-item"><div class="tl-bullet"></div><div class="tl-card"><h2 style="color:var(--secondary);margin-bottom:0.5rem">${item.year}</h2><h4 style="margin-bottom:0.5rem">${item.title}</h4><p style="color:var(--text-muted);font-size:0.9rem">${item.desc}</p></div></div>`).join('');
        }
        // 3. Load Executives
        const execsGrid = document.getElementById('execs-grid');
        if (execsGrid) {
          const execsSnap = await getDoc(doc(db, 'settings', 'execs'));
          let eData = execsSnap.exists() ? (execsSnap.data().items || []) : [];
          if (eData.length === 0) eData = [{name: 'John Doe', role: 'Board of Director'}, {name: 'Jane Smith', role: 'Board of Director'}];
          execsGrid.innerHTML = eData.map(e => `<div class="team-card"><img class="team-img" src="${e.img || 'assets/images/logo.png'}" style="object-fit:cover"><div class="team-info"><h4>${e.name}</h4><p>${e.role}</p></div></div>`).join('');
        }
        // 4. Load Management
        const mgmtGrid = document.getElementById('mgmt-grid');
        if (mgmtGrid) {
          const mgmtSnap = await getDoc(doc(db, 'settings', 'mgmt'));
          let mData = mgmtSnap.exists() ? (mgmtSnap.data().items || []) : [];
          if (mData.length === 0) mData = [{name: 'Sarah Connor', role: 'Chief Executive Officer', desc: 'Sarah brings over 20 years of cooperative management experience.'}, {name: 'Alan Wake', role: 'Operations Manager'}, {name: 'Jill Valentine', role: 'Finance Head'}];
          mgmtGrid.innerHTML = mData.map((m, i) => {
              if (i === 0 || (m.role && (m.role.toLowerCase().includes('chief') || m.role.toLowerCase().includes('ceo')))) {
                  return `<div class="team-card ceo-card"><img class="team-img" src="${m.img || 'assets/images/logo.png'}" style="object-fit:cover"><div class="team-info"><h2 style="color:var(--secondary);font-size:1.8rem;margin-bottom:0.5rem">${m.name}</h2><p style="font-size:1rem;color:var(--primary);margin-bottom:1rem">${m.role}</p><p style="color:var(--text-muted);text-transform:none;font-weight:400;font-size:0.95rem;line-height:1.6">${m.desc || ''}</p></div></div>`;
              }
              return `<div class="team-card"><img class="team-img" src="${m.img || 'assets/images/logo.png'}" style="object-fit:cover"><div class="team-info"><h4>${m.name}</h4><p>${m.role}</p></div></div>`;
          }).join('');
        }
      } catch (err) {
    console.error('Error loading dynamic About data from Firebase:', err);
  }
  // --- RENDER SERVICES & MEMBERSHIP ---
  try {
      const sSnap = await getDoc(doc(db, 'settings', 'services'));
      if (sSnap.exists() && sSnap.data().categories && sSnap.data().categories.length > 0) {
          const container = document.getElementById('dynamic-services-container');
          if (container) {
              const cats = sSnap.data().categories;
              let html = '';
              for(let i=0; i<cats.length; i+=2) {
                  html += '<div class="grid-2">';
                  html += `<div class="service-category"><h3><i class="fas fa-box"></i> ${cats[i].name}</h3><ul class="list-2-col">${cats[i].items.map(it=>`<li>${it}</li>`).join('')}</ul></div>`;
                  if(cats[i+1]) html += `<div class="service-category"><h3><i class="fas fa-box"></i> ${cats[i+1].name}</h3><ul class="list-2-col">${cats[i+1].items.map(it=>`<li>${it}</li>`).join('')}</ul></div>`;
                  html += '</div>';
              }
              container.innerHTML = html;
          }
      }
  } catch(e) { console.error('Services Rendering Error:', e); }
  try {
      const mSnap = await getDoc(doc(db, 'settings', 'membership_details'));
      if (mSnap.exists()) {
          const d = mSnap.data();
          if (d.requirements && d.requirements.trim() && document.getElementById('front-req-list')) {
              document.getElementById('front-req-list').innerHTML = d.requirements.split('\n').filter(Boolean).map(line => `<li>${line}</li>`).join('');
          }
          if (d.payments && d.payments.trim() && document.getElementById('front-pay-list')) {
              document.getElementById('front-pay-list').innerHTML = d.payments.split('\n').filter(Boolean).map(line => `<li>${line}</li>`).join('');
          }
      }
  } catch(e) { console.error('Membership Rendering Error:', e); }
  // --- RENDER DYNAMIC FORMS ---
  try {
    const formsSnap = await getDoc(doc(db, 'settings', 'form_links'));
    const savedForms = formsSnap.exists() ? (formsSnap.data().items || []) : [];
    const formsGrid = document.getElementById('dynamic-forms-grid');
    if (formsGrid) {
        if (savedForms.length > 0) {
           formsGrid.innerHTML = savedForms.map(form => {
    const m = form.url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
const previewUrl = m ? `https://drive.google.com/file/d/${m[1]}/preview?usp=sharing` : form.url;
const downloadUrl = m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : form.url;
return `<a href="${previewUrl}" target="_blank" class="form-card">
        <i class="fas fa-file-pdf"></i>
<div style="display:flex;align-items:center;justify-content:space-between;width:100%">
    <h3 style="color:var(--text-main);font-size:1.1rem">${form.title}</h3>
    <i class="fas fa-eye" style="color:var(--primary);font-size:1rem;flex-shrink:0"></i>
</div>
    </a>`;
}).join('');
        } else {
            formsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">No forms available at the moment.</div>`;
        }
    }
  } catch(e) { console.error('Failed to load form_links:', e); }
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
    { name: 'Feedback', icon: 'fa-comment-dots', slug: '#feedback' },
    { name: 'Contact Us', icon: 'fa-envelope', slug: '#contact' }
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
  let branches = {
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
  let mapIframes = {
    main: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3880.3040773402536!2d123.36318577508484!3d13.455343886906247!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33a197438f68d539%3A0x87a534f84abc3f68!2sBaao%20Parish%20Multi-Purpose%20Cooperative!5e0!3m2!1sen!2sph!4v1776357602995!5m2!1sen!2sph',
    goa: 'https://maps.google.com/maps?q=Goa+Branch-Baao+Parish+Multi-Purpose+Cooperative&t=&z=17&ie=UTF8&iwloc=&output=embed'
  };
  // Fetch branches dynamically
  (async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'branches'));
      if (snap.exists() && snap.data().items && snap.data().items.length > 0) {
        const items = snap.data().items;
        branches = {}; mapIframes = {};
        const listEl = document.getElementById('footer-branch-list');
              if (listEl) listEl.innerHTML = '';
              const branchesGrid = document.querySelector('#branches .grid-2');
              if (branchesGrid) branchesGrid.innerHTML = '';
              items.forEach((b, i) => {
                const id = 'branch_' + i;
                const shortName = b.name.includes('Main') ? 'Main Branch' : b.name.replace(' Branch', '') + ' Branch';
                branches[id] = `<p><strong>${b.name}</strong></p><p>${b.address}</p><p>${b.hours}</p><p><i class="fas fa-phone"></i> ${b.phone}</p>`;
                if (b.mapUrl) mapIframes[id] = b.mapUrl;
                if (listEl) {
                  listEl.innerHTML += `<div onclick="updateFooterBranch('${id}','${shortName}');this.parentElement.style.display='none'" style="display:block;cursor:pointer;color:#cbd5e1;padding:0.6rem 1rem;border-radius:4px;transition:0.2s;margin-bottom:0.2rem;font-size:0.9rem" onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.color='white'" onmouseout="this.style.background='transparent';this.style.color='#cbd5e1'">${shortName}</div>`;
                }
                if (branchesGrid) {
                  const mapBtn = b.mapUrl ? `<a href="javascript:void(0)" style="color:var(--primary);font-weight:600;display:inline-flex;align-items:center;gap:.5rem;background:none;border:none;cursor:pointer;font-size:1rem" onclick="updateBranchMap('${id}')"><i class="fas fa-map-location-dot"></i> View Branch</a>` : '';
                  branchesGrid.innerHTML += `
                    <div class="service-card">
                      <h3 style="color:var(--secondary);margin-bottom:1rem;font-size:1.1rem;line-height:1.4"><i class="fas fa-building" style="margin-right:8px"></i>${b.name}</h3>
                      ${b.address ? `<p style="color:var(--text-muted);margin-bottom:.5rem"><i class="fas fa-map-marker-alt" style="color:var(--primary);width:25px"></i>${b.address}</p>` : ''}
                      ${b.hours ? `<p style="color:var(--text-muted);margin-bottom:.5rem"><i class="fas fa-clock" style="color:var(--primary);width:25px"></i>${b.hours}</p>` : ''}
                      ${b.email ? `<p style="color:var(--text-muted);margin-bottom:.5rem"><i class="fas fa-envelope" style="color:var(--primary);width:25px"></i>${b.email}</p>` : ''}
                      ${b.phone ? `<p style="color:var(--text-muted);margin-bottom:.5rem"><i class="fas fa-phone" style="color:var(--primary);width:25px"></i>${b.phone}</p>` : ''}
                      ${mapBtn}
                    </div>
                  `;
                }
              });
              if (branchDetails) branchDetails.innerHTML = branches['branch_0'];
              const displaySpan = document.querySelector('#branch-select-display span');
              if (displaySpan) displaySpan.innerText = items[0].name.includes('Main') ? 'Main Branch' : items[0].name.replace(' Branch', '') + ' Branch';
              const mapContainer = document.getElementById('view-on-maps');
              if (mapContainer) {
                mapContainer.style.display = Object.keys(mapIframes).length > 0 ? 'block' : 'none';
              }
            }
          } catch(e) { console.error('Failed to load dynamic branches:', e); }
  })();
  window.openPdfPreview = (previewUrl, downloadUrl, title) => {
    const existing = document.getElementById('pdf-preview-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'pdf-preview-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem';
    modal.innerHTML = `
        <div style="background:white;border-radius:var(--radius-md);width:100%;max-width:860px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.4)">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.85rem 1.25rem;background:#1e293b;flex-shrink:0">
                <div style="display:flex;align-items:center;gap:0.75rem">
                    <i class="fas fa-file-pdf" style="color:var(--primary);font-size:1.2rem"></i>
                    <span style="color:white;font-weight:700;font-size:0.95rem">${title}</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem">
                    <a href="${downloadUrl}" download="${title}.pdf" style="background:var(--primary);color:white;padding:0.45rem 1rem;border-radius:var(--radius-sm);font-size:0.82rem;font-weight:700;display:flex;align-items:center;gap:0.5rem;text-decoration:none">
                        <i class="fas fa-download"></i> Download
                    </a>
                    <button onclick="document.getElementById('pdf-preview-modal').remove()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <iframe src="${previewUrl}" style="flex:1;border:none;width:100%"></iframe>
        </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
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
  window.staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        window.staggerObserver.unobserve(entry.target); // Runs only once
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.stagger-up').forEach(el => window.staggerObserver.observe(el));
  // Dedicated function for Branch Section Map Buttons
  window.updateBranchMap = (id, preventScroll = false) => {
    const mapEl = document.querySelector('#branches #shared-branch-map');
    if (mapEl && mapIframes[id]) {
      mapEl.src = mapIframes[id];
      // Scroll down to the map cleanly without changing the URL hash
      const mapContainer = document.getElementById('view-on-maps');
      if (mapContainer && !preventScroll) mapContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };
  window.updateFooterBranch = (id, name) => {
    if (branchDetails) branchDetails.innerHTML = branches[id] || '';
    const displaySpan = document.querySelector('#branch-select-display span');
    if (displaySpan && name) displaySpan.innerText = name;
    // Close specific footer dropdown robustly
    const dropdown = document.getElementById('footer-branch-list');
    if (dropdown) { dropdown.style.display = 'none'; }
  };
  if (branchDetails) branchDetails.innerHTML = branches['main'];
  // 6. Feedback Gate & Logic
  const feedbackGate = document.getElementById('feedback-gate');
  const feedbackAuth = document.getElementById('feedback-authenticated');
  const nameInput = document.getElementById('fb-name');
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    const loginBtn = document.getElementById('nav-login-btn');
    const joinBtn = document.getElementById('nav-join-btn');
    const memberBtn = document.getElementById('nav-member-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (joinBtn) joinBtn.style.display = 'none';
      if (memberBtn) {
        memberBtn.style.display = 'inline-flex';
        memberBtn.innerHTML = '<i class="fas fa-user-circle"></i> Member Portal';
        memberBtn.href = 'members.html';
      }
      if (logoutBtn) logoutBtn.style.display = 'inline-flex';
      try {
        const snap = await getDoc(doc(db, 'members', user.uid));
        const data = snap.exists() ? snap.data() : { firstName: user.displayName || 'Member' };
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.email.split('@')[0];
        if (feedbackGate && feedbackAuth) {
          feedbackGate.style.display = 'none';
          feedbackAuth.style.display = 'block';
          if (nameInput) nameInput.value = fullName;
        }
      } catch(e) { console.error('Error fetching user for feedback:', e); }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (joinBtn) joinBtn.style.display = 'inline-block';
      if (memberBtn) memberBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (feedbackGate && feedbackAuth) {
        feedbackGate.style.display = 'flex';
        feedbackAuth.style.display = 'none';
        if (nameInput) nameInput.value = '';
      }
    }
  });
  window.indexLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };
  window.gateLogin = async () => {
    const email = document.getElementById('gate-email').value;
    const pass = document.getElementById('gate-pass').value;
    const msg = document.getElementById('gate-msg');
    if (!email || !pass) { msg.textContent = 'Please enter email and password.'; return; }
    try {
      msg.textContent = 'Signing in...';
      await signInWithEmailAndPassword(auth, email, pass);
      msg.textContent = '';
    } catch (err) {
      msg.textContent = 'Invalid credentials. Please try again.';
    }
  };
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
  const renderFeedbacks = async () => {
    const list = document.getElementById('feedback-list');
    if (!list) return;
    let items = [];
    try {
        const snap = await getDoc(doc(db, 'settings', 'feedbacks'));
        if (snap.exists()) items = snap.data().items || [];
    } catch(e) { console.error('Failed to load feedbacks:', e); }
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
  window.submitFeedback = async () => {
    const message = document.getElementById('fb-message').value.trim();
    const fbMsg = document.getElementById('fb-msg');
    if (!selectedRating) { fbMsg.style.color = 'var(--primary)'; fbMsg.textContent = 'Please select a star rating.'; return; }
    if (!message) { fbMsg.style.color = 'var(--primary)'; fbMsg.textContent = 'Please write a message.'; return; }
    try {
        const snap = await getDoc(doc(db, 'settings', 'feedbacks'));
        const feedbacks = snap.exists() ? (snap.data().items || []) : [];
        const fbName = document.getElementById('fb-name') ? document.getElementById('fb-name').value : 'Verified Member';
        feedbacks.push({
            name: fbName,
            rating: selectedRating,
            message,
            date: new Date().toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })
        });
        await setDoc(doc(db, 'settings', 'feedbacks'), { items: feedbacks }, { merge: true });
        clearFeedbackForm();
        renderFeedbacks();
        fbMsg.style.color = 'var(--secondary)';
        fbMsg.textContent = 'Feedback submitted! Thank you.';
    } catch(e) {
        console.error(e);
        fbMsg.style.color = 'var(--primary)';
        fbMsg.textContent = 'Failed to submit. Please try again.';
    }
  };
  // 4. Lazy Loading & Animations (Stats Count Up)
  // Update Target Values from Admin settings if available
  try {
    const statsSnap = await getDoc(doc(db, 'settings', 'about_stats'));
    if (statsSnap.exists()) {
        const stats = statsSnap.data();
        if (stats.assets) { const el = document.querySelector('.count-up[data-target="500"]'); if(el) el.setAttribute('data-target', stats.assets); }
        if (stats.members) { const el = document.querySelector('.count-up[data-target="15000"]'); if(el) el.setAttribute('data-target', stats.members); }
        if (stats.years) { const el = document.querySelector('.count-up[data-target="30"]'); if(el) el.setAttribute('data-target', stats.years); }
    }
  } catch(e) { console.error('Failed to load stats:', e); }
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
let _galleryAlbums=[];let galleryCurrentAlbum=null;let lightboxIndex=0;let lightboxPhotos=[];
async function getAlbums(){return _galleryAlbums;}
(async()=>{
    try{
        const snap=await getDoc(doc(db,'settings','gallery'));
        if(snap.exists()) _galleryAlbums=snap.data().albums||[];
    }catch(e){console.error('Failed to load gallery:',e);}
    renderGalleryDropdown();
})();
function toggleGalleryDropdown(){const list=document.getElementById('gallery-dropdown-list');const chevron=document.getElementById('gallery-dropdown-chevron');const isOpen=list.style.display!=='none';list.style.display=isOpen?'none':'block';chevron.style.transform=isOpen?'rotate(0deg)':'rotate(180deg)';}
let currentGalleryPage = 1;
const GALLERY_PER_PAGE = 24;
async function selectGalleryAlbum(id){const albums=await getAlbums();const album=albums.find(a=>a.id===id);if(!album)return;galleryCurrentAlbum=album;currentGalleryPage=1;document.getElementById('gallery-selected-label').textContent=album.title;document.getElementById('gallery-dropdown-list').style.display='none';document.getElementById('gallery-dropdown-chevron').style.transform='rotate(0deg)';const infoEl=document.getElementById('gallery-album-info');const metaEl=document.getElementById('gallery-album-meta');const descEl=document.getElementById('gallery-album-desc');const metaParts=[album.date?`<span><i class="fas fa-calendar-alt"style="margin-right:4px;color:var(--primary)"></i>${album.date}</span>`:'',album.location?`<span><i class="fas fa-map-marker-alt"style="margin-right:4px;color:var(--primary)"></i>${album.location}</span>`:''].filter(Boolean).join('<span style="color:#cbd5e1;margin:0 0.5rem">|</span>');metaEl.innerHTML=metaParts;descEl.textContent=album.desc||'';infoEl.style.display='block';renderGalleryGrid(album);}
window.changeGalleryPage = (dir) => {
    currentGalleryPage += dir;
    renderGalleryGrid(galleryCurrentAlbum);
    document.getElementById('gallery-album-selector').scrollIntoView({behavior: 'smooth', block: 'start'});
};
function renderGalleryGrid(album){
    const grid=document.getElementById('gallery-grid');
    const empty=document.getElementById('gallery-empty');
    let pagination=document.getElementById('gallery-pagination');
    if(!pagination) {
        pagination = document.createElement('div');
        pagination.id = 'gallery-pagination';
        pagination.style.cssText = 'display:flex;justify-content:center;gap:1rem;margin-top:2rem;padding:0 2rem;width:100%';
        grid.parentNode.insertBefore(pagination, grid.nextSibling);
    }
    const photos=album.photos||[];
    if(photos.length===0){
        grid.style.display='none'; pagination.style.display='none'; empty.style.display='flex';
        empty.querySelector('h3').textContent='No Photos in This Album';
        empty.querySelector('p').textContent='Photos will appear here once the admin adds them.';
        return;
    }
    empty.style.display='none'; grid.style.display='grid';
    const totalPages = Math.ceil(photos.length / GALLERY_PER_PAGE);
    if(currentGalleryPage < 1) currentGalleryPage = 1;
    if(currentGalleryPage > totalPages) currentGalleryPage = totalPages;
    const startIdx = (currentGalleryPage - 1) * GALLERY_PER_PAGE;
    const currentPhotos = photos.slice(startIdx, startIdx + GALLERY_PER_PAGE);
    grid.innerHTML=currentPhotos.map((url,i)=> {
        const absoluteIdx = startIdx + i;
        return `<div onclick="openLightbox(${absoluteIdx})"style="width:100%;aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:0.2s;background:#0f172a"onmouseover="this.style.borderColor='var(--primary)';this.style.transform='scale(1.03)'"onmouseout="this.style.borderColor='transparent';this.style.transform='scale(1)'"><img src="${url}"loading=lazy style="width:100%;height:100%;object-fit:cover;display:block"></div>`;
    }).join('');
    lightboxPhotos=photos;
    if(totalPages > 1) {
        pagination.style.display='flex';
        pagination.innerHTML = `
            <button class="btn btn-secondary" onclick="changeGalleryPage(-1)" ${currentGalleryPage === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}><i class="fas fa-chevron-left"></i> Prev</button>
            <span style="display:flex;align-items:center;font-weight:700;color:var(--text-muted)">Page ${currentGalleryPage} of ${totalPages}</span>
            <button class="btn btn-secondary" onclick="changeGalleryPage(1)" ${currentGalleryPage === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>Next <i class="fas fa-chevron-right"></i></button>
        `;
    } else {
        pagination.style.display='none';
    }
}
async function renderGalleryDropdown(){const list=document.getElementById('gallery-dropdown-list');const grid=document.getElementById('gallery-grid');const empty=document.getElementById('gallery-empty');const albums=await getAlbums();if(!list)return;if(albums.length===0){list.innerHTML='';grid.style.display='none';empty.style.display='flex';empty.querySelector('h3').textContent='No Albums Yet';empty.querySelector('p').textContent='Photo albums from Baao Coop events and activities will appear here.';document.getElementById('gallery-album-info').style.display='none';document.getElementById('gallery-selected-label').textContent='ALL PROGRAMS';return;}
empty.style.display='none';list.innerHTML=albums.map(album=>`<div onclick="selectGalleryAlbum('${album.id}')"style="padding:0.9rem 1.2rem;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.04);transition:0.15s"onmouseover="this.style.background='rgba(220,38,38,0.05)'"onmouseout="this.style.background='transparent'"><p style="font-weight:700;color:var(--text-main);margin:0 0 0.2rem;font-size:0.95rem">${album.title}</p><p style="font-size:0.78rem;color:var(--text-muted);margin:0;display:flex;gap:0.75rem;flex-wrap:wrap">${album.date?`<span><i class="fas fa-calendar-alt"style="margin-right:3px"></i>${album.date}</span>`:''}
${album.location?`<span><i class="fas fa-map-marker-alt"style="margin-right:3px"></i>${album.location}</span>`:''}</p></div>`).join('');selectGalleryAlbum(albums[0].id);}
function openLightbox(index){lightboxIndex=index;const lb=document.getElementById('gallery-lightbox');lb.style.display='flex';document.body.style.overflow='hidden';updateLightbox();}
function closeLightbox(){document.getElementById('gallery-lightbox').style.display='none';document.body.style.overflow='';}
function lightboxNav(dir){lightboxIndex=(lightboxIndex+dir+lightboxPhotos.length)%lightboxPhotos.length;updateLightbox();}
function updateLightbox(){const img=document.getElementById('lightbox-img');const counter=document.getElementById('lightbox-counter');const thumbsEl=document.getElementById('lightbox-thumbs');img.src=lightboxPhotos[lightboxIndex];counter.textContent=`${lightboxIndex+1}/${lightboxPhotos.length}`;thumbsEl.innerHTML=lightboxPhotos.map((url,i)=>`<div onclick="lightboxIndex=${i};updateLightbox()"style="width:60px;height:60px;flex-shrink:0;border-radius:5px;overflow:hidden;cursor:pointer;border:2px solid ${i === lightboxIndex ? 'var(--primary)' : 'transparent'};transition:0.2s;opacity:${i === lightboxIndex ? '1' : '0.5'}"><img src="${url}"style="width:100%;height:100%;object-fit:cover"></div>`).join('');const activeThumb=thumbsEl.children[lightboxIndex];if(activeThumb)activeThumb.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}
document.addEventListener('keydown',e=>{const lb=document.getElementById('gallery-lightbox');if(!lb||lb.style.display==='none')return;if(e.key==='ArrowLeft')lightboxNav(-1);if(e.key==='ArrowRight')lightboxNav(1);if(e.key==='Escape')closeLightbox();});document.addEventListener('click',e=>{const selector=document.getElementById('gallery-album-selector');if(selector&&!selector.contains(e.target)){const list=document.getElementById('gallery-dropdown-list');const chevron=document.getElementById('gallery-dropdown-chevron');if(list)list.style.display='none';if(chevron)chevron.style.transform='rotate(0deg)';}});async function refreshGallery(){
    try{
        const snap=await getDoc(doc(db,'settings','gallery'));
        if(snap.exists()) _galleryAlbums=snap.data().albums||[];
    }catch(e){console.error('Failed to refresh gallery:',e);}
    galleryCurrentAlbum=null;
    renderGalleryDropdown();
}
window.addEventListener('hashchange',()=>{if(window.location.hash==='#gallery')refreshGallery();});if(window.location.hash==='#gallery')refreshGallery();document.querySelector('a[href="#gallery"]')?.addEventListener('click',refreshGallery);window.submitContactForm = async (e) => {
    const form = e.target.closest('.service-card').querySelector('form');
    const inputs = form.querySelectorAll('input, textarea');
    const name = inputs[0].value.trim(), email = inputs[1].value.trim(), subject = inputs[2].value.trim(), message = inputs[3].value.trim();
    const msgEl = document.getElementById('contact-msg');
    if (!name || !email || !subject || !message) { msgEl.style.color = 'var(--primary)'; msgEl.textContent = 'Please fill in all fields.'; return; }
    try {
        const snap = await getDoc(doc(db, 'settings', 'contact_submissions'));
        const items = snap.exists() ? (snap.data().items || []) : [];
        items.push({ name, email, subject, message, date: new Date().toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) });
        await setDoc(doc(db, 'settings', 'contact_submissions'), { items }, { merge: true });
        msgEl.style.color = 'var(--secondary)'; msgEl.textContent = 'Message sent! We\'ll get back to you soon.';
        inputs.forEach(i => i.value = '');
    } catch(err) { msgEl.style.color = 'var(--primary)'; msgEl.textContent = 'Failed to send. Please try again.'; }
};
window.toggleGalleryDropdown=toggleGalleryDropdown;window.selectGalleryAlbum=selectGalleryAlbum;window.openLightbox=openLightbox;window.closeLightbox=closeLightbox;window.lightboxNav=lightboxNav;window.updateLightbox=updateLightbox;
// =========================================================
// ARTICLES / NEWS
// =========================================================
let _articles = [];
function initArticlesListener() {
  import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js').then(
    ({ collection, query, orderBy, onSnapshot }) => {
      const q = query(
        collection(db, 'articles'),
        orderBy('createdAt', 'desc')
      );
      onSnapshot(q, snap => {
        _articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderArticleCards();
      });
    }
  );
}
function renderArticleCards() {
  const grid = document.getElementById('articles-grid');
  const countEl = document.getElementById('articles-count');
  if (!grid) return;
  const published = _articles.filter(a => a.status !== 'draft');
  if (countEl)
    countEl.textContent = `${published.length} post${published.length !== 1 ? 's' : ''}`;
  if (published.length === 0) {
    grid.innerHTML = `
      <div class="articles-empty">
        <div style="width:80px;height:80px;border-radius:50%;background:rgba(220,38,38,0.08);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
          <i class="fas fa-newspaper" style="font-size:2rem;color:var(--primary);opacity:0.5"></i>
        </div>
        <h3 style="font-size:1.3rem;margin-bottom:0.5rem;color:var(--text-main)">No Articles Yet</h3>
        <p style="font-size:0.9rem;max-width:360px;margin:0 auto;line-height:1.7">
          Articles and announcements from Baao Coop will appear here.
        </p>
      </div>`;
    return;
  }
  grid.innerHTML = published.map((a, i) => {
    return `
      <div class="article-card stagger-up" style="animation-delay:${i * 0.06}s"
        onclick="window.location.href='article.html?id=${a.id}'">
        ${a.cover_image
          ? `<img class="article-card-cover" src="${a.cover_image}" alt="${a.title}" loading="lazy">`
          : `<div class="article-card-cover-placeholder"><i class="fas fa-newspaper"></i></div>`
        }
        <div class="article-card-body">
          <span class="article-card-category">${a.label || a.category || 'Monthly Bulletin'}</span>
          <span class="article-card-title">${a.title}</span>
          ${a.subtitle ? `<span class="article-card-subtitle">${a.subtitle}</span>` : ''}
          <div class="article-card-read">Read Article &rarr;</div>
        </div>
      </div>`;
  }).join('');
  // Wire Latest 5 Articles to Home Hero Banner (rotating)
  if (published.length > 0) {
    const top5 = published.slice(0, 5);
    const bannerImg = document.querySelector('#home .hero-banner img');
    const h2 = document.getElementById('home-hero-h2');
    const h1 = document.getElementById('home-hero-h1');
    const p  = document.getElementById('home-hero-p');
    const readMoreBtn = document.querySelector('#home .hero-island .cta a.btn-secondary');
    let bannerIndex = 0;
    function getArticleExcerpt(a) {
      if (a.subtitle) return a.subtitle;
      if (a.sections && a.sections.length > 0) {
        const contentSection = a.sections.find(s =>
          s.type !== 'event' && s.content && s.content.trim().length > 0
        );
        if (contentSection) {
          const tmp = document.createElement('div');
          tmp.innerHTML = contentSection.content;
          const text = tmp.textContent.trim();
          return text.length > 160 ? text.substring(0, 160) + '...' : text;
        }
      }
      return 'Click to read our latest update...';
    }
    function applyBannerSlide(idx) {
  const a = top5[idx];
  if (!a) return;
  if (bannerImg) {
    bannerImg.style.transition = 'opacity 0.5s ease';
    bannerImg.style.opacity = '0';
    setTimeout(() => {
      bannerImg.src = a.cover_image || 'assets/images/hero-bg.png';
      bannerImg.style.opacity = '1';
      // Reset and restart pan animation
      bannerImg.style.animation = 'none';
      bannerImg.offsetHeight; // force reflow to restart animation
      bannerImg.style.animation = 'heroPanDown 6s linear forwards';
    }, 500);
  }
      if (h2) h2.innerHTML = `<i class="fas fa-bolt" style="color:#facc15;margin-right:8px"></i> LATEST: ${a.label || a.category || 'UPDATE'}`;
      if (h1) {
        h1.style.transition = 'opacity 0.4s ease';
        h1.style.opacity = '0';
        setTimeout(() => { h1.textContent = a.title; h1.style.opacity = '1'; }, 400);
      }
      if (p) {
        p.style.transition = 'opacity 0.4s ease';
        p.style.opacity = '0';
        setTimeout(() => { p.textContent = getArticleExcerpt(a); p.style.opacity = '1'; }, 400);
      }
      if (readMoreBtn) {
        readMoreBtn.href = `article.html?id=${a.id}`;
        readMoreBtn.innerHTML = `Read Article <i class="fas fa-arrow-right" style="margin-left:8px"></i>`;
      }
      document.querySelectorAll('.hero-banner-dot').forEach((dot, i) => {
        dot.style.opacity = i === idx ? '1' : '0.4';
        dot.style.transform = i === idx ? 'scale(1.3)' : 'scale(1)';
      });
    }
    // Inject dots once
    if (!document.getElementById('hero-banner-dots')) {
      const heroIsland = document.querySelector('#home .hero-island');
      if (heroIsland) {
        const dotsWrap = document.createElement('div');
        dotsWrap.id = 'hero-banner-dots';
        dotsWrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:1rem';
        top5.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.className = 'hero-banner-dot';
          dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:white;border:none;cursor:pointer;padding:0;transition:opacity 0.3s,transform 0.3s;opacity:0.4';
          dot.addEventListener('click', () => {
            bannerIndex = i;
            applyBannerSlide(bannerIndex);
            resetBannerTimer();
          });
          dotsWrap.appendChild(dot);
        });
        heroIsland.insertBefore(dotsWrap, heroIsland.firstChild);
      }
    }
    function resetBannerTimer() {
      if (window._heroBannerTimer) clearInterval(window._heroBannerTimer);
      window._heroBannerTimer = setInterval(() => {
        bannerIndex = (bannerIndex + 1) % top5.length;
        applyBannerSlide(bannerIndex);
      }, 6000);
    }
    applyBannerSlide(0);
    resetBannerTimer();
  }
  // Re-observe new cards for stagger animation
  document.querySelectorAll('.article-card.stagger-up:not(.visible)').forEach(el => {
    if (window.staggerObserver) window.staggerObserver.observe(el);
  });
}
function slugifyArticle(title) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}