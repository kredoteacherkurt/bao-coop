import { db } from './config.js';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Tab Navigation System (Slug-based)
  const handleRoute = () => {
    const hash = window.location.hash || '#home';
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    // Show target tab
    const target = document.querySelector(hash);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'instant' });
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
  window.addEventListener('hashchange', handleRoute);
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
        grid.innerHTML = links.map(src => {
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
        feedbacks.push({
            name: mockUser ? mockUser.name : 'Verified Member',
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
async function selectGalleryAlbum(id){const albums=await getAlbums();const album=albums.find(a=>a.id===id);if(!album)return;galleryCurrentAlbum=album;document.getElementById('gallery-selected-label').textContent=album.title;document.getElementById('gallery-dropdown-list').style.display='none';document.getElementById('gallery-dropdown-chevron').style.transform='rotate(0deg)';const infoEl=document.getElementById('gallery-album-info');const metaEl=document.getElementById('gallery-album-meta');const descEl=document.getElementById('gallery-album-desc');const metaParts=[album.date?`<span><i class="fas fa-calendar-alt"style="margin-right:4px;color:var(--primary)"></i>${album.date}</span>`:'',album.location?`<span><i class="fas fa-map-marker-alt"style="margin-right:4px;color:var(--primary)"></i>${album.location}</span>`:'',`<span><i class="fas fa-image"style="margin-right:4px;color:var(--primary)"></i>${(album.photos||[]).length}photo${(album.photos||[]).length!==1?'s':''}</span>`].filter(Boolean).join('<span style="color:#cbd5e1;margin:0 0.5rem">|</span>');metaEl.innerHTML=metaParts;descEl.textContent=album.desc||'';infoEl.style.display='block';renderGalleryGrid(album);}
function renderGalleryGrid(album){const grid=document.getElementById('gallery-grid');const empty=document.getElementById('gallery-empty');const photos=album.photos||[];if(photos.length===0){grid.style.display='none';empty.style.display='flex';empty.querySelector('h3').textContent='No Photos in This Album';empty.querySelector('p').textContent='Photos will appear here once the admin adds them.';return;}
empty.style.display='none';grid.style.display='grid';grid.innerHTML=photos.map((url,i)=>`<div onclick="openLightbox(${i})"style="width:150px;height:150px;border-radius:8px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:0.2s;background:#0f172a"onmouseover="this.style.borderColor='var(--primary)';this.style.transform='scale(1.03)'"onmouseout="this.style.borderColor='transparent';this.style.transform='scale(1)'"><img src="${url}"loading=lazy style="width:100%;height:100%;object-fit:cover;display:block"></div>`).join('');lightboxPhotos=photos;}
async function renderGalleryDropdown(){const list=document.getElementById('gallery-dropdown-list');const grid=document.getElementById('gallery-grid');const empty=document.getElementById('gallery-empty');const albums=await getAlbums();if(!list)return;if(albums.length===0){list.innerHTML='';grid.style.display='none';empty.style.display='flex';empty.querySelector('h3').textContent='No Albums Yet';empty.querySelector('p').textContent='Photo albums from Baao Coop events and activities will appear here.';document.getElementById('gallery-album-info').style.display='none';document.getElementById('gallery-selected-label').textContent='ALL PROGRAMS';return;}
empty.style.display='none';list.innerHTML=albums.map(album=>`<div onclick="selectGalleryAlbum('${album.id}')"style="padding:0.9rem 1.2rem;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.04);transition:0.15s"onmouseover="this.style.background='rgba(220,38,38,0.05)'"onmouseout="this.style.background='transparent'"><p style="font-weight:700;color:var(--text-main);margin:0 0 0.2rem;font-size:0.95rem">${album.title}</p><p style="font-size:0.78rem;color:var(--text-muted);margin:0;display:flex;gap:0.75rem;flex-wrap:wrap">${album.date?`<span><i class="fas fa-calendar-alt"style="margin-right:3px"></i>${album.date}</span>`:''}
${album.location?`<span><i class="fas fa-map-marker-alt"style="margin-right:3px"></i>${album.location}</span>`:''}<span><i class="fas fa-image"style="margin-right:3px"></i>${(album.photos||[]).length}photos</span></p></div>`).join('');selectGalleryAlbum(albums[0].id);}
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
    const slug = a.slug || slugifyArticle(a.title);
    const date = a.published_at
      ? new Date(a.published_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '';
    return `
      <div class="article-card stagger-up" style="animation-delay:${i * 0.06}s"
        onclick="window.location.href='article.html?id=${a.id}'">
        ${a.cover_image
          ? `<img class="article-card-cover" src="${a.cover_image}" alt="${a.title}" loading="lazy">`
          : `<div class="article-card-cover-placeholder"><i class="fas fa-newspaper"></i></div>`
        }
        <div class="article-card-body">
          <span class="article-card-category">${a.category || 'News'}</span>
          <span class="article-card-title">${a.title}</span>
          ${a.subtitle ? `<span style="font-size:0.82rem;color:var(--text-muted);line-height:1.4">${a.subtitle}</span>` : ''}
          <div class="article-card-meta">
            ${date ? `<span><i class="fas fa-calendar-alt" style="margin-right:4px"></i>${date}</span>` : ''}
            ${a.read_time ? `<span><i class="fas fa-clock" style="margin-right:4px"></i>${a.read_time} min read</span>` : ''}
            ${a.author ? `<span><i class="fas fa-user" style="margin-right:4px"></i>${a.author}</span>` : ''}
          </div>
          <span class="article-card-read">Read Article →</span>
        </div>
      </div>`;
  }).join('');

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
