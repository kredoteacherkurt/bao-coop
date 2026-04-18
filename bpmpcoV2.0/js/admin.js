import { db, cloudinaryConfig } from './config.js';
import { doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
const TAB_LABELS = { home: 'Home', about: 'About Us', services: 'Products & Services', membership: 'Membership', news: 'News', branches: 'Branches', feedback: 'Feedback', settings: 'Settings' };
window._db = db; window._doc = doc; window._setDoc = setDoc;
async function loadBannerPreviews() {
    const strip = document.getElementById('banner-preview-strip');
    if (!strip) return;
    try {
        const snap = await getDoc(doc(db, 'settings', 'banners'));
        if (!snap.exists()) {
            strip.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem">No banners uploaded yet.</p>';
            return;
        }
        const banners = snap.data();
        const TAB_ORDER = ['home','about','services','membership','news','branches','feedback','settings'];
        const entries = TAB_ORDER.filter(key => banners[key]).map(key => [key, banners[key]]);
        if (entries.length === 0) {
            strip.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem">No banners uploaded yet.</p>';
            return;
        }
        strip.innerHTML = entries.map(([tab, url]) => `
            <div style="display:flex;flex-direction:column;gap:0.4rem;align-items:center">
                <div style="position:relative;width:110px;height:65px;border-radius:8px;overflow:hidden;border:2px solid rgba(255,255,255,0.15);background:#1e293b">
                    <img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.innerHTML='<div style=color:#64748b;font-size:0.65rem;display:flex;align-items:center;justify-content:center;height:100%;padding:4px;text-align:center>Load error</div>'">
                    <button onclick="deleteBanner('${tab}')" title="Remove banner" style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(220,38,38,0.9);border:none;color:white;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;line-height:1;z-index:5;">✕</button>
                </div>
                <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">${TAB_LABELS[tab] || tab}</span>
            </div>
        `).join('');
    } catch(err) {
        strip.innerHTML = '<p style="color:#ef4444;font-size:0.8rem">Failed to load previews.</p>';
    }
}
window.addEventListener('DOMContentLoaded', async () => {
    await loadBannerPreviews();
    const savedTab = localStorage.getItem('bpmpc_admin_tab');
    if (savedTab && document.getElementById(savedTab)) {
        const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.getAttribute('onclick')?.includes(savedTab));
        switchMainTab(savedTab, btn || document.querySelector('.tab-btn'));
    }
    const savedSub = localStorage.getItem('bpmpc_admin_subtab');
    if (savedSub && document.getElementById(savedSub)) {
        const btn = [...document.querySelectorAll('.sub-tab-btn')].find(b => b.getAttribute('onclick')?.includes(savedSub));
        if (btn) switchSubTab(savedSub, btn);
    }
    try {
        const heroSnap = await getDoc(doc(db, 'settings', 'home_hero'));
        if (heroSnap.exists()) {
            const { h2, h1, p } = heroSnap.data();
            if (h2) document.getElementById('admin-home-h2').value = h2;
            if (h1) document.getElementById('admin-home-h1').value = h1;
            if (p) document.getElementById('admin-home-p').value = p;
        if (heroSnap.data().tagline && document.getElementById('admin-tagline')) {
            document.getElementById('admin-tagline').value = heroSnap.data().tagline;
        }
        }
    } catch(e) { console.error('Failed to load hero for admin:', e); }
});
document.getElementById('upload-banner-btn').addEventListener('click', async () => {
    const input = document.getElementById('admin-banner-upload');
    if (!input.files || input.files.length === 0) {
        showToast('Please select an image first.', 'error');
        return;
    }
    const file = input.files[0];
    const activeTab = document.querySelector('.admin-pane.active').id.replace('tab-', '');
    const btn = document.getElementById('upload-banner-btn');
    const originalText = btn.innerHTML;
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btn.disabled = true;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (!data.secure_url) throw new Error("Cloudinary upload failed");
        await setDoc(doc(db, 'settings', 'banners'), { [activeTab]: data.secure_url }, { merge: true });
        showToast('Banner updated for ' + (TAB_LABELS[activeTab] || activeTab.toUpperCase()) + ' tab!');
        await loadBannerPreviews();
        input.value = '';
        input.dispatchEvent(new Event('change'));
    } catch (err) {
        console.error(err);
        showToast('Upload error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
if (localStorage.getItem('bpmpc_admin_auth') === 'true') {
    document.getElementById('login-overlay').style.display = 'none';
}
function setVal(id, lsKey) {
    const el = document.getElementById(id);
    const val = localStorage.getItem(lsKey);
    if (el && val) el.value = val;
}
window.addEventListener('DOMContentLoaded', () => {
    setVal('admin-assets', 'baaocoop_assets');
    setVal('admin-members', 'baaocoop_members');
    setVal('admin-years', 'baaocoop_years');
    initModernDropzones();
});
document.addEventListener('paste', e => {
    const activeDropzones = Array.from(document.querySelectorAll('.modern-dropzone')).filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
    if (activeDropzones.length > 0) {
        const targetWrapper = activeDropzones[0];
        const targetInput = targetWrapper.querySelector('input[type="file"]');
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.kind === 'file') {
                const file = item.getAsFile();
                const dt = new DataTransfer();
                dt.items.add(file);
                targetInput.files = dt.files;
                targetInput.dispatchEvent(new Event('change'));
                break;
            }
        }
    }
});
function parseImageUrl(raw) {
    raw = raw.trim();
    let m = raw.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    m = raw.match(/drive\.google\.com\/open\?id=([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    if (raw.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) return raw;
    if (raw.match(/^https?:\/\//)) return raw;
    return null;
}
function initModernDropzones() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.dataset.modernized) return;
        input.dataset.modernized = 'true';
        const wrapper = document.createElement('div');
        wrapper.className = 'modern-dropzone';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'thumb-container';
        wrapper.parentNode.insertBefore(thumbContainer, wrapper.nextSibling);
        // URL input row
        const urlRow = document.createElement('div');
        urlRow.style.cssText = 'display:flex;gap:0.5rem;margin-top:0.6rem;align-items:center';
        urlRow.innerHTML = `<input type="text" placeholder="Or paste image URL (Drive, Facebook, direct link...)" style="flex:1;padding:0.45rem 0.7rem;border:1px solid #e2e8f0;border-radius:var(--radius-sm);font-size:0.8rem;font-family:inherit;outline:0;background:#f8fafc;width:100% !important;"><button type="button" style="padding:0.45rem 0.8rem;background:#e2e8f0;border:none;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap">Use URL</button><p style="font-size:0.75rem;color:var(--text-muted);margin:0;min-width:60px" class="url-status"></p>`;
        wrapper.parentNode.insertBefore(urlRow, thumbContainer.nextSibling);
        const urlInput = urlRow.querySelector('input');
        const urlBtn = urlRow.querySelector('button');
        const urlStatus = urlRow.querySelector('.url-status');
        urlBtn.addEventListener('click', () => {
            const parsed = parseImageUrl(urlInput.value);
            if (!parsed) { urlStatus.style.color = 'var(--primary)'; urlStatus.textContent = '✗ Invalid URL'; return; }
            input.dataset.urlOverride = parsed;
            thumbContainer.innerHTML = '';
            const thumb = document.createElement('div');
            thumb.className = 'thumb-item';
            const img = document.createElement('img');
            img.src = parsed;
            img.onerror = () => { urlStatus.style.color = 'var(--primary)'; urlStatus.textContent = '✗ Load error'; };
            const removeBtn = document.createElement('button');
            removeBtn.className = 'thumb-remove';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); delete input.dataset.urlOverride; thumbContainer.innerHTML = ''; urlInput.value = ''; urlStatus.textContent = ''; };
            thumb.appendChild(removeBtn);
            thumb.appendChild(img);
            thumbContainer.appendChild(thumb);
            urlStatus.style.color = '#10b981'; urlStatus.textContent = '✓ Ready';
        });
        const icon = document.createElement('i');
        icon.className = input.accept.includes('image') ? 'fas fa-cloud-upload-alt dz-icon' : 'fas fa-file-pdf dz-icon';
        const text = document.createElement('div');
        text.className = 'dz-text';
        text.textContent = 'Drag & Drop or Click to Browse';
        const sub = document.createElement('div');
        sub.className = 'dz-subtext';
        sub.textContent = '(Or paste from clipboard)';
        wrapper.append(icon, text, sub);
        const prevent = e => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => wrapper.addEventListener(e, prevent));
        ['dragenter', 'dragover'].forEach(e => wrapper.addEventListener(e, () => wrapper.classList.add('dragover')));
        ['dragleave', 'drop'].forEach(e => wrapper.addEventListener(e, () => wrapper.classList.remove('dragover')));
        wrapper.addEventListener('drop', e => {
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
        input.addEventListener('change', () => {
            thumbContainer.innerHTML = '';
            if (input.files.length) {
                icon.style.display = 'none';
                text.textContent = input.files.length > 1 ? `${input.files.length} files selected` : input.files[0].name;
                Array.from(input.files).forEach((file, index) => {
                    const thumb = document.createElement('div');
                    thumb.className = 'thumb-item';
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'thumb-remove';
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.onclick = (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const dt = new DataTransfer();
                        Array.from(input.files).forEach((f, i) => { if (i !== index) dt.items.add(f); });
                        input.files = dt.files;
                        input.dispatchEvent(new Event('change'));
                    };
                    thumb.appendChild(removeBtn);
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        const r = new FileReader();
                        r.onload = e => img.src = e.target.result;
                        r.readAsDataURL(file);
                        thumb.appendChild(img);
                    } else {
                        const nameDiv = document.createElement('div');
                        nameDiv.className = 'thumb-name';
                        nameDiv.textContent = file.name;
                        thumb.appendChild(nameDiv);
                    }
                    thumbContainer.appendChild(thumb);
                });
            } else {
                icon.style.display = 'block';
                text.textContent = 'Drag & Drop or Click to Browse';
            }
        });
    });
}
function handleLogin() {
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value;
    if (user === 'bpmpc' && btoa(pass) === 'YWRtaW4xMDE=') {
        localStorage.setItem('bpmpc_admin_auth', 'true');
        document.getElementById('login-overlay').style.display = 'none';
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
}
function handleLogout() { localStorage.removeItem('bpmpc_admin_auth'); location.reload(); }
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="color:${type === 'success' ? '#10b981' : '#ef4444'}; font-size:1.2rem;"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}
document.getElementById('admin-pass').addEventListener('keypress', function(e) { if (e.key === 'Enter') handleLogin(); });
function switchMainTab(tabId, btn) {
    if (tabId === 'tab-contact') loadContactSubmissions();
    if (tabId === 'tab-livechat') loadChatSessions();
    if (tabId === 'tab-feedback') loadFeedbacks();
    document.querySelectorAll('.admin-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (btn) btn.classList.add('active');
    window.location.hash = tabId;
}

// Hash-based routing for admin
function handleAdminRoute() {
    const hash = window.location.hash?.replace('#', '') || 'tab-home';
    const tabId = document.getElementById(hash) ? hash : 'tab-home';
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    switchMainTab(tabId, btn);
}
window.addEventListener('hashchange', handleAdminRoute);
window.addEventListener('DOMContentLoaded', handleAdminRoute);
function switchSubTab(tabId, btn) {
    localStorage.setItem('bpmpc_admin_subtab', tabId);
    document.querySelectorAll('.sub-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
}
// Generic branch modal
function openBranchModal(val1='', val2='', val3='', val4='', val5='') {
    document.getElementById('modal-title').innerText = val1 ? 'Edit Branch' : 'Add Branch';
    document.getElementById('modal-body').innerHTML = `
        <div class="form-group"><label class="form-label">Branch Name</label><input type="text" class="form-control" value="${val1}"></div>
        <div class="form-group"><label class="form-label">Address</label><input type="text" class="form-control" value="${val2}"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-control" value="${val3}"></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" value="${val4}"></div></div>
        <div style="text-align:right; margin-top:2rem;"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="showToast('Saved'); closeModal()"><i class="fas fa-save"></i> Save</button></div>`;
    document.getElementById('crud-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('crud-modal').style.display = 'none'; }
// Dynamic Admin About Us Data
async function saveAboutAll() {
    const btn = document.getElementById('save-about-btn');
    const origText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    try {
        const aboutData = {};
        const fileInput = document.getElementById('admin-who-img');
        if (fileInput && fileInput.dataset.urlOverride) {
            aboutData['who_img'] = fileInput.dataset.urlOverride;
        } else if (fileInput && fileInput.files.length > 0) {
            const imgUrl = await uploadToCloudinary(fileInput.files[0]);
            aboutData['who_img'] = imgUrl;
        }
        const fields = ['admin-about-hero-h2', 'admin-about-hero-h1', 'admin-about-hero-p', 'admin-who-h3', 'admin-who-h1', 'admin-who-p', 'admin-identity-h3', 'admin-identity-h1', 'admin-identity-p', 'admin-card-1', 'admin-card-2', 'admin-card-3'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) aboutData[id] = el.value;
        });
        await setDoc(doc(db, 'settings', 'about_us'), aboutData, { merge: true });
        const statsData = {};
        ['admin-assets', 'admin-members', 'admin-years'].forEach(id => {
            const el = document.getElementById(id);
            if (el) statsData[id.replace('admin-', '')] = el.value;
        });
        await setDoc(doc(db, 'settings', 'about_stats'), statsData, { merge: true });
        showToast('All About details saved successfully!');
        renderAboutTables();
        if (fileInput) { fileInput.value = ''; fileInput.dispatchEvent(new Event('change')); }
    } catch(e) {
        console.error(e);
        showToast('Failed to save some details. Try again.', 'error');
    } finally {
        btn.disabled = false; btn.innerHTML = origText;
    }
}
let historyData = [];
let execsData = [];
let mgmtData = [];
(async () => {
    try {
        const [hSnap, eSnap, mSnap] = await Promise.all([
            getDoc(doc(db, 'settings', 'history')),
            getDoc(doc(db, 'settings', 'execs')),
            getDoc(doc(db, 'settings', 'mgmt'))
        ]);
        if (hSnap.exists()) historyData = hSnap.data().items || [];
        if (eSnap.exists()) execsData = eSnap.data().items || [];
        if (mSnap.exists()) mgmtData = mSnap.data().items || [];
        await renderAboutTables();
    } catch(e) { console.error('Failed to load about arrays:', e); }
})();
async function renderAboutTables() {
    if(document.getElementById('admin-who-h3')) {
        try {
            const snap = await getDoc(doc(db, 'settings', 'about_us'));
            const data = snap.exists() ? snap.data() : {};
            const defaults = {
                'admin-about-hero-h2': 'ABOUT US',
                'admin-about-hero-h1': 'Rooted in Faith, Built Through Cooperation',
                'admin-about-hero-p': 'Discover our journey from a humble parish initiative to a leading multi-purpose cooperative, guided by shared faith and a commitment to uplift lives.',
                'admin-who-h3': '- Who We Are -',
                'admin-who-h1': 'Rooted in Faith, Built Through Cooperation',
                'admin-who-p': 'Baao Parish Multi-Purpose Cooperative (BPMPCO) is a member-owned, community-driven institution grounded in cooperative principles and guided by shared faith and responsibility.\n\nEstablished through the collective effort of parishioners and community members, it exists to uplift lives by providing accessible financial services and sustainable livelihood support.',
                'admin-identity-h3': 'Our Identity',
                'admin-identity-h1': 'Who We Are',
                'admin-identity-p': 'BPMPCO stands as one of the trusted cooperatives in Camarines Sur, committed to empowering members through inclusive financial solutions and community development initiatives.',
                'admin-card-1': 'Provide accessible and responsible financial services to members',
                'admin-card-2': 'Uphold cooperative values through education, trust, and participation',
                'admin-card-3': 'Strengthen community resilience through sustainable development programs'
            };
            Object.entries(defaults).forEach(([id, fallback]) => {
                const el = document.getElementById(id);
                if (el) el.value = data[id] || fallback;
            });
            const statsSnap = await getDoc(doc(db, 'settings', 'about_stats'));
            const stats = statsSnap.exists() ? statsSnap.data() : {};
            if (document.getElementById('admin-assets')) document.getElementById('admin-assets').value = stats.assets || '500';
            if (document.getElementById('admin-members')) document.getElementById('admin-members').value = stats.members || '15000';
            if (document.getElementById('admin-years')) document.getElementById('admin-years').value = stats.years || '30';
            const previewWrap = document.getElementById('admin-who-img-preview');
            if (data.who_img && previewWrap) {
                previewWrap.style.display = 'block';
                previewWrap.querySelector('img').src = data.who_img;
            }
        } catch(e) { console.error('Failed to load about_us for admin:', e); }
    }
    const hBody = document.getElementById('history-table-body');
    if(hBody) hBody.innerHTML = historyData.map((item, i) => `<tr><td>${item.year}</td><td>${item.title}</td><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.desc}</td><td class="action-icons"><i class="fas fa-edit" onclick="openDataModal('milestone', ${i})"></i><i class="fas fa-trash" onclick="deleteData('milestone', ${i})"></i></td></tr>`).join('');
    const eBody = document.getElementById('execs-table-body');
    if(eBody) eBody.innerHTML = execsData.map((item, i) => `<tr><td><img src="${item.img || 'assets/images/logo.png'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"></td><td>${item.name}</td><td>${item.role}</td><td class="action-icons"><i class="fas fa-edit" onclick="openDataModal('exec', ${i})"></i><i class="fas fa-trash" onclick="deleteData('exec', ${i})"></i></td></tr>`).join('');
    const mBody = document.getElementById('mgmt-table-body');
    if(mBody) mBody.innerHTML = mgmtData.map((item, i) => `<tr><td><img src="${item.img || 'assets/images/logo.png'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"></td><td>${item.name}</td><td>${item.role}</td><td class="action-icons"><i class="fas fa-edit" onclick="openDataModal('mgmt', ${i})"></i><i class="fas fa-trash" onclick="deleteData('mgmt', ${i})"></i></td></tr>`).join('');
}
function openDataModal(type, index = -1) {
    let dataObj = index > -1 ? (type==='milestone' ? historyData[index] : type==='exec' ? execsData[index] : mgmtData[index]) : {};
    document.getElementById('modal-title').innerText = index > -1 ? `Edit ${type}` : `Add ${type}`;
    if (type === 'milestone') {
        document.getElementById('modal-body').innerHTML = `
            <div class="form-group"><label class="form-label">Year</label><input type="text" id="crud-year" class="form-control" value="${dataObj.year || ''}"></div>
            <div class="form-group"><label class="form-label">Title</label><input type="text" id="crud-title" class="form-control" value="${dataObj.title || ''}"></div>
            <div class="form-group" style="flex:1; display:flex; flex-direction:column;"><label class="form-label">Description</label><textarea id="crud-desc" class="form-control" style="flex:1; min-height:100px;">${dataObj.desc || ''}</textarea></div>
            <div style="text-align:right; margin-top:2rem;"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveDataModal('${type}', ${index})"><i class="fas fa-save"></i> Save</button></div>`;
    } else {
        document.getElementById('modal-body').innerHTML = `
            <div class="form-group"><label class="form-label">Name</label><input type="text" id="crud-name" class="form-control" value="${dataObj.name || ''}"></div>
            <div class="form-group"><label class="form-label">Role</label><input type="text" id="crud-role" class="form-control" value="${dataObj.role || ''}"></div>
            <div class="form-group" style="flex:1; display:flex; flex-direction:column;"><label class="form-label">Bio (Optional)</label><textarea id="crud-desc" class="form-control" style="flex:1; min-height:100px;">${dataObj.desc || ''}</textarea></div>
            <div class="form-group"><label class="form-label">Upload Photo</label><input type="file" id="crud-img" accept="image/*" class="form-control"></div>
            <div style="text-align:right; margin-top:2rem;"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" id="crud-save-btn" onclick="saveDataModal('${type}', ${index}, '${dataObj.img || ''}')"><i class="fas fa-save"></i> Save</button></div>`;
        setTimeout(initModernDropzones, 50);
    }
    document.getElementById('crud-modal').style.display = 'flex';
}
async function saveDataModal(type, index, existingImgUrl = '') {
    const btn = document.getElementById('crud-save-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    let newItem = {};
    if (type === 'milestone') {
        newItem = { year: document.getElementById('crud-year').value, title: document.getElementById('crud-title').value, desc: document.getElementById('crud-desc').value };
    } else {
        let imgUrl = existingImgUrl;
        const fileInput = document.getElementById('crud-img');
        if (fileInput && fileInput.dataset.urlOverride) {
            imgUrl = fileInput.dataset.urlOverride;
        } else if (fileInput && fileInput.files.length > 0) {
            try { imgUrl = await uploadToCloudinary(fileInput.files[0]); } catch(e) { showToast('Image upload failed', 'error'); }
        }
        newItem = { name: document.getElementById('crud-name').value, role: document.getElementById('crud-role').value, desc: document.getElementById('crud-desc').value, img: imgUrl };
    }
    try {
        if (type === 'milestone') {
            index > -1 ? historyData[index] = newItem : historyData.push(newItem);
            await setDoc(doc(db, 'settings', 'history'), { items: historyData }, { merge: true });
        } else if (type === 'exec') {
            index > -1 ? execsData[index] = newItem : execsData.push(newItem);
            await setDoc(doc(db, 'settings', 'execs'), { items: execsData }, { merge: true });
        } else if (type === 'mgmt') {
            index > -1 ? mgmtData[index] = newItem : mgmtData.push(newItem);
            await setDoc(doc(db, 'settings', 'mgmt'), { items: mgmtData }, { merge: true });
        }
    } catch(e) { showToast('Failed to save item.', 'error'); console.error(e); return; }
    renderAboutTables(); closeModal(); showToast('Item saved!');
}
async function deleteData(type, index) {
    if(!confirm('Are you sure you want to delete this item?')) return;
    try {
        if (type === 'milestone') {
            historyData.splice(index, 1);
            await setDoc(doc(db, 'settings', 'history'), { items: historyData }, { merge: true });
        } else if (type === 'exec') {
            execsData.splice(index, 1);
            await setDoc(doc(db, 'settings', 'execs'), { items: execsData }, { merge: true });
        } else if (type === 'mgmt') {
            mgmtData.splice(index, 1);
            await setDoc(doc(db, 'settings', 'mgmt'), { items: mgmtData }, { merge: true });
        }
    } catch(e) { showToast('Failed to delete item.', 'error'); console.error(e); return; }
    renderAboutTables(); showToast('Item deleted', 'error');
}
window.addEventListener('DOMContentLoaded', async () => { 
    await renderAboutTables(); 
    await loadServicesAdmin();
    await loadMembershipAdmin();
});

let _servicesAdmin = [];
async function loadServicesAdmin() {
    const tbody = document.getElementById('services-table-body');
    if(!tbody) return;
    try {
        const snap = await getDoc(doc(db, 'settings', 'services'));
        if(snap.exists() && snap.data().categories && snap.data().categories.length > 0) {
            _servicesAdmin = snap.data().categories;
        } else {
            _servicesAdmin = [
                { name: 'Loan Products', items: ['Microfinance Loan', 'Salary Loan', 'Pension Loan', 'OFW Loan', 'Back-to-Back Loan', 'Solar Package Loan', 'Jewelry Loan', 'Character Loan', 'Grocery Loan', 'Medical Loan', 'Enrollment Loan', 'Farmer’s Loan', 'Calamity Loan', 'Petty Cash / Emergency Loan'] },
                { name: 'Regular Savings', items: ['Retirement Savings', 'Birthday Savings', 'Travel Savings', 'Anniversary Savings', 'Koop Alkansya (For Kids)', 'Time Deposit'] },
                { name: 'Social Services', items: ['Damayang Pangkalusugan (DPK)', 'Death Aid Program (DAP)', 'Coop Life Program (CLP)', 'Koop Assurance Program', 'Baaocoop Damayan Insurance'] },
                { name: 'Member Services', items: ['SSS / Philhealth Payment', 'Accommodation', 'Automated Teller Machine (ATM)', 'KAYA Payment'] },
                { name: 'Special Coop Programs', items: ['Aflatoun Program (School-based Savings)', 'Coop College Assistance Program (CCAP)', 'Coop Youth Exposure Program (CYEP)', 'Coop Youth Volunteer Exposure Program', 'Adopt-a-Barangay Feeding Program', 'Koop Kalinga (Scholarship Grant)', 'Koop Negosyo (Business Dev’t Assistance)', 'Koop Paligiran (Environmental Program)', 'Coop Marketing Program (Advertising)', 'Balik Eskwela Program (Free School Supplies)'] }
            ];
            await setDoc(doc(db, 'settings', 'services'), { categories: _servicesAdmin }, { merge: true });
        }
        tbody.innerHTML = _servicesAdmin.map((c, i) => `<tr><td>${c.name}</td><td>${c.items.length} Items</td><td class="action-icons"><i class="fas fa-edit" onclick="openModal('Edit Service Category','${c.name}','${c.items.join('|')}', ${i})"></i><i class="fas fa-trash" onclick="deleteServiceCategory(${i})"></i></td></tr>`).join('');
    } catch(e) { console.error('Failed to load services data:', e); }
}

window.deleteServiceCategory = async (i) => {
    if(!confirm('Delete this category?')) return;
    _servicesAdmin.splice(i, 1);
    try {
        await setDoc(doc(db, 'settings', 'services'), { categories: _servicesAdmin }, { merge: true });
        loadServicesAdmin();
        showToast('Category deleted', 'error');
    } catch(e) { showToast('Failed to delete category', 'error'); }
};

async function loadMembershipAdmin() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'membership_details'));
        if(snap.exists()) {
            const d = snap.data();
            if(d.requirements && document.getElementById('admin-req-list')) document.getElementById('admin-req-list').value = d.requirements;
            if(d.payments && document.getElementById('admin-pay-list')) document.getElementById('admin-pay-list').value = d.payments;
        }
    } catch(e) { console.error('Failed to load membership data:', e); }
}
// ====== REPAIRED MEDIA LINK LOGIC ======
let mediaLinks = [];
(async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'media'));
        if (snap.exists() && snap.data().links) {
            mediaLinks = snap.data().links;
        } else {
            mediaLinks = [];
        }
    } catch {
        mediaLinks = [];
    }
    renderMediaLinkList();
})();
function parseToEmbedUrl(raw) {
    raw = raw.trim();
    const iframeSrc = raw.match(/src=["']([^"']+)["']/);
    if (iframeSrc) raw = iframeSrc[1];
    let m = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = raw.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    m = raw.match(/facebook\.com\/.+\/videos\/(\d+)/);
    if (m) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=0&width=560`;
    m = raw.match(/facebook\.com\/reel\/(\d+)/);
    if (m) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=0&width=560`;
    m = raw.match(/facebook\.com\/share\/v\/([A-Za-z0-9_-]+)/);
    if (m) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=0&width=560`;
    if (raw.includes('facebook.com/plugins/video') || raw.includes('fb.watch')) 
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=0&width=560`;
    m = raw.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    if (raw.includes('drive.google.com') && raw.includes('/preview')) return raw;
    return null;
}
function renderMediaLinkList() {
    const list = document.getElementById('media-link-list');
    if (!list) return;
    if (mediaLinks.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No links added yet.</p>';
        return;
    }
    list.innerHTML = mediaLinks.map((url, i) => `
        <div style="display:flex; flex-direction:column; gap:0.5rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <i class="fas ${url.includes('youtube') ? 'fa-youtube' : url.includes('facebook') ? 'fa-facebook' : 'fa-google-drive'}" style="color:var(--primary);font-size:1rem;width:20px"></i>
                <span style="flex:1;font-size:0.8rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${url}">${url}</span>
                <button onclick="toggleMediaPreview(${i})" class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:#cbd5e1; color:#0f172a;"><i class="fas fa-eye"></i> Preview</button>
                <button onclick="removeMediaLink(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:1rem;margin-left:0.5rem;"><i class="fas fa-times"></i></button>
            </div>
            <div id="admin-preview-${i}" style="display:none; width:100%; height:220px; background:#000; border-radius:var(--radius-sm); overflow:hidden; margin-top:0.5rem;"></div>
        </div>
    `).join('');
}
function addMediaLink() {
    const input = document.getElementById('admin-vid-link');
    const status = document.getElementById('vid-parse-status');
    const raw = input.value.trim();
    if (!raw) return;
    const embed = parseToEmbedUrl(raw);
    if (!embed) {
        status.style.color = 'var(--primary)';
        status.textContent = '⚠ Unrecognized link format. Accepted: YouTube, Facebook, Google Drive.';
        return;
    }
    mediaLinks.push(embed);
    renderMediaLinkList();
    input.value = '';
    status.style.color = '#10b981';
    status.textContent = '✓ Link parsed and added!';
    setTimeout(() => status.textContent = '', 2500);
}
function removeMediaLink(i) { mediaLinks.splice(i, 1); renderMediaLinkList(); }
function toggleMediaPreview(i) {
    const container = document.getElementById(`admin-preview-${i}`);
    if (container.style.display === 'none') {
        container.style.display = 'block';
        container.innerHTML = `<iframe src="${mediaLinks[i]}" width="100%" height="100%" style="border:none;" allowfullscreen></iframe>`;
    } else {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}
async function saveMediaLinks() {
    try {
        await setDoc(doc(db, 'settings', 'media'), { links: mediaLinks }, { merge: true });
        showToast('Media links saved successfully!');
    } catch(err) {
        console.error(err);
        showToast('Failed to save media links.', 'error');
    }
}
// ====== REPAIRED DRIVE FORMS LOGIC ======
let formLinks = [];
(async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'form_links'));
        if (snap.exists()) formLinks = snap.data().items || [];
    } catch(e) { console.error('Failed to load form_links:', e); }
    renderFormLinkList();
})();
function parseDriveLink(url) {
    const m = url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    return url;
}
function renderFormLinkList() {
    const list = document.getElementById('form-link-list');
    if (!list) return;
    if (formLinks.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No forms added yet.</p>';
        return;
    }
    list.innerHTML = formLinks.map((form, i) => `
        <div style="display:flex;align-items:center;gap:0.5rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:0.75rem;">
            <i class="fas fa-file-pdf" style="color:var(--primary);font-size:1.2rem;"></i>
            <div style="flex:1;overflow:hidden;">
                <p style="font-weight:600;font-size:0.9rem;margin:0;color:var(--text-main)">${form.title}</p>
                <p style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0" title="${form.url}">${form.url}</p>
            </div>
            <button onclick="removeFormLink(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:1rem;margin-left:0.5rem;"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}
function addFormLink() {
    const titleInput = document.getElementById('admin-form-title');
    const linkInput = document.getElementById('admin-form-link');
    const status = document.getElementById('form-parse-status');
    const title = titleInput.value.trim();
    const rawUrl = linkInput.value.trim();
    if (!title || !rawUrl) { status.style.color = 'var(--primary)'; status.textContent = '⚠ Provide both a title and a link.'; return; }
    formLinks.push({ title, url: parseDriveLink(rawUrl) });
    renderFormLinkList();
    titleInput.value = ''; linkInput.value = '';
    status.style.color = '#10b981';
    status.textContent = '✓ Form added! (Converted for download)';
    setTimeout(() => status.textContent = '', 2500);
}
function removeFormLink(i) { formLinks.splice(i, 1); renderFormLinkList(); }
async function saveMembershipData() {
    const btn = document.querySelector('button[onclick="saveMembershipData()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    try {
        await setDoc(doc(db, 'settings', 'form_links'), { items: formLinks }, { merge: true });
        const reqEl = document.getElementById('admin-req-list');
        const payEl = document.getElementById('admin-pay-list');
        if (reqEl && payEl) {
            await setDoc(doc(db, 'settings', 'membership_details'), { 
                requirements: reqEl.value.trim(), 
                payments: payEl.value.trim() 
            }, { merge: true });
        }
        showToast('Membership data saved successfully!');
    } catch(e) {
        console.error("Save Membership Error:", e);
        showToast('Failed to save membership data.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Membership Data'; }
    }
}
async function saveHomeHero() {
    const h2 = document.getElementById('admin-home-h2').value;
    const h1 = document.getElementById('admin-home-h1').value;
    const p = document.getElementById('admin-home-p').value;
    try {
        await setDoc(doc(db, 'settings', 'home_hero'), { h2, h1, p }, { merge: true });
        showToast('Home hero content updated!');
    } catch(err) {
        showToast('Failed to save hero content.', 'error');
    }
}
async function updateHeroTagline() {
    const val = document.getElementById('admin-tagline').value;
    try {
        await setDoc(doc(db, 'settings', 'home_hero'), { tagline: val }, { merge: true });
        showToast('Tagline updated!');
    } catch(err) {
        showToast('Failed to save tagline.', 'error');
    }
}
async function saveAboutStats() {
    try {
        await setDoc(doc(db, 'settings', 'about_stats'), {
            assets: document.getElementById('admin-assets').value,
            members: document.getElementById('admin-members').value,
            years: document.getElementById('admin-years').value
        }, { merge: true });
        showToast('Stats saved successfully!');
    } catch(e) {
        showToast('Failed to save stats.', 'error');
    }
}
// ====== REPAIRED ALBUM/GALLERY LOGIC ======
let _galleryAlbums = [];
async function getAlbums() { return _galleryAlbums; }
async function saveAlbums(albums) {
    _galleryAlbums = albums;
    await setDoc(doc(db, 'settings', 'gallery'), { albums }, { merge: true });
}
(async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'gallery'));
        if (snap.exists()) _galleryAlbums = snap.data().albums || [];
    } catch(e) { console.error('Failed to load gallery:', e); }
    renderGalleryAdmin();
})();
function openAlbumCreateModal() {
    document.getElementById('album-modal-title').innerText = 'Create Album';
    document.getElementById('album-edit-id').value = '';
    document.getElementById('album-title').value = '';
    document.getElementById('album-desc').value = '';
    document.getElementById('album-date').value = '';
    document.getElementById('album-location').value = '';
    document.getElementById('album-photos').value = '';
    document.getElementById('album-upload-progress').style.display = 'none';
    document.getElementById('album-modal').style.display = 'flex';
    initModernDropzones();
}
async function openAlbumEditModal(id) {
    const album = (await getAlbums()).find(a => a.id === id);
    if (!album) return;
    document.getElementById('album-modal-title').innerText = 'Edit Album';
    document.getElementById('album-edit-id').value = id;
    document.getElementById('album-title').value = album.title || '';
    document.getElementById('album-desc').value = album.desc || '';
    document.getElementById('album-date').value = album.date || '';
    document.getElementById('album-location').value = album.location || '';
    document.getElementById('album-photos').value = '';
    document.getElementById('album-upload-progress').style.display = 'none';
    document.getElementById('album-modal').style.display = 'flex';
    initModernDropzones();
}
function closeAlbumModal() { document.getElementById('album-modal').style.display = 'none'; }
async function uploadToCloudinary(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`);
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        xhr.onload = () => {
            const data = JSON.parse(xhr.responseText);
            if (data.secure_url) resolve(data.secure_url);
            else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
}
async function saveAlbum() {
    const title = document.getElementById('album-title').value.trim();
    if (!title) { showToast('Album title is required.', 'error'); return; }
    const editId = document.getElementById('album-edit-id').value;
    const desc = document.getElementById('album-desc').value.trim();
    const date = document.getElementById('album-date').value;
    const location = document.getElementById('album-location').value.trim();
    const filesInput = document.getElementById('album-photos');
    const files = Array.from(filesInput.files || []);
    const btn = document.getElementById('album-save-btn');
    const albums = await getAlbums();
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    let uploadedUrls = [];
    const filesInput2 = document.getElementById('album-photos');
    if (filesInput2 && filesInput2.dataset.urlOverride) {
        uploadedUrls.push(filesInput2.dataset.urlOverride);
    }
    if (files.length > 0) {
        const progressWrap = document.getElementById('album-upload-progress');
        const progressBar = document.getElementById('album-progress-bar');
        const progressLabel = document.getElementById('album-progress-label');
        const progressPct = document.getElementById('album-progress-pct');
        progressWrap.style.display = 'block';
        for (let i = 0; i < files.length; i++) {
            progressLabel.textContent = `Uploading ${i + 1} of ${files.length}...`;
            try {
                const url = await uploadToCloudinary(files[i], (p) => {
                    const overall = ((i + p) / files.length) * 100;
                    progressBar.style.width = overall.toFixed(0) + '%';
                    progressPct.textContent = overall.toFixed(0) + '%';
                });
                uploadedUrls.push(url);
            } catch (err) {
                showToast('Failed to upload: ' + files[i].name, 'error');
            }
        }
    }
    if (editId) {
        const idx = albums.findIndex(a => a.id === editId);
        if (idx > -1) {
            albums[idx].title = title; albums[idx].desc = desc; albums[idx].date = date;
            albums[idx].location = location; albums[idx].photos = [...(albums[idx].photos || []), ...uploadedUrls];
        }
    } else {
        albums.push({ id: 'alb_' + Date.now(), title, desc, date, location, photos: uploadedUrls, createdAt: new Date().toISOString() });
    }
    try {
        await saveAlbums(albums);
    } catch(e) { showToast('Failed to save album.', 'error'); console.error(e); return; }
    closeAlbumModal(); renderGalleryAdmin();
    showToast(editId ? 'Album updated!' : 'Album created!');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Album';
}
async function deleteAlbumPhoto(albumId, photoIdx) {
    const albums = await getAlbums();
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    album.photos.splice(photoIdx, 1);
    try { await saveAlbums(albums); } catch(e) { showToast('Failed to delete photo.', 'error'); return; }
    renderGalleryAdmin();
}
async function deleteAlbum(id) {
    if (!confirm('Delete this entire album and all its photos?')) return;
    try { await saveAlbums((await getAlbums()).filter(a => a.id !== id)); } catch(e) { showToast('Failed to delete album.', 'error'); return; }
    renderGalleryAdmin(); showToast('Album deleted.', 'error');
}
async function renderGalleryAdmin() {
    const container = document.getElementById('gallery-admin-list');
    if (!container) return;
    const albums = await getAlbums();
    if (albums.length === 0) {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;gap:1.2rem;text-align:center">
                <div style="width:70px;height:70px;border-radius:50%;background:rgba(29,78,216,0.08);display:flex;align-items:center;justify-content:center"><i class="fas fa-images" style="font-size:1.8rem;color:var(--secondary);opacity:0.5"></i></div>
                <div><p style="font-weight:700;color:var(--text-main);font-size:1.1rem;margin-bottom:0.3rem">No albums yet</p><p style="color:var(--text-muted);font-size:0.88rem">Click <strong>Create Album</strong> to add your first gallery.</p></div>
            </div>`;
        return;
    }
    container.innerHTML = albums.map(album => {
        const photos = album.photos || [];
        const meta = [
            album.date ? `<span><i class="fas fa-calendar-alt" style="margin-right:4px;color:var(--primary)"></i>${album.date}</span>` : '',
            album.location ? `<span><i class="fas fa-map-marker-alt" style="margin-right:4px;color:var(--primary)"></i>${album.location}</span>` : '',
            `<span><i class="fas fa-image" style="margin-right:4px;color:var(--primary)"></i>${photos.length} photo${photos.length !== 1 ? 's' : ''}</span>`
        ].filter(Boolean).join('<span style="color:#e2e8f0;margin:0 0.5rem">|</span>');
        const thumbsHtml = photos.length === 0 
            ? `<div style="display:flex;align-items:center;gap:0.5rem;color:var(--text-muted);font-size:0.85rem;padding:0.5rem 0"><i class="fas fa-image" style="opacity:0.4"></i> No photos yet — edit to add some.</div>` 
            : `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.75rem">${photos.map((url, i) => `
                <div style="position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0">
                    <img src="${url}" style="width:100%;height:100%;object-fit:cover">
                    <button onclick="deleteAlbumPhoto('${album.id}',${i})" style="position:absolute;top:3px;right:3px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:9px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>
                </div>
            `).join('')}</div>`;
        return `
            <div style="border:1px solid #e2e8f0;border-radius:var(--radius-md);padding:1.25rem;margin-bottom:1rem;background:#fafafa">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem">
                    <div>
                        <p style="font-weight:700;font-size:1.05rem;color:var(--text-main);margin-bottom:0.3rem">${album.title}</p>
                        <div style="display:flex;flex-wrap:wrap;gap:0.75rem;font-size:0.8rem;color:var(--text-muted)">${meta}</div>
                        ${album.desc ? `<p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.4rem">${album.desc}</p>` : ''}
                    </div>
                    <div style="display:flex;gap:0.5rem;flex-shrink:0;margin-left:1rem">
                        <button class="btn btn-secondary" onclick="openAlbumEditModal('${album.id}')" style="padding:0.4rem 0.8rem;font-size:0.8rem"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-danger" onclick="deleteAlbum('${album.id}')" style="padding:0.4rem 0.8rem;font-size:0.8rem"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                ${thumbsHtml}
            </div>`;
    }).join('');
}
// Expose functions for inline onclick handlers
let adminCurrentSession = null;
let adminChatUnsub = null;
async function loadChatSessions() {
    const sessionsDiv = document.getElementById('admin-chat-sessions');
    if (!sessionsDiv) return;
    const { collection: col, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    try {
        const snap = await getDocs(col(db, 'chat_sessions'));
        if (snap.empty) { sessionsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No active chats yet.</p>'; return; }
        sessionsDiv.innerHTML = '';
        const active = snap.docs.filter(d => !d.data().ended);
        if (active.length === 0) { sessionsDiv.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No active chats yet.</p>'; return; }
        active.forEach(d => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.cssText = 'width:100%;text-align:left;padding:0.6rem 0.8rem;font-size:0.85rem;display:flex;align-items:center;gap:0.5rem';
            const guestName = d.data().guestName || d.id;
            btn.innerHTML = `<i class="fas fa-user-circle" style="color:var(--secondary)"></i> ${guestName}`;
            btn.onclick = () => openAdminChat(d.id);
            sessionsDiv.appendChild(btn);
        });
    } catch(e) { console.error('Failed to load chat sessions:', e); }
}
async function openAdminChat(sessionId) {
    adminCurrentSession = sessionId;
    document.getElementById('admin-chat-title').innerHTML = `<i class="fas fa-comment"></i> Chat: ${sessionId}`;
    if (adminChatUnsub) adminChatUnsub();
    const { collection: col, query: q, orderBy: ob, onSnapshot: ons } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const ref = col(db, 'chat_sessions', sessionId, 'messages');
    adminChatUnsub = ons(q(ref, ob('ts', 'asc')), snap => {
        const container = document.getElementById('admin-chat-messages');
        if (!container) return;
        container.innerHTML = '';
        snap.docs.forEach(d => {
            const data = d.data();
            const div = document.createElement('div');
            const isAdmin = data.sender === 'admin';
            div.style.cssText = isAdmin
                ? 'background:var(--secondary);color:white;border-radius:12px 12px 0 12px;padding:0.7rem 1rem;max-width:80%;font-size:0.88rem;align-self:flex-end;line-height:1.5;margin-left:auto'
                : 'background:white;border:1px solid #e2e8f0;border-radius:12px 12px 12px 0;padding:0.7rem 1rem;max-width:80%;font-size:0.88rem;color:var(--text-main);line-height:1.5';
            const urlMatch = data.text.match(/https?:\/\/[^\s]+/);
    if (data.sender === 'admin' && urlMatch) {
      const url = urlMatch[0];
      const label = data.text.replace(url, '').trim();
      div.innerHTML = `${label ? `<span style="display:block;margin-bottom:4px;font-size:0.8rem;opacity:0.8">${label}</span>` : ''}<a href="${url}" target="_blank" style="color:#93c5fd;font-size:0.8rem;word-break:break-all">${url}</a>`;
    } else {
      div.textContent = data.text;
    }
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}
async function adminSendMessage() {
    if (!adminCurrentSession) { showToast('Select a session first.', 'error'); return; }
    const input = document.getElementById('admin-chat-input');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    const { collection: col, addDoc: add, serverTimestamp: ts } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await add(col(db, 'chat_sessions', adminCurrentSession, 'messages'), { sender: 'admin', text: val, ts: ts() });
}

window.endChat = async () => {
    if (!adminCurrentSession) return;
    if (!confirm('End this chat session? This will send a closing message to the guest.')) return;
    const { collection: col, addDoc: add, serverTimestamp: ts, doc: fdoc, getDoc: fget, setDoc: fset } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    // Fetch guest name
    const sessSnap = await fget(fdoc(db, 'chat_sessions', adminCurrentSession));
    const guestName = sessSnap.exists() ? (sessSnap.data().guestName || 'there') : 'there';
    const closingMsg = `Thank you, ${guestName}! 😊 We appreciate you reaching out to Baao Coop. If you haven't yet, we'd love to have you as a member — visit our Membership page anytime! Also, feel free to subscribe to our newsletter with your email to stay updated on our latest news and programs. Have a wonderful day! 🌟`;
    await add(col(db, 'chat_sessions', adminCurrentSession, 'messages'), { sender: 'admin', text: closingMsg, ts: ts() });
    // Mark session as ended
    await fset(fdoc(db, 'chat_sessions', adminCurrentSession), { ended: true, endedAt: new Date().toISOString() }, { merge: true });
    showToast('Chat ended. Closing message sent.');
    adminCurrentSession = null;
    if (adminChatUnsub) { adminChatUnsub(); adminChatUnsub = null; }
    document.getElementById('admin-chat-title').innerHTML = '<i class="fas fa-comment"></i> Select a session';
    document.getElementById('admin-chat-messages').innerHTML = '';
    loadChatSessions();
}
window.adminSendMessage = adminSendMessage;
window.loadChatSessions = loadChatSessions;
window.loadContactSubmissions = loadContactSubmissions;
function openModal(title, catName = '', itemsStr = '', index = -1) {
    document.getElementById('modal-title').innerText = title;
    const items = itemsStr ? itemsStr.split('|') : [];
    document.getElementById('modal-body').innerHTML = `
        <input type="hidden" id="crud-cat-index" value="${index}">
        <div class="form-group"><label class="form-label">Category Name</label><input type="text" id="crud-cat-name" class="form-control" value="${catName}"></div>
        <div class="form-group" style="flex:1;display:flex;flex-direction:column"><label class="form-label">Programs / Items (one per line)</label><textarea id="crud-cat-items" class="form-control" style="flex:1;min-height:200px">${items.join('\n')}</textarea></div>
        <div style="text-align:right;margin-top:2rem">
            <button class="btn btn-secondary" onclick="closeModal()" style="margin-right:0.5rem">Cancel</button>
            <button class="btn btn-primary" onclick="saveServiceCategory()"><i class="fas fa-save"></i> Save</button>
        </div>`;
    document.getElementById('crud-modal').style.display = 'flex';
}
async function saveServiceCategory() {
    const name = document.getElementById('crud-cat-name').value.trim();
    const itemsRaw = document.getElementById('crud-cat-items').value.trim();
    const idxInput = document.getElementById('crud-cat-index');
    const idx = idxInput && idxInput.value !== '' ? parseInt(idxInput.value) : -1;
    if (!name) { showToast('Category name is required.', 'error'); return; }
    const items = itemsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    try {
        const snap = await getDoc(doc(db, 'settings', 'services'));
        let cats = snap.exists() ? (snap.data().categories || []) : [];
        if (idx > -1 && idx < cats.length) {
            cats[idx] = { name, items };
        } else {
            cats.push({ name, items });
        }
        await setDoc(doc(db, 'settings', 'services'), { categories: cats }, { merge: true });
        showToast('Service category saved!');
        closeModal();
        if(typeof loadServicesAdmin === 'function') loadServicesAdmin();
    } catch(e) { showToast('Failed to save category.', 'error'); console.error(e); }
}
async function deleteBanner(tab) {
    if (!confirm(`Remove banner for "${TAB_LABELS[tab] || tab}"?`)) return;
    try {
        await setDoc(doc(db, 'settings', 'banners'), { [tab]: null }, { merge: true });
        showToast(`Banner for ${TAB_LABELS[tab] || tab} removed.`, 'error');
        await loadBannerPreviews();
    } catch(e) { showToast('Failed to delete banner.', 'error'); }
}
window.deleteBanner = deleteBanner;
window.openModal = openModal;
window.saveServiceCategory = saveServiceCategory;
window.handleLogin = handleLogin;
window.switchMainTab = switchMainTab;
window.switchSubTab = switchSubTab;
window.openBranchModal = openBranchModal;
window.closeModal = closeModal;
window.saveAboutAll = saveAboutAll;
window.openDataModal = openDataModal;
window.saveDataModal = saveDataModal;
window.deleteData = deleteData;
window.addMediaLink = addMediaLink;
window.removeMediaLink = removeMediaLink;
window.toggleMediaPreview = toggleMediaPreview;
window.saveMediaLinks = saveMediaLinks;
window.addFormLink = addFormLink;
window.removeFormLink = removeFormLink;
window.saveMembershipData = saveMembershipData;
window.saveHomeHero = saveHomeHero;
window.saveAboutStats = saveAboutStats;
window.openAlbumCreateModal = openAlbumCreateModal;
window.openAlbumEditModal = openAlbumEditModal;
window.closeAlbumModal = closeAlbumModal;
window.saveAlbum = saveAlbum;
window.deleteAlbumPhoto = deleteAlbumPhoto;
window.deleteAlbum = deleteAlbum;
async function loadContactSubmissions() {
    const list = document.getElementById('admin-contact-list');
    const countEl = document.getElementById('contact-total-count');
    if (!list) return;
    let items = [];
    try {
        const snap = await getDoc(doc(db, 'settings', 'contact_submissions'));
        if (snap.exists()) items = snap.data().items || [];
    } catch(e) { console.error('Failed to load contact submissions:', e); }
    if (countEl) countEl.innerText = items.length;
    if (items.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);padding:2rem 0;text-align:center;">No submissions yet.</p>';
        return;
    }
    list.innerHTML = items.slice().reverse().map(f => `
        <div style="background:var(--bg-alt);padding:1rem 1.5rem;border-radius:var(--radius-sm);box-shadow:var(--shadow-sm);border:var(--glass-border);margin-bottom:1rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
                <span style="font-weight:700;color:var(--text-main)">${f.name} <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem">&lt;${f.email}&gt;</span></span>
                <span style="font-size:0.75rem;color:var(--text-muted)">${f.date}</span>
            </div>
            <p style="font-weight:600;color:var(--secondary);font-size:0.9rem;margin-bottom:0.3rem">${f.subject}</p>
            <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.5">${f.message}</p>
        </div>
    `).join('');
}
async function loadFeedbacks() {
    const list = document.getElementById('admin-feedback-list');
    const countEl = document.getElementById('fb-total-count');
    let items = [];
    try {
        const snap = await getDoc(doc(db, 'settings', 'feedbacks'));
        if (snap.exists()) items = snap.data().items || [];
    } catch(e) { console.error('Failed to load feedbacks:', e); }
    countEl.innerText = items.length;
    if (items.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted); padding:2rem 0; text-align:center;">No feedbacks available yet.</p>';
        return;
    }
    list.innerHTML = items.slice().reverse().map(f => `
        <div style="background:var(--bg-alt); padding:1rem 1.5rem; border-radius:var(--radius-sm); box-shadow:var(--shadow-sm); border:var(--glass-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <span style="font-weight:700; color:var(--text-main);">${f.name}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${f.date}</span>
            </div>
            <div style="margin-bottom:0.5rem; color:#f59e0b;">${'★'.repeat(f.rating)}<span style="color:#cbd5e1;">${'★'.repeat(5 - f.rating)}</span></div>
            <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">${f.message}</p>
        </div>
    `).join('');
}
// =========================================================
// ARTICLES ADMIN
// =========================================================
let _adminArticles = [];
let _editingArticleId = null;
let _articleSections = [];
let _articleCoverFile = null;
let _articleCoverUrl = '';

const ARTICLE_SECTION_TYPES = {
  news:         { label: 'News Update',    icon: 'fa-newspaper' },
  announcement: { label: 'Announcement',   icon: 'fa-bullhorn' },
  event:        { label: 'Event Details',  icon: 'fa-calendar-alt' },
  promotion:    { label: 'Promotion',      icon: 'fa-tag' },
  highlight:    { label: 'Highlight',      icon: 'fa-star' },
  gallery:      { label: 'Photo Gallery',  icon: 'fa-images' },
  custom:       { label: 'Custom Section', icon: 'fa-pen' },
};

(async () => {
  try {
    const { collection, query, orderBy, onSnapshot } =
      await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    onSnapshot(q, snap => {
      _adminArticles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderArticlesTable();
    });
  } catch (e) { console.error('Articles listener error:', e); }
})();

// Cover image preview
document.addEventListener('DOMContentLoaded', () => {
  const coverInput = document.getElementById('art-cover-input');
  if (coverInput) {
    coverInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast('Max 5MB for cover image.', 'error'); return; }
      _articleCoverFile = file;
      const preview = document.getElementById('art-cover-preview');
      const reader = new FileReader();
      reader.onload = ev => {
        preview.innerHTML = `
          <div style="position:relative;display:inline-block">
            <img src="${ev.target.result}" style="width:100%;max-height:160px;object-fit:cover;border-radius:var(--radius-sm)">
            <button onclick="removeArticleCover()" style="position:absolute;top:6px;right:6px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>
          </div>`;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }
});

window.removeArticleCover = function () {
  _articleCoverFile = null;
  _articleCoverUrl = '';
  const input = document.getElementById('art-cover-input');
  if (input) input.value = '';
  const preview = document.getElementById('art-cover-preview');
  if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
};

function renderArticlesTable() {
  const tbody = document.getElementById('articles-tbody');
  if (!tbody) return;
  if (_adminArticles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--text-muted);text-align:center;padding:2rem">No articles yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = _adminArticles.map(a => `
    <tr>
      <td><strong>${a.title}</strong></td>
      <td style="font-size:0.82rem">${a.category || '—'}</td>
      <td style="font-size:0.82rem;color:var(--text-muted)">${(a.sections || []).length} section${(a.sections || []).length !== 1 ? 's' : ''}</td>
      <td>
        <span style="font-size:0.7rem;padding:0.2rem 0.6rem;border-radius:99px;font-weight:700;
          background:${a.status === 'draft' ? '#fff3e0' : '#e8f5e9'};
          color:${a.status === 'draft' ? '#e65100' : '#388e3c'}">
          ${a.status === 'draft' ? 'Draft' : 'Published'}
        </span>
      </td>
      <td>
        <div class="action-icons">
          <a href="article.html?id=${a.id}" target="_blank" title="View"><i class="fas fa-eye"></i></a>
          <i class="fas fa-edit" onclick="editArticle('${a.id}')" title="Edit"></i>
          <i class="fas fa-trash" onclick="deleteArticle('${a.id}')" title="Delete"></i>
        </div>
      </td>
    </tr>`).join('');
}

window.addArticleSection = function () {
  const type = document.getElementById('art-section-type').value;
  _articleSections.push({
    type,
    heading: '',
    content: '',
    image: '',
    image_caption: '',
    _open: true,
    events: type === 'event' ? [] : undefined,
  });
  renderArticleSections();
};

window.removeArticleSection = function (i) {
  _articleSections.splice(i, 1);
  renderArticleSections();
};

window.moveArticleSection = function (i, dir) {
  const j = i + dir;
  if (j < 0 || j >= _articleSections.length) return;
  [_articleSections[i], _articleSections[j]] = [_articleSections[j], _articleSections[i]];
  renderArticleSections();
};

window.updateArticleSection = function (i, field, value) {
  _articleSections[i][field] = value;
};

window.toggleArticleSection = function (i) {
  _articleSections[i]._open = !_articleSections[i]._open;
  renderArticleSections();
};

window.uploadArticleSectionImage = async function (i) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Uploading image...');
    const url = await uploadToCloudinary(file);
    if (url) {
      _articleSections[i].image = url;
      renderArticleSections();
      showToast('Image uploaded!');
    }
  };
  input.click();
};

window.addArticleEvent = function (si) {
  if (!_articleSections[si].events) _articleSections[si].events = [];
  _articleSections[si].events.push({ title: '', date: '', description: '' });
  renderArticleSections();
};

window.removeArticleEvent = function (si, ei) {
  _articleSections[si].events.splice(ei, 1);
  renderArticleSections();
};

window.updateArticleEvent = function (si, ei, field, value) {
  _articleSections[si].events[ei][field] = value;
};

function renderArticleSections() {
  const list = document.getElementById('art-sections-list');
  if (!list) return;
  if (_articleSections.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.85rem;border:1px dashed #e2e8f0;border-radius:var(--radius-sm)">No sections yet. Add one above.</div>`;
    return;
  }
  list.innerHTML = _articleSections.map((s, i) => {
    const def = ARTICLE_SECTION_TYPES[s.type] || ARTICLE_SECTION_TYPES.custom;
    const isOpen = s._open !== false;
    return `
      <div style="border:1px solid #e2e8f0;border-radius:var(--radius-sm);overflow:hidden;margin-bottom:0.5rem">
        <div onclick="toggleArticleSection(${i})"
          style="display:flex;align-items:center;justify-content:space-between;padding:0.65rem 1rem;background:#f8fafc;cursor:pointer;user-select:none"
          onmouseenter="this.querySelector('.sec-actions').style.opacity='1'"
          onmouseleave="this.querySelector('.sec-actions').style.opacity='0'">
          <div style="display:flex;align-items:center;gap:0.6rem;font-size:0.82rem;font-weight:700;color:var(--text-main)">
            <i class="fas ${def.icon}" style="color:var(--secondary)"></i>
            ${s.heading || def.label}
          </div>
          <div style="display:flex;align-items:center;gap:0.25rem">
            <div class="sec-actions" onclick="event.stopPropagation()"
              style="display:flex;align-items:center;gap:0.1rem;opacity:0;transition:opacity .2s">
              <button onclick="moveArticleSection(${i},-1)"
                style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0.2rem 0.4rem;font-size:0.75rem">
                <i class="fas fa-arrow-up"></i></button>
              <button onclick="moveArticleSection(${i},1)"
                style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0.2rem 0.4rem;font-size:0.75rem">
                <i class="fas fa-arrow-down"></i></button>
              <button onclick="removeArticleSection(${i})"
                style="background:none;border:none;color:#ef4444;cursor:pointer;padding:0.2rem 0.4rem;font-size:0.75rem">
                <i class="fas fa-trash"></i></button>
            </div>
            <i class="fas fa-chevron-${isOpen ? 'up' : 'down'}"
              style="color:var(--text-muted);font-size:0.75rem;margin-left:0.5rem;pointer-events:none"></i>
          </div>
        </div>
        ${isOpen ? `
        <div style="padding:1rem;display:flex;flex-direction:column;gap:0.75rem">
          <div class="form-group" style="margin:0">
            <label class="form-label">Section Heading</label>
            <input type="text" class="form-control" value="${s.heading || ''}"
              placeholder="${def.label}"
              oninput="updateArticleSection(${i},'heading',this.value)">
          </div>
          ${s.type !== 'event' ? `
          <div class="form-group" style="margin:0">
            <label class="form-label">Content</label>
            <div style="border:1px solid #e2e8f0;border-radius:var(--radius-sm);overflow:hidden">
              <div style="background:#f8fafc;padding:0.3rem 0.5rem;display:flex;gap:0.25rem;border-bottom:1px solid #e2e8f0">
                <button type="button" onclick="document.execCommand('bold')" style="background:none;border:none;cursor:pointer;color:var(--text-main);padding:0.3rem 0.6rem;border-radius:4px;font-size:0.8rem"><i class="fas fa-bold"></i></button>
                <button type="button" onclick="document.execCommand('italic')" style="background:none;border:none;cursor:pointer;color:var(--text-main);padding:0.3rem 0.6rem;border-radius:4px;font-size:0.8rem"><i class="fas fa-italic"></i></button>
                <button type="button" onclick="document.execCommand('underline')" style="background:none;border:none;cursor:pointer;color:var(--text-main);padding:0.3rem 0.6rem;border-radius:4px;font-size:0.8rem"><i class="fas fa-underline"></i></button>
              </div>
              <div contenteditable="true"
                style="padding:0.75rem;min-height:100px;background:#fff;outline:none;font-size:0.85rem;line-height:1.6"
                oninput="updateArticleSection(${i},'content',this.innerHTML)">${s.content || ''}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
            <button onclick="uploadArticleSectionImage(${i})" class="btn btn-secondary"
              style="padding:0.4rem 0.85rem;font-size:0.75rem">
              <i class="fas fa-image"></i> ${s.image ? 'Change Image' : 'Add Image'}
            </button>
            ${s.image ? `
            <div style="display:flex;align-items:center;gap:0.5rem">
              <img src="${s.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">
              <button onclick="updateArticleSection(${i},'image','');renderArticleSections()"
                style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.75rem">
                <i class="fas fa-trash"></i></button>
            </div>` : ''}
          </div>
          ${s.image ? `
          <div class="form-group" style="margin:0">
            <label class="form-label">Image Caption (optional)</label>
            <input type="text" class="form-control" value="${s.image_caption || ''}"
              placeholder="Photo caption..."
              oninput="updateArticleSection(${i},'image_caption',this.value)">
          </div>` : ''}
          ` : ''}
          ${s.type === 'event' ? `
          <div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700">Events</div>
            ${(s.events || []).map((ev, ei) => `
            <div style="border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:0.75rem;margin-bottom:0.75rem;display:flex;flex-direction:column;gap:0.5rem">
              <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:0.5rem;align-items:end">
                <div class="form-group" style="margin:0">
                  <label class="form-label">Event Title</label>
                  <input type="text" class="form-control" value="${ev.title || ''}" placeholder="e.g. General Assembly"
                    oninput="updateArticleEvent(${i},${ei},'title',this.value)">
                </div>
                <div class="form-group" style="margin:0">
                  <label class="form-label">Date</label>
                  <input type="date" class="form-control" value="${ev.date || ''}"
                    oninput="updateArticleEvent(${i},${ei},'date',this.value)">
                </div>
                <button onclick="removeArticleEvent(${i},${ei})"
                  style="background:none;border:none;color:#ef4444;cursor:pointer;margin-bottom:0.5rem">
                  <i class="fas fa-times"></i></button>
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Description</label>
                <textarea class="form-control" rows="2" placeholder="Event details..."
                  oninput="updateArticleEvent(${i},${ei},'description',this.value)">${ev.description || ''}</textarea>
              </div>
            </div>`).join('')}
            <button onclick="addArticleEvent(${i})" class="btn btn-secondary"
              style="padding:0.35rem 0.75rem;font-size:0.75rem">
              <i class="fas fa-plus"></i> Add Event
            </button>
          </div>` : ''}
        </div>` : ''}
      </div>`;
  }).join('');
}

window.saveArticle = async function () {
  await _saveArticleToDb('published');
};

window.saveArticleDraft = async function () {
  await _saveArticleToDb('draft');
};

async function _saveArticleToDb(status) {
  const title = document.getElementById('art-title')?.value.trim();
  if (!title) { showToast('Title is required.', 'error'); return; }
  if (_articleSections.length === 0 && status === 'published') {
    showToast('Add at least one section before publishing.', 'error'); return;
  }
  let coverImage = _articleCoverUrl;
  if (_articleCoverFile) {
    showToast('Uploading cover image...');
    coverImage = await uploadToCloudinary(_articleCoverFile);
    if (!coverImage) return;
  }
  const payload = {
    slug: slugifyArticleAdmin(title),
    title,
    subtitle: document.getElementById('art-subtitle')?.value.trim() || '',
    label: document.getElementById('art-label')?.value.trim() || '',
    author: document.getElementById('art-author')?.value.trim() || '',
    category: document.getElementById('art-category')?.value || 'News',
    read_time: parseInt(document.getElementById('art-readtime')?.value) || null,
    published_at: document.getElementById('art-date')?.value || new Date().toISOString().split('T')[0],
    cover_image: coverImage || '',
    sections: _articleSections.map(s => {
      const clean = { ...s };
      delete clean._open;
      return clean;
    }),
    status,
  };
  try {
    const { collection, addDoc, updateDoc, doc, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    if (_editingArticleId) {
      await updateDoc(doc(db, 'articles', _editingArticleId), payload);
      showToast(`"${title}" updated!`);
    } else {
      await addDoc(collection(db, 'articles'), { ...payload, createdAt: serverTimestamp() });
      showToast(`"${title}" ${status === 'draft' ? 'saved as draft!' : 'published!'}`);
    }
    resetArticleForm();
  } catch (e) {
    console.error(e);
    showToast('Failed to save article.', 'error');
  }
}

window.editArticle = function (id) {
  const a = _adminArticles.find(x => x.id === id);
  if (!a) return;
  _editingArticleId = id;
  document.getElementById('art-title').value = a.title || '';
  document.getElementById('art-subtitle').value = a.subtitle || '';
  document.getElementById('art-label').value = a.label || '';
  document.getElementById('art-author').value = a.author || '';
  document.getElementById('art-category').value = a.category || 'News';
  document.getElementById('art-readtime').value = a.read_time || '';
  document.getElementById('art-date').value = a.published_at || '';
  _articleCoverUrl = a.cover_image || '';
  _articleCoverFile = null;
  const preview = document.getElementById('art-cover-preview');
  if (a.cover_image && preview) {
    preview.innerHTML = `
      <div style="position:relative;display:inline-block">
        <img src="${a.cover_image}" style="width:100%;max-height:160px;object-fit:cover;border-radius:var(--radius-sm)">
        <button onclick="removeArticleCover()" style="position:absolute;top:6px;right:6px;background:rgba(220,38,38,0.9);color:white;border:none;border-radius:50%;width:22px;height:22px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-times"></i></button>
      </div>`;
    preview.style.display = 'block';
  }
  _articleSections = JSON.parse(JSON.stringify(a.sections || []));
  renderArticleSections();
  const cancelBtn = document.getElementById('art-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  showToast('Editing article — make changes and save.');
  document.getElementById('art-sections-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.cancelEditArticle = function () {
  resetArticleForm();
};

window.deleteArticle = async function (id) {
  if (!confirm('Delete this article?')) return;
  try {
    const { doc, deleteDoc } =
      await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'articles', id));
    showToast('Article deleted.', 'error');
  } catch (e) {
    console.error(e);
    showToast('Failed to delete.', 'error');
  }
};

function resetArticleForm() {
  _editingArticleId = null;
  _articleSections = [];
  _articleCoverFile = null;
  _articleCoverUrl = '';
  ['art-title','art-subtitle','art-label','art-author','art-readtime','art-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const cat = document.getElementById('art-category');
  if (cat) cat.value = 'News';
  removeArticleCover();
  renderArticleSections();
  const cancelBtn = document.getElementById('art-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function slugifyArticleAdmin(title) {
  return (title || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

window.renderArticleSections = renderArticleSections;