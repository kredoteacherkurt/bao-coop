/*
SCRIPT.JS - UNIVERSAL CONTROLLER
Fixes: Login, Admin CMS, Member Transactions, and Index Video/Text
*/
// --- CUSTOM MODAL SYSTEM ---
function createModalUI() {
 if (document.getElementById('customModalOverlay')) return;
 const overlay = document.createElement('div');
 overlay.className = 'custom-modal-overlay';
 overlay.id = 'customModalOverlay';
 overlay.innerHTML = `
<div class="custom-modal-box" id="customModalBox">
<h3 id="customModalTitle">Notice</h3>
<p id="customModalText"></p>
<div class="custom-modal-actions" id="customModalActions"></div>
</div>
`;
 document.body.appendChild(overlay);
}
window.customAlert = function(msg, title = 'Notice') {
 createModalUI();
 const overlay = document.getElementById('customModalOverlay');
 document.getElementById('customModalTitle').innerText = title;
 document.getElementById('customModalText').innerText = msg;
 const actions = document.getElementById('customModalActions');
 actions.innerHTML = `<button class="custom-modal-btn custom-modal-btn-primary" onclick="closeCustomModal()">OK</button>`;
 document.getElementById('customModalBox').className = 'custom-modal-box';
 overlay.classList.add('active');
};
window.customConfirm = function(msg, onConfirm, title = 'Confirm Action') {
 createModalUI();
 const overlay = document.getElementById('customModalOverlay');
 document.getElementById('customModalTitle').innerText = title;
 document.getElementById('customModalText').innerText = msg;
 const actions = document.getElementById('customModalActions');
 actions.innerHTML = `
<button class="custom-modal-btn custom-modal-btn-cancel" id="btnModalCancel">Cancel</button>
<button class="custom-modal-btn custom-modal-btn-primary" id="btnModalConfirm">Confirm</button>
`;
 document.getElementById('btnModalCancel').onclick = closeCustomModal;
 document.getElementById('btnModalConfirm').onclick = function() {
  closeCustomModal();
  if (onConfirm) onConfirm();
 };
 document.getElementById('customModalBox').className = 'custom-modal-box';
 overlay.classList.add('active');
};
function closeCustomModal() {
 const overlay = document.getElementById('customModalOverlay');
 if (overlay) overlay.classList.remove('active');
}
window.showAgreementModal = function() {
 createModalUI();
 const overlay = document.getElementById('customModalOverlay');
 document.getElementById('customModalTitle').innerText = 'Terms and Conditions';
 document.getElementById('customModalText').innerHTML = `
By proceeding, you agree to the Baao Coop Data Privacy Act and Loan terms. You must strictly abide by the monthly amortization schedule.
<br><br>Failure to comply may result in deductions from your regular savings or termination of benefits.
`;
 const actions = document.getElementById('customModalActions');
 actions.innerHTML = `<button class="custom-modal-btn custom-modal-btn-primary" onclick="closeCustomModal()">I Understand</button>`;
 document.getElementById('customModalBox').className = 'custom-modal-box wide';
 overlay.classList.add('active');
};
window.alert = function(msg) {
 customAlert(msg);
};
// ==========================================
// 1. CONFIGURATION & DEFAULTS
// ==========================================
const defaultContent = {
 tagline: "baaocoop... truly cares!",
 aboutText: "It was on August 26, 1963 when the organization was first registered as Baao Parish Credit Union Incorporated (BPCUI). It started with 50 members with an accumulated Paid Capital of ₱1,193.00. Historically, the word 'Parish' refers to the 'Hijas de Maria', a religious organization of the Parish. From humble beginnings, it has grown into a Large Cooperative Category institution.",
 assets: "Large Cooperative Category",
 videoFile: "seminar.mp4",
 aboutImages: ["assets/images/logo.png"], 
 statAssets: 500,
 statMembers: 15000,
 statYears: 30
};
// ==========================================
// 2. INITIALIZATION (RUNS ON EVERY PAGE LOAD)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
 initDatabase();
 // DETECT PAGE AND LOAD LOGIC
 if (document.getElementById('public-page')) loadPublicPage();
 if (document.getElementById('member-page')) loadMemberPage();
 if (document.getElementById('admin-page')) loadAdminPage();
 // LOGIN HANDLER (If we are on login.html)
 const loginForm = document.getElementById('loginForm');
 if (loginForm) {
  initLogin(loginForm);
 }
 if (document.getElementById('signupForm')) initSignup();
});
function initDatabase() {
 // Initialize Site Content
 if (!localStorage.getItem('siteContent')) {
  localStorage.setItem('siteContent', JSON.stringify(defaultContent));
 } else {
  const existing = JSON.parse(localStorage.getItem('siteContent'));
  if (existing.videoUrl === undefined) {
   existing.videoUrl = '';
   localStorage.setItem('siteContent', JSON.stringify(existing));
  }
 }
 // Initialize Transactions
 if (!localStorage.getItem('transactions')) {
  localStorage.setItem('transactions', JSON.stringify([]));
 }
 // Initialize Users
 if (!localStorage.getItem('userDatabase')) {
  localStorage.setItem('userDatabase', JSON.stringify([]));
 }
}
// ==========================================
// 3. AUTHENTICATION (FIXED)
// ==========================================
function initLogin(form) {
 console.log("Login System: Ready");
 form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  const pass = document.getElementById('passwordInput').value.trim();
  // ------------------------------------------------
  // 1. ADMIN LOGIN CHECK (Specific Credentials)
  // ------------------------------------------------
  if (email === 'bpmpc@admin.me' && pass === 'admin101') {
   const adminUser = {
    name: "Administrator",
    email: "bpmpc@admin.me",
    role: "ADMIN" // Important flag
   };
   localStorage.setItem('currentUser', JSON.stringify(adminUser));
   alert("Verifying Admin Credentials... Success!");
   window.location.href = 'admin.html';
   return; // Stop here, do not check member DB
  }
  // ------------------------------------------------
  // 2. MEMBER LOGIN CHECK
  // ------------------------------------------------
  const users = JSON.parse(localStorage.getItem('userDatabase')) || [];
  // Find member with matching email AND password
  const validUser = users.find(u => u.email === email && u.password === pass);
  if (validUser) {
   // Save member session (without the admin role)
   const memberSession = {
    ...validUser,
    role: "MEMBER"
   };
   localStorage.setItem('currentUser', JSON.stringify(memberSession));
   alert(`Welcome back, ${validUser.name}!`);
   window.location.href = 'members.html'; // Redirect to Member Portal
  } else {
   alert("Invalid Email or Password. Please try again.");
  }
 });
}
// ==========================================
// 4. PUBLIC PAGE (INDEX.HTML)
// ==========================================
function loadPublicPage() {
 const data = JSON.parse(localStorage.getItem('siteContent'));
 // Inject Text
 const setText = (id, val) => {
  if (document.getElementById(id)) document.getElementById(id).innerText = val;
 };
 setText('hero-tagline-display', data.tagline);
 setText('about-text-display', data.aboutText);
 
 // Stats Inject
 const setStat = (id, val) => { if (document.getElementById(id)) document.getElementById(id).setAttribute('data-target', val || 0); };
 setStat('stat-assets-val', data.statAssets);
 setStat('stat-members-val', data.statMembers);
 setStat('stat-years-val', data.statYears);

 // Carousel Inject
 const cSlides = document.getElementById('carousel-slides');
 const cPills = document.getElementById('carousel-pills');
 if (cSlides && data.aboutImages && data.aboutImages.length > 0) {
  cSlides.innerHTML = ''; cPills.innerHTML = '';
  data.aboutImages.forEach((img, idx) => {
   cSlides.innerHTML += `<div class="carousel-slide" style="background-image:url('${img}')"></div>`;
   cPills.innerHTML += `<div class="pill ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})"></div>`;
  });
  window.currentSlide = 0;
  window.goToSlide = (idx) => {
   window.currentSlide = idx;
   cSlides.style.transform = `translateX(-${idx * 100}%)`;
   document.querySelectorAll('.pill').forEach((p, i) => { p.className = `pill ${i === idx ? 'active' : ''}`; });
  };
  if(data.aboutImages.length > 1) {
   setInterval(() => { window.goToSlide((window.currentSlide + 1) % data.aboutImages.length); }, 4000);
  } else { cPills.style.display = 'none'; }
 }
 // Inject Embedded YouTube Video directly into the wrapper
 const videoWrapper = document.getElementById('promo-video-wrapper');
 if (videoWrapper && data.videoUrl) {
  let src = data.videoUrl.trim();
  console.log('=== VIDEO RENDER DEBUG ===');
  console.log('Raw value from storage:', src);
  // If admin pasted a full <iframe>, extract the src from it
  if (src.includes('<iframe')) {
   const match = src.match(/src="([^"]+)"/);
   src = match ? match[1] : '';
   src = src.split('?')[0]; // strip ?si= and any tracking params
  } else if (src.includes('youtu.be/')) {
   src = 'https://www.youtube.com/embed/' + src.split('youtu.be/')[1].split('?')[0];
  } else if (src.includes('watch?v=')) {
   src = 'https://www.youtube.com/embed/' + src.split('watch?v=')[1].split('&')[0];
  }
  console.log('Final src injected:', src);
  console.log('==========================');
  videoWrapper.innerHTML = `<iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
 }
}
// ==========================================
// 5. MEMBER DASHBOARD CONTROLLER
// ==========================================
const SERVICES = {
 savings: ["Regular Savings", "Time Deposit", "Koop Alkansya", "Retirement Fund"],
 loans: ["Microfinance Loan", "Agricultural Loan", "Salary Loan", "Gadget Loan"],
 benefits: ["Damayang Pangkalusugan", "Death Aid Program", "Coop Life Program"]
};
function loadMemberPage() {
 const user = JSON.parse(localStorage.getItem('currentUser'));
 if (!user) {
  alert("Session expired. Please log in.");
  window.location.href = 'login.html';
  return;
 }
 // Display Name
 if (document.getElementById('display-name')) document.getElementById('display-name').innerText = user.name;
 // DOM Elements
 const typeSelect = document.getElementById('serviceType');
 const prodSelect = document.getElementById('serviceProduct');
 const amountInput = document.getElementById('amountInput');
 // New Elements for Calculator & Upload
 const calcSection = document.getElementById('loan-calculator-section');
 const termSelect = document.getElementById('loanTerm');
 const calcDisplay = document.getElementById('monthly-amortization');
 const fileInput = document.getElementById('proofFile');
 // A. Dynamic Dropdown & UI Toggling
 if (typeSelect) {
  typeSelect.addEventListener('change', () => {
   // Populate Products
   prodSelect.innerHTML = '<option value="">-- Select Product --</option>';
   const list = SERVICES[typeSelect.value];
   if (list) {
    list.forEach(item => {
     const opt = document.createElement('option');
     opt.value = item;
     opt.innerText = item;
     prodSelect.appendChild(opt);
    });
   }
   // Toggle Calculator & Upload Requirements
   if (typeSelect.value === 'loans') {
    calcSection.style.display = 'block'; // Show Calculator
    if (fileInput) fileInput.required = true; // Make ID Upload Required
   } else {
    calcSection.style.display = 'none'; // Hide Calculator
    if (fileInput) fileInput.required = false;
   }
  });
 }
 // B. Loan Calculator Logic (Real-time updates)
 function updateCalculator() {
  const rawVal = amountInput ? amountInput.value.replace(/,/g, '') : "0";
  const principal = parseFloat(rawVal) || 0;
  const months = parseInt(termSelect.value) || 3;
  const interestRate = 0.015; // 1.5% Monthly Interest
  if (principal > 0 && typeSelect.value === 'loans') {
   const totalInterest = principal * interestRate * months;
   const totalDue = principal + totalInterest;
   const monthlyPayment = totalDue / months;
   calcDisplay.innerHTML = `
<div style="font-size:.85rem;color:#666">
Principal: ₱${principal.toLocaleString()} <br>
Total Interest: ₱${totalInterest.toLocaleString()} (1.5% / mo)
</div>
<div style="font-size:1.1rem;color:var(--primary);margin-top:5px">
Monthly Amortization: <strong>₱ ${monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
</div>
`;
  } else {
   calcDisplay.innerHTML = 'Estimated Monthly Payment: ₱ 0.00';
  }
 }
 // Attach Listeners for Calculator
 if (amountInput) {
  amountInput.addEventListener('input', function() {
   let val = this.value.replace(/[^\d]/g, '');
   if (val) val = parseInt(val, 10).toLocaleString('en-US');
   this.value = val;
   updateCalculator();
  });
 }
 if (termSelect) termSelect.addEventListener('change', updateCalculator);
 // C. Handle Form Submit
 const form = document.getElementById('transactForm');
 if (form) {
  form.addEventListener('submit', (e) => {
   e.preventDefault();
   // 1. Get Basic Values
   const type = typeSelect.value;
   const prod = prodSelect.value;
   const amtVal = amountInput.value.replace(/,/g, '');
   const amt = parseFloat(amtVal);
   let term = (type === 'loans') ? termSelect.value + " Months" : "N/A";
   // 2. Prepare the File Reader
   const fileInput = document.getElementById('proofFile');
   const file = fileInput.files[0];
   // Helper: Create the Transaction Object
   const saveTransaction = (fileData, fileName) => {
    const newTrans = {
     id: Date.now(),
     userEmail: user.email,
     userName: user.name,
     category: type,
     product: prod,
     amount: amt,
     term: term,
     proofName: fileName || "None", // Store Name
     proofData: fileData || null, // Store Actual Image Data (Base64)
     date: new Date().toLocaleDateString(),
     status: "Pending"
    };
    const db = JSON.parse(localStorage.getItem('transactions'));
    db.unshift(newTrans);
    localStorage.setItem('transactions', JSON.stringify(db));
    alert("Application Submitted!");
    form.reset();
    calcSection.style.display = 'none';
    renderMemberHistory(user.email);
   };
   // 3. Process File (If exists)
   if (type === 'loans' && file) {
    // Check size (Limit to 5MB for LocalStorage safety)
    if (file.size > 5000000) {
     alert("File is too large! Please upload a PDF document under 5MB.");
     return;
    }
    const reader = new FileReader();
    // When reader finishes converting image to text...
    reader.onload = function(event) {
     const base64String = event.target.result; // This is the actual image data
     saveTransaction(base64String, file.name);
    };
    // Start reading
    reader.readAsDataURL(file);
   } else {
    // No file (Savings or Benefit)
    saveTransaction(null, "None");
   }
  });
 }
 renderMemberHistory(user.email);
}
function renderMemberHistory(email) {
 const db = JSON.parse(localStorage.getItem('transactions'));
 const myTrans = db.filter(t => t.userEmail === email);
 const tbody = document.getElementById('member-trans-body');
 let savings = 0,
  loans = 0;
 if (tbody) {
  tbody.innerHTML = '';
  if (myTrans.length === 0) {
   tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No transaction history.</td></tr>';
  } else {
   myTrans.forEach(t => {
    // Calculate Stats
    if (t.status === 'Approved') {
     if (t.category === 'savings') savings += t.amount;
     if (t.category === 'loans') loans += t.amount;
    }
    // Determine Badge Color
    const badge = t.status === 'Pending' ? 'pending' : (t.status === 'Approved' ? 'approved' : 'rejected');
    // Format Details Column (Show Term & File if Loan)
    let details = t.category === 'loans' ? `Term: ${t.term}` : '-';
    if (t.proof && t.proof !== "None") {
     details += `<br><small style="color:#0056b3"><i class="fas fa-paperclip"></i> ${t.proof}</small>`;
    }
    tbody.innerHTML += `
<tr>
<td>${t.date}</td>
<td>${t.product}</td>
<td>${details}</td>
<td>₱ ${t.amount.toLocaleString()}</td>
<td><span class="status-badge ${badge}">${t.status}</span></td>
</tr>`;
   });
  }
 }
 // Update Stats Display
 if (document.getElementById('savings-display')) document.getElementById('savings-display').innerText = `₱ ${savings.toLocaleString()}`;
 if (document.getElementById('loan-display')) document.getElementById('loan-display').innerText = `₱ ${loans.toLocaleString()}`;
}
// ==========================================
// 6. ADMIN DASHBOARD (ADMIN.HTML)
// ==========================================
function loadAdminPage() {
 // 1. SILENT SECURITY CHECK
 const user = JSON.parse(localStorage.getItem('currentUser'));
 // If not logged in OR not Admin...
 if (!user || user.role !== 'ADMIN') {
  // ...Redirect immediately (replace() prevents using "Back" button)
  window.location.replace('login.html');
  return;
 }
 // 2. AUTHORIZED: Reveal the page
 // (This unhides the body tag we hid in HTML)
 document.body.style.display = 'flex';
 // 3. Load Data
 refreshAdminStats();
 renderAdminTransTable();
 renderAdminUserTable();
 loadCMSValues();
 // CMS Handler
 const cmsForm = document.getElementById('cmsForm');
 if (cmsForm) {
  cmsForm.addEventListener('submit', (e) => {
   e.preventDefault();
   const tagline = document.getElementById('cms-tagline').value;
   const assetsEl = document.getElementById('cms-assets');
   const assets = assetsEl ? assetsEl.value : JSON.parse(localStorage.getItem('siteContent')).assets;
   const aboutText = document.getElementById('cms-about').value;
   let videoFileName = '';
   const videoUrl = document.getElementById('cms-video-url') ? document.getElementById('cms-video-url').value.trim() : '';
   
   const statAssets = document.getElementById('cms-stat-assets') ? parseInt(document.getElementById('cms-stat-assets').value) || 500 : 500;
   const statMembers = document.getElementById('cms-stat-members') ? parseInt(document.getElementById('cms-stat-members').value) || 15000 : 15000;
   const statYears = document.getElementById('cms-stat-years') ? parseInt(document.getElementById('cms-stat-years').value) || 30 : 30;

   const oldContent = JSON.parse(localStorage.getItem('siteContent')) || {};
   const content = { ...oldContent, tagline, assets, aboutText, videoFile: videoFileName, videoUrl: videoUrl, statAssets, statMembers, statYears };

   const imgInput = document.getElementById('cms-about-images');
   if(imgInput && imgInput.files.length > 0) {
       const readers = []; const imgDataArray = [];
       for(let i=0; i<imgInput.files.length; i++) {
           const reader = new FileReader();
           readers.push(new Promise(res => {
               reader.onload = (e) => { imgDataArray.push(e.target.result); res(); };
               reader.readAsDataURL(imgInput.files[i]);
           }));
       }
       Promise.all(readers).then(() => {
           content.aboutImages = imgDataArray;
           localStorage.setItem('siteContent', JSON.stringify(content));
           alert("Website Updated! Check index.html.");
           loadCMSValues();
       });
       return; 
   } else {
       localStorage.setItem('siteContent', JSON.stringify(content));
   }
   // DEBUG
   console.log('=== CMS SAVE DEBUG ===');
   console.log('videoUrl saved:', videoUrl);
   console.log('Full content saved:', JSON.parse(localStorage.getItem('siteContent')));
   console.log('======================');
   alert("Website Updated! Check index.html.");
   loadCMSValues();
  });
 }
}
function loadCMSValues() {
 const data = JSON.parse(localStorage.getItem('siteContent')) || defaultContent;
 if (document.getElementById('cms-tagline')) document.getElementById('cms-tagline').value = data.tagline || '';
 if (document.getElementById('cms-assets')) document.getElementById('cms-assets').value = data.assets || '';
 if (document.getElementById('cms-about')) document.getElementById('cms-about').value = data.aboutText || '';
 if (document.getElementById('cms-video-url')) document.getElementById('cms-video-url').value = data.videoUrl || '';
 if (document.getElementById('cms-stat-assets')) document.getElementById('cms-stat-assets').value = data.statAssets || 500;
 if (document.getElementById('cms-stat-members')) document.getElementById('cms-stat-members').value = data.statMembers || 15000;
 if (document.getElementById('cms-stat-years')) document.getElementById('cms-stat-years').value = data.statYears || 30;
}
function renderAdminUserTable() {
 const users = JSON.parse(localStorage.getItem('userDatabase')) || [];
 const tbody = document.getElementById('admin-users-table');
 // Update Stat Counter
 if (document.getElementById('stat-members')) {
  document.getElementById('stat-members').innerText = users.length;
 }
 if (tbody) {
  tbody.innerHTML = '';
  if (users.length === 0) {
   tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No members found.</td></tr>';
   return;
  }
  users.forEach((u, index) => {
   // We do NOT show u.password anymore.
   // We assume all registered users are "Active" for this simulation.
   tbody.innerHTML += `
<tr>
<td><strong>${u.name}</strong></td>
<td>${u.email}</td>
<td><span class="badge badge-approved">Active Member</span></td>
<td>${u.dateJoined || 'N/A'}</td>
</tr>`;
  });
 }
}
function renderAdminTransTable() {
 const db = JSON.parse(localStorage.getItem('transactions'));
 const tbody = document.getElementById('admin-trans-table');
 if (!tbody) return;
 tbody.innerHTML = '';
 if (db.length === 0) {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">No requests found.</td></tr>';
  return;
 }
 db.forEach(t => {
  // Buttons
  let btns = '';
  if (t.status === 'Pending') {
   btns = `
<button onclick="adminDecision(${t.id},'Approved')" style="color:green;cursor:pointer;margin-right:5px"><i class="fas fa-check"></i></button>
<button onclick="adminDecision(${t.id},'Rejected')" style="color:red;cursor:pointer"><i class="fas fa-times"></i></button>
`;
  } else {
   btns = `<span style="font-weight:bold;color:${t.status === 'Approved'?'green':'red'}">${t.status}</span>`;
  }
  // VIEW BUTTON LOGIC
  let proofDisplay = "N/A";
  if (t.proofData) {
   proofDisplay = `<button onclick="viewDocument(${t.id})" style="color:blue;text-decoration:underline;border:0;background:0;cursor:pointer">
<i class="fas fa-eye"></i> View PDF
</button>`;
  } else if (t.proofName && t.proofName !== "None") {
   proofDisplay = t.proofName;
  }
  tbody.innerHTML += `
<tr>
<td>${t.id}</td>
<td><strong>${t.userName}</strong></td>
<td>${t.product}</td>
<td>₱${t.amount.toLocaleString()}</td>
<td>${t.term || '-'}</td>
<td>${proofDisplay}</td>
<td>${btns}</td>
</tr>`;
 });
}
function viewDocument(id) {
 const db = JSON.parse(localStorage.getItem('transactions'));
 const item = db.find(t => t.id === id);
 if (item && item.proofData) {
  openFilePanel(item.userName, item.proofName, item.proofData);
 } else {
  alert("Error: Document data not found.");
 }
}
// SLIDING PANEL ANIMATION
function openFilePanel(name, filename, itemsrc) {
 const panel = document.getElementById('fileSidePanel');
 const overlay = document.getElementById('panelOverlay');
 // Set content
 if (document.getElementById('view-member-name')) document.getElementById('view-member-name').innerText = name;
 if (document.getElementById('view-filename')) document.getElementById('view-filename').innerText = filename;
 // PDF Embed Update
 const iframe = document.getElementById('document-frame');
 if (iframe) {
  iframe.src = itemsrc;
 }
 // Animate
 if (overlay) overlay.style.display = 'block';
 if (panel) {
  panel.style.right = "-500px";
  setTimeout(() => {
   panel.style.right = "0";
  }, 10);
 }
}
function closeFilePanel() {
 const panel = document.getElementById('fileSidePanel');
 const overlay = document.getElementById('panelOverlay');
 if (panel) panel.style.right = "-500px";
 setTimeout(() => {
  if (overlay) overlay.style.display = 'none';
  const iframe = document.getElementById('document-frame');
  if (iframe) iframe.src = "";
 }, 400);
}
// Global function for buttons
window.adminDecision = function(id, status) {
 if (status === 'Approved') {
  customConfirm("Are you sure you want to approve this loan? This action is permanent.", () => {
   executeAdminDecision(id, status);
  });
 } else {
  executeAdminDecision(id, status);
 }
};
function executeAdminDecision(id, status) {
 const db = JSON.parse(localStorage.getItem('transactions'));
 const idx = db.findIndex(t => t.id === id);
 if (idx !== -1) {
  db[idx].status = status;
  try {
   localStorage.setItem('transactions', JSON.stringify(db));
   loadAdminPage(); // Refresh UI
  } catch (e) {
   console.warn("Storage quota exceeded! Stripping large file proofs to fit database limit.");
   // Clean bloated payloads to salvage action
   db.forEach(t => {
    if (t.proofData) {
     t.proofName = t.proofName + " (Data Removed due to Storage Limit)";
     delete t.proofData;
    }
   });
   localStorage.setItem('transactions', JSON.stringify(db));
   loadAdminPage();
   customAlert("Approval processed, but the PDF image cache was stripped from the storage due to your browser's limit. You can safely continue using the system.");
  }
 }
}
function refreshAdminStats() {
 const db = JSON.parse(localStorage.getItem('transactions'));
 const pending = db.filter(t => t.status === 'Pending').length;
 const approved = db.filter(t => t.status === 'Approved').reduce((acc, t) => acc + t.amount, 0);
 if (document.getElementById('stat-pending')) document.getElementById('stat-pending').innerText = pending;
 if (document.getElementById('stat-volume')) document.getElementById('stat-volume').innerText = "₱" + approved.toLocaleString();
}
// ==========================================
// 7. SIGN UP LOGIC (Fix for signup.html)
// ==========================================
function initSignup() {
 const form = document.getElementById('signupForm');
 if (!form) return;
 form.addEventListener('submit', (e) => {
  e.preventDefault(); // Stop page reload
  // 1. Get Values
  const name = document.getElementById('newName').value.trim();
  const email = document.getElementById('newEmail').value.trim();
  const pass = document.getElementById('newPassword').value.trim();
  // 2. Validation
  if (!name || !email || !pass) {
   alert("Please fill in all fields.");
   return;
  }
  // 3. Get existing users
  const users = JSON.parse(localStorage.getItem('userDatabase')) || [];
  // 4. Check if email already exists
  const exists = users.find(u => u.email === email);
  if (exists) {
   alert("This email is already registered. Please login.");
   return;
  }
  // 5. Add new user
  const newUser = {
   name: name,
   email: email,
   password: pass,
   dateJoined: new Date().toLocaleDateString()
  };
  users.push(newUser);
  localStorage.setItem('userDatabase', JSON.stringify(users));
  // 6. Success & Redirect
  alert("Account Successfully Created! You can now log in.");
  window.location.href = 'login.html';
 });
}
function logout() {
 customConfirm("Are you sure you want to log out?", () => {
  localStorage.removeItem('currentUser');
  window.location.href = 'index.html';
 });
}