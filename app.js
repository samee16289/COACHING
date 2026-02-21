/**
 * SANKALP Pro — app.js
 * Frontend Application Logic
 * Modules: Dashboard | Students | Fees | Attendance | Expenses | Classes
 */

'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbzhqwETMFJ4EFZReGB9rsQ9yQiG6ggXM3Rg_-HMzOaX-dnmCWCzl29XLwpGpUZ-47Ls9Q/exec';

// ─── STATE ────────────────────────────────────────────────────────────────────
let allStudents          = [];
let allFeeStudents       = [];
let allExpenses          = [];
let allClasses           = [];
let attendanceData       = {};
let attendanceStudents   = [];
let deleteTargetId       = null;
let deleteTargetName     = '';
let deleteTargetType     = 'student'; // 'student' | 'expense' | 'class'
let updateFeesTargetStudent = null;
let paymentTargetStudent    = null;
let updateAttTargetId    = '';
let updateAttTargetName  = '';
let editClassTarget      = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDateDefaults();
  checkSession();
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Modal overlay click-to-close
  ['addStudentModal','deleteModal','updateAttModal','updateFeesModal',
   'paymentModal','updateFeeModal','addExpenseModal','addClassModal','editClassModal'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === e.currentTarget) el.classList.add('hidden'); });
  });
});

function initDateDefaults() {
  const f = document.querySelector('input[name="admissionDate"]');
  if (f) f.value = new Date().toISOString().split('T')[0];
}

// ─── SESSION ──────────────────────────────────────────────────────────────────
function checkSession() {
  const token = localStorage.getItem('sc_token');
  const user  = localStorage.getItem('sc_user');
  if (token && user) showApp(user);
}
function storeSession(token, username) {
  localStorage.setItem('sc_token', token);
  localStorage.setItem('sc_user',  username);
}
function clearSession() {
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_user');
}
function getToken() { return localStorage.getItem('sc_token'); }

// ─── API ──────────────────────────────────────────────────────────────────────
function apiCall(action, params = {}) {
  return new Promise((resolve, reject) => {
    const token  = getToken();
    const cbName = 'sc_cb_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
    const allParams = { action, token: token || '', callback: cbName, ...params };
    const query = Object.entries(allParams)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
    const url = `${API_URL}?${query}`;

    const timer = setTimeout(() => { cleanup(); reject(new Error('Request timed out.')); }, 18000);
    window[cbName] = function(data) { cleanup(); resolve(data); };
    function cleanup() {
      clearTimeout(timer); delete window[cbName];
      const el = document.getElementById(cbName); if (el) el.remove();
    }
    const script = document.createElement('script');
    script.id = cbName; script.src = url;
    script.onerror = () => { cleanup(); reject(new Error('Network error. Check API URL.')); };
    document.head.appendChild(script);
  });
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btnText  = document.getElementById('loginBtnText');
  const spinner  = document.getElementById('loginSpinner');
  const btn      = document.getElementById('loginBtn');

  errEl.classList.add('hidden');
  btnText.textContent = 'Signing in...';
  spinner.classList.remove('hidden');
  btn.disabled = true;

  try {
    const result = await apiCall('login', { username, password });
    if (result.success) {
      storeSession(result.data.token, result.data.username);
      showApp(result.data.username);
      showToast('Welcome back, ' + result.data.username + '!', 'success');
    } else {
      showLoginError(result.error || 'Invalid credentials.');
    }
  } catch (err) {
    showLoginError('Connection failed. Check network and API URL.');
  } finally {
    btnText.textContent = 'Sign In';
    spinner.classList.add('hidden');
    btn.disabled = false;
  }
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg; el.classList.remove('hidden');
}

function logout() {
  clearSession();
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginForm').reset();
  showToast('Logged out successfully.', 'success');
}

function togglePassword() {
  const input = document.getElementById('loginPassword');
  const icon  = document.getElementById('eyeIcon');
  if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
  else { input.type = 'password'; icon.className = 'fas fa-eye'; }
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function showApp(username) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('sidebarUsername').textContent = username;
  loadDashboard();
}

function showSection(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  // Clear search inputs when switching sections
  const searchInputs = ['studentSearch', 'feeSearch', 'classSearch'];
  searchInputs.forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const navMap = { dashboard:0, students:1, fees:2, attendance:3, expenses:4, classes:5 };
  const navItems = document.querySelectorAll('.nav-item');
  if (navMap[name] !== undefined) navItems[navMap[name]].classList.add('active');

  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  const sec = document.getElementById(`${name}Section`);
  if (sec) sec.classList.add('active');

  const titles = {
    dashboard:  ['Dashboard',   'Overview'],
    students:   ['Students',    'Manage students'],
    fees:       ['Fees',        'Fee management'],
    attendance: ['Attendance',  'Track attendance'],
    expenses:   ['Expenses',    'Expense management'],
    classes:    ['Classes',     'Class & batch management']
  };
  const [title, crumb] = titles[name] || ['',''];
  document.getElementById('pageTitle').textContent     = title;
  document.getElementById('pageBreadcrumb').textContent = crumb;

  if (name === 'students')   loadStudents();
  if (name === 'fees')       loadFees();
  if (name === 'attendance') loadAttendance();
  if (name === 'expenses')   loadExpenses();
  if (name === 'classes')    loadClasses();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [studResult, expResult] = await Promise.all([
      apiCall('getStudents'),
      apiCall('getExpenses', { month: new Date().toISOString().slice(0,7) })
    ]);
    if (studResult.success) {
      allStudents = studResult.data || [];
      renderDashboardStats(allStudents, expResult.success ? expResult.data : []);
      renderRecentStudents(allStudents);
    }
  } catch (err) {
    showToast('Failed to load dashboard.', 'error');
  }
}

function renderDashboardStats(students, expenses) {
  const collected = students.reduce((s, st) => s + Number(st.FeesPaid   || 0), 0);
  const pending   = students.reduce((s, st) => s + Number(st.PendingFee || 0), 0);
  const monthExp  = expenses.reduce((s, e)  => s + Number(e.Amount || 0), 0);

  animateCounter('totalStudents',  0, students.length, 800);
  animateAmount('totalCollected',  collected, 800);
  animateAmount('totalPending',    pending, 800);
  animateAmount('totalMonthExpense', monthExp, 800);
}

function animateCounter(id, from, to, duration) {
  const el = document.getElementById(id); if (!el) return;
  const startTime = performance.now();
  const update = (now) => {
    const p = Math.min((now - startTime) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function animateAmount(id, to, duration) {
  const el = document.getElementById(id); if (!el) return;
  const startTime = performance.now();
  const update = (now) => {
    const p = Math.min((now - startTime) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = '₹' + Math.round(to * e).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function renderRecentStudents(students) {
  const container = document.getElementById('recentStudentsList');
  const recent    = [...students].slice(-5).reverse();
  if (!recent.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students yet</p></div>`;
    return;
  }
  container.innerHTML = recent.map(s => `
    <div class="recent-item">
      <div class="recent-avatar">${s.Name ? s.Name.charAt(0).toUpperCase() : '?'}</div>
      <div class="recent-info">
        <div class="recent-name">${escapeHtml(s.Name)}</div>
        <div class="recent-meta">${escapeHtml(s.Class)} · ${escapeHtml(s.Course)}</div>
      </div>
      <span class="recent-badge">${escapeHtml(s.Status || 'Active')}</span>
    </div>`).join('');
}

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
async function loadStudents() {
  const wrap = document.getElementById('studentsTableWrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading students...</p></div>`;
  try {
    const result = await apiCall('getStudents');
    if (result.success) { allStudents = result.data || []; renderStudentsTable(allStudents); }
    else { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error)}</p></div>`; }
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`;
  }
}

function renderStudentsTable(students) {
  const wrap = document.getElementById('studentsTableWrap');
  if (!students.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students found. Add your first student!</p></div>`;
    return;
  }
  const rows = students.map(s => `
    <tr>
      <td><code style="font-family:var(--mono);font-size:12px;background:#f1f5f9;padding:2px 8px;border-radius:4px">${escapeHtml(s.StudentID||'')}</code></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;flex-shrink:0">${s.Name?s.Name.charAt(0).toUpperCase():'?'}</div>
          <div><div style="font-weight:600">${escapeHtml(s.Name||'')}</div><div style="font-size:12px;color:var(--text-muted)">${escapeHtml(s.FatherName||'')}</div></div>
        </div>
      </td>
      <td>${escapeHtml(s.Mobile||'')}</td>
      <td>${escapeHtml(s.Class||'')}</td>
      <td>${escapeHtml(s.Course||'')}</td>
      <td style="color:var(--success);font-weight:600">₹${Number(s.FeesPaid||0).toLocaleString('en-IN')}</td>
      <td style="color:var(--danger);font-weight:600">₹${Number(s.PendingFee||0).toLocaleString('en-IN')}</td>
      <td><span class="status-badge ${s.Status==='Active'?'status-active':'status-inactive'}">${escapeHtml(s.Status||'Active')}</span></td>
      <td>
        <button class="btn-icon btn-icon-danger" onclick="openDeleteModal('${escapeHtml(s.StudentID||'')}','${escapeHtml(s.Name||'')}','student')" title="Delete">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>`).join('');
  wrap.innerHTML = `<table><thead><tr><th>ID</th><th>Student</th><th>Mobile</th><th>Class</th><th>Course</th><th>Fees Paid</th><th>Pending</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function filterStudents() {
  const q = document.getElementById('studentSearch').value.toLowerCase();
  if (!q) { renderStudentsTable(allStudents); return; }
  renderStudentsTable(allStudents.filter(s =>
    (s.Name||'').toLowerCase().includes(q) ||
    (s.Mobile||'').toLowerCase().includes(q) ||
    (s.Class||'').toLowerCase().includes(q) ||
    (s.Course||'').toLowerCase().includes(q) ||
    (s.StudentID||'').toLowerCase().includes(q) ||
    (s.FatherName||'').toLowerCase().includes(q)
  ));
}

// ─── ADD STUDENT ──────────────────────────────────────────────────────────────
function openAddStudentModal() {
  document.getElementById('addStudentForm').reset();
  const f = document.querySelector('#addStudentForm input[name="admissionDate"]');
  if (f) f.value = new Date().toISOString().split('T')[0];
  document.getElementById('addStudentModal').classList.remove('hidden');
}
function closeAddStudentModal() { document.getElementById('addStudentModal').classList.add('hidden'); }

async function submitAddStudent(e) {
  e.preventDefault();
  const form    = e.target;
  const btnText = document.getElementById('addStudentBtnText');
  const spinner = document.getElementById('addStudentSpinner');
  const btn     = document.getElementById('addStudentBtn');
  const data = {
    name: form.name.value.trim(), fatherName: form.fatherName.value.trim(),
    mobile: form.mobile.value.trim(), class: form.class.value, course: form.course.value,
    admissionDate: form.admissionDate.value, yearlyFee: form.yearlyFee.value,
    feesPaid: form.feesPaid.value || '0'
  };
  if (!data.name||!data.fatherName||!data.mobile||!data.class||!data.course) {
    showToast('Please fill all required fields.', 'error'); return;
  }
  btnText.textContent = 'Adding...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('addStudent', data);
    if (result.success) {
      closeAddStudentModal();
      showToast(`Student "${data.name}" added!`, 'success');
      await loadStudents(); await loadDashboard();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to add student.', 'error'); }
  finally { btnText.textContent = 'Add Student'; spinner.classList.add('hidden'); btn.disabled = false; }
}

// ─── DELETE MODAL (shared) ────────────────────────────────────────────────────
function openDeleteModal(id, name, type = 'student') {
  deleteTargetId   = id;
  deleteTargetName = name;
  deleteTargetType = type;
  document.getElementById('deleteStudentName').textContent = name;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDeleteModal() {
  deleteTargetId = null; deleteTargetName = '';
  document.getElementById('deleteModal').classList.add('hidden');
}
async function confirmDelete() {
  if (!deleteTargetId) return;
  const btnText = document.getElementById('deleteBtnText');
  const spinner = document.getElementById('deleteSpinner');
  const btn     = document.getElementById('confirmDeleteBtn');
  btnText.textContent = 'Deleting...'; spinner.classList.remove('hidden'); btn.disabled = true;

  try {
    let result;
    if (deleteTargetType === 'student') {
      result = await apiCall('deleteStudent', { studentId: deleteTargetId });
    } else if (deleteTargetType === 'expense') {
      result = await apiCall('deleteExpense', { expenseId: deleteTargetId });
    } else if (deleteTargetType === 'class') {
      result = await apiCall('deleteClass', { classId: deleteTargetId });
    }
    if (result.success) {
      closeDeleteModal();
      showToast(`"${deleteTargetName}" deleted.`, 'success');
      if (deleteTargetType === 'student')  { await loadStudents();  await loadDashboard(); }
      if (deleteTargetType === 'expense')  { await loadExpenses(); await loadDashboard(); }
      if (deleteTargetType === 'class')    { await loadClasses(); }
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to delete.', 'error'); }
  finally { btnText.textContent = 'Delete'; spinner.classList.add('hidden'); btn.disabled = false; }
}

// ─── FEES ─────────────────────────────────────────────────────────────────────
async function loadFees() {
  const wrap = document.getElementById('feesTableWrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading fee data...</p></div>`;
  try {
    const result = await apiCall('getStudents');
    if (!result.success) { handleApiError(result.error); return; }
    allFeeStudents = result.data || [];
    renderFeeStats(allFeeStudents);
    renderFeeTable(allFeeStudents);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`;
  }
}

function switchFeeTab(tab) {
  document.querySelectorAll('#feesSection .att-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#feesSection .att-tab-content').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
  if (tab === 'records') {
    document.getElementById('tabFeeRecords').classList.add('active');
    document.getElementById('feeTabRecords').classList.remove('hidden');
    document.getElementById('feeTabRecords').classList.add('active');
    loadFees();
  } else {
    document.getElementById('tabFeeHistory').classList.add('active');
    document.getElementById('feeTabHistory').classList.remove('hidden');
    document.getElementById('feeTabHistory').classList.add('active');
    loadFeeHistory();
  }
}

function renderFeeStats(students) {
  const total      = students.length;
  const totalYearly    = students.reduce((s, st) => s + Number(st.YearlyFee  || 0), 0);
  const totalCollected = students.reduce((s, st) => s + Number(st.FeesPaid   || 0), 0);
  const totalPending   = students.reduce((s, st) => s + Number(st.PendingFee || 0), 0);
  const defaulters     = students.filter(s => Number(s.PendingFee || 0) > 0).length;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('feeTotalStudents',  total);
  setEl('feeTotalYearly',    '₹' + totalYearly.toLocaleString('en-IN'));
  setEl('feeTotalCollected', '₹' + totalCollected.toLocaleString('en-IN'));
  setEl('feeTotalPending',   '₹' + totalPending.toLocaleString('en-IN'));
  setEl('feeDefaulters',     defaulters);
}

function renderFeeTable(students) {
  const wrap = document.getElementById('feesTableWrap');
  if (!students.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>No fee records found.</p></div>`;
    return;
  }
  const rows = students.map(s => {
    const yearly  = Number(s.YearlyFee  || 0);
    const paid    = Number(s.FeesPaid   || 0);
    const pending = Number(s.PendingFee || 0);
    const pct     = yearly > 0 ? Math.min(100, Math.round((paid / yearly) * 100)) : 0;
    const barColor = pct >= 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#dc2626';
    let feeStatus, badgeClass;
    if (pending <= 0 && yearly > 0) { feeStatus = 'Fully Paid'; badgeClass = 'fee-paid'; }
    else if (paid > 0)              { feeStatus = 'Partial';    badgeClass = 'fee-partial'; }
    else                            { feeStatus = 'Unpaid';     badgeClass = 'fee-unpaid'; }
    return `
      <tr>
        <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(s.StudentID||'')}</code></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;flex-shrink:0">${s.Name?s.Name.charAt(0).toUpperCase():'?'}</div>
            <div><div style="font-weight:700">${escapeHtml(s.Name||'')}</div><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(s.Class||'')} · ${escapeHtml(s.Course||'')}</div></div>
          </div>
        </td>
        <td style="font-weight:700">₹${yearly.toLocaleString('en-IN')}</td>
        <td style="font-weight:700;color:#16a34a">₹${paid.toLocaleString('en-IN')}</td>
        <td style="font-weight:700;color:${pending>0?'#dc2626':'#16a34a'}">₹${pending.toLocaleString('en-IN')}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;min-width:140px">
            <div style="flex:1;height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;transition:width .6s"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${barColor};min-width:34px">${pct}%</span>
          </div>
        </td>
        <td><span class="fee-badge ${badgeClass}">${feeStatus}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-pay" onclick="openPaymentModal('${escapeHtml(s.StudentID)}')" title="Record payment"><i class="fas fa-plus"></i> Pay</button>
            <button class="btn-icon" style="background:#dbeafe;color:#2563eb" onclick="openUpdateFeesModal('${escapeHtml(s.StudentID)}')" title="Edit fee"><i class="fas fa-pen"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>ID</th><th>Student</th><th>Yearly Fee</th><th>Paid</th><th>Pending</th><th>Progress</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function filterFeeTable() {
  const query  = (document.getElementById('feeSearch').value || '').toLowerCase();
  const status = document.getElementById('feeStatusFilter').value;
  renderFeeTable(allFeeStudents.filter(s => {
    const matchSearch = !query || (s.Name||'').toLowerCase().includes(query) || (s.StudentID||'').toLowerCase().includes(query) || (s.Class||'').toLowerCase().includes(query);
    const yearly = Number(s.YearlyFee||0), paid = Number(s.FeesPaid||0), pending = Number(s.PendingFee||0);
    const fk = pending <= 0 && yearly > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    return matchSearch && (!status || fk === status);
  }));
}

/* Update Fees Modal */
function openUpdateFeesModal(studentId) {
  const s = allFeeStudents.find(st => st.StudentID === studentId);
  if (!s) return;
  updateFeesTargetStudent = s;
  document.getElementById('feeStudentInfoBox').innerHTML = studentInfoHTML(s);
  document.getElementById('updateYearlyFee').value = s.YearlyFee || 0;
  document.getElementById('updateFeesPaid').value  = s.FeesPaid  || 0;
  updateFeePreview();
  document.getElementById('updateFeesModal').classList.remove('hidden');
}
function updateFeePreview() {
  const yearly  = Number(document.getElementById('updateYearlyFee').value || 0);
  const paid    = Number(document.getElementById('updateFeesPaid').value  || 0);
  const pending = Math.max(0, yearly - paid);
  const pct     = yearly > 0 ? Math.min(100, Math.round((paid/yearly)*100)) : 0;
  const barColor = pct >= 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#dc2626';
  document.getElementById('prev_yearly').textContent  = '₹' + yearly.toLocaleString('en-IN');
  document.getElementById('prev_paid').textContent    = '₹' + paid.toLocaleString('en-IN');
  document.getElementById('prev_pending').textContent = '₹' + pending.toLocaleString('en-IN');
  document.getElementById('prev_pct').textContent     = pct + '%';
  document.getElementById('prev_bar').style.width     = pct + '%';
  document.getElementById('prev_bar').style.background = barColor;
}
function closeUpdateFeesModal() { updateFeesTargetStudent = null; document.getElementById('updateFeesModal').classList.add('hidden'); }

async function confirmUpdateFees() {
  if (!updateFeesTargetStudent) return;
  const yearly = Number(document.getElementById('updateYearlyFee').value);
  const paid   = Number(document.getElementById('updateFeesPaid').value);
  if (isNaN(yearly)||yearly<0) { showToast('Enter a valid yearly fee.','error'); return; }
  if (isNaN(paid)||paid<0)     { showToast('Enter a valid paid amount.','error'); return; }
  const btnText = document.getElementById('updateFeesBtnText');
  const spinner = document.getElementById('updateFeesSpinner');
  const btn     = document.getElementById('confirmUpdateFeesBtn');
  btnText.innerHTML = 'Saving...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('updateStudent', { studentId: updateFeesTargetStudent.StudentID, monthlyFee: yearly, feesPaid: paid });
    if (result.success) {
      const u = allFeeStudents.find(s => s.StudentID === updateFeesTargetStudent.StudentID);
      if (u) { u.YearlyFee = yearly; u.FeesPaid = paid; u.PendingFee = Math.max(0, yearly - paid); }
      closeUpdateFeesModal();
      showToast('Fee details updated!', 'success');
      renderFeeStats(allFeeStudents); renderFeeTable(allFeeStudents);
      loadFees(); loadDashboard();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to update fees.','error'); }
  finally { btnText.innerHTML = '<i class="fas fa-save"></i> Save Changes'; spinner.classList.add('hidden'); btn.disabled = false; }
}

/* Payment Modal */
function openPaymentModal(studentId) {
  const s = allFeeStudents.find(st => st.StudentID === studentId);
  if (!s) return;
  paymentTargetStudent = s;
  document.getElementById('payStudentInfoBox').innerHTML = studentInfoHTML(s);
  document.getElementById('paymentAmount').value  = '';
  document.getElementById('paymentRemark').value  = '';
  document.getElementById('paymentDate').value    = new Date().toISOString().split('T')[0];
  document.getElementById('paymentMode').value    = 'Cash';
  document.getElementById('payPreviewBox').style.display = 'none';
  document.getElementById('paymentModal').classList.remove('hidden');
}
function updatePaymentPreview() {
  if (!paymentTargetStudent) return;
  const amount   = Number(document.getElementById('paymentAmount').value || 0);
  const yearly   = Number(paymentTargetStudent.YearlyFee || 0);
  const prevPaid = Number(paymentTargetStudent.FeesPaid  || 0);
  const newTotal  = prevPaid + amount;
  const newPending = Math.max(0, yearly - newTotal);
  document.getElementById('pay_prev_paid').textContent   = '₹' + prevPaid.toLocaleString('en-IN');
  document.getElementById('pay_this').textContent        = '₹' + amount.toLocaleString('en-IN');
  document.getElementById('pay_new_total').textContent   = '₹' + newTotal.toLocaleString('en-IN');
  document.getElementById('pay_new_pending').textContent = '₹' + newPending.toLocaleString('en-IN');
  document.getElementById('payPreviewBox').style.display = amount > 0 ? 'block' : 'none';
}
function closePaymentModal() { paymentTargetStudent = null; document.getElementById('paymentModal').classList.add('hidden'); }

async function confirmPayment() {
  if (!paymentTargetStudent) return;
  const amount = Number(document.getElementById('paymentAmount').value);
  const date   = document.getElementById('paymentDate').value;
  const mode   = document.getElementById('paymentMode').value;
  const remark = document.getElementById('paymentRemark').value.trim();
  if (!amount || amount <= 0) { showToast('Enter a valid payment amount.','error'); return; }
  const prevPaid = Number(paymentTargetStudent.FeesPaid || 0);
  const newTotal = prevPaid + amount;
  const btnText = document.getElementById('paymentBtnText');
  const spinner = document.getElementById('paymentSpinner');
  const btn     = document.getElementById('confirmPaymentBtn');
  btnText.innerHTML = 'Recording...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('recordPayment', {
      studentId: paymentTargetStudent.StudentID, studentName: paymentTargetStudent.Name,
      amount, date, mode, remark, newTotal
    });
    if (result.success) {
      // Optimistic update
      const u = allFeeStudents.find(s => s.StudentID === paymentTargetStudent.StudentID);
      if (u) { u.FeesPaid = newTotal; u.PendingFee = Math.max(0, Number(u.YearlyFee||0) - newTotal); }
      closePaymentModal();
      showToast('₹' + amount.toLocaleString('en-IN') + ' recorded for ' + paymentTargetStudent.Name + '!', 'success');
      renderFeeStats(allFeeStudents); renderFeeTable(allFeeStudents);
      loadFees(); loadDashboard();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to record payment.','error'); }
  finally { btnText.innerHTML = '<i class="fas fa-check"></i> Record Payment'; spinner.classList.add('hidden'); btn.disabled = false; }
}

async function loadFeeHistory() {
  const wrap = document.getElementById('feeHistoryWrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading history...</p></div>`;
  try {
    const result = await apiCall('getFeePayments');
    if (!result.success) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error||'Failed.')}</p></div>`; return; }
    const payments = result.data || [];
    if (!payments.length) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No payments recorded yet.</p></div>`; return; }
    const totalAmt = payments.reduce((s,p) => s + Number(p.Amount||0), 0);
    const rows = payments.map((p,i) => `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:12px">${i+1}</td>
        <td style="font-size:12px;font-weight:600">${escapeHtml(p.Date||'')}</td>
        <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(p.StudentID||'')}</code></td>
        <td style="font-weight:700">${escapeHtml(p.StudentName||'')}</td>
        <td style="font-weight:800;color:#16a34a;font-size:15px">₹${Number(p.Amount||0).toLocaleString('en-IN')}</td>
        <td><span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700"><i class="fas ${p.Mode==='Cash'?'fa-money-bill-wave':'fa-mobile-alt'}"></i> ${escapeHtml(p.Mode||'')}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(p.Remark||'—')}</td>
        <td style="font-weight:600;color:var(--danger)">₹${Number(p.BalanceAfter||0).toLocaleString('en-IN')}</td>
      </tr>`).join('');
    wrap.innerHTML = `
      <div style="padding:12px 20px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;gap:20px;font-size:13px;flex-wrap:wrap">
        <span style="font-weight:700;color:var(--text)"><i class="fas fa-receipt" style="color:var(--primary)"></i> ${payments.length} Payments</span>
        <span style="font-weight:700;color:#16a34a"><i class="fas fa-rupee-sign"></i> Total: ₹${totalAmt.toLocaleString('en-IN')}</span>
      </div>
      <table><thead><tr><th>#</th><th>Date</th><th>Student ID</th><th>Name</th><th>Amount</th><th>Mode</th><th>Remark</th><th>Pending After</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch(err) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`;
  }
}

function studentInfoHTML(s) {
  const yearly  = Number(s.YearlyFee  || 0);
  const paid    = Number(s.FeesPaid   || 0);
  const pending = Number(s.PendingFee || 0);
  return `
    <div style="background:linear-gradient(135deg,#dbeafe,#eff6ff);border:1px solid #bfdbfe;border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:14px">
      <div style="width:44px;height:44px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:800;flex-shrink:0">${s.Name?s.Name.charAt(0).toUpperCase():'?'}</div>
      <div>
        <div style="font-size:15px;font-weight:700;color:var(--text)">${escapeHtml(s.Name||'')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${escapeHtml(s.Class||'')} · ${escapeHtml(s.Course||'')} · ${escapeHtml(s.StudentID||'')}</div>
        <div style="margin-top:5px;font-size:12px">
          <span style="color:#16a34a;font-weight:700">Paid: ₹${paid.toLocaleString('en-IN')}</span> &nbsp;·&nbsp;
          <span style="color:#dc2626;font-weight:700">Pending: ₹${pending.toLocaleString('en-IN')}</span> &nbsp;·&nbsp;
          <span style="color:var(--text-muted)">Yearly: ₹${yearly.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>`;
}

// ─── ATTENDANCE ────────────────────────────────────────────────────────────────
async function loadAttendance() {
  const today = new Date();
  document.getElementById('todayDateLabel').textContent = today.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById('historyDateFilter').value = today.toISOString().split('T')[0];
  document.getElementById('attStatsRow').style.display = 'flex';
  switchAttTab('mark');
}

function switchAttTab(tab) {
  document.querySelectorAll('.att-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.att-tab-content').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
  if (tab === 'mark') {
    document.getElementById('tabMarkAtt').classList.add('active');
    document.getElementById('attTabMark').classList.remove('hidden');
    document.getElementById('attTabMark').classList.add('active');
    loadMarkAttendance();
  } else if (tab === 'view') {
    document.getElementById('tabViewAtt').classList.add('active');
    document.getElementById('attTabView').classList.remove('hidden');
    document.getElementById('attTabView').classList.add('active');
    loadAttendanceRecords();
  } else if (tab === 'history') {
    document.getElementById('tabHistoryAtt').classList.add('active');
    document.getElementById('attTabHistory').classList.remove('hidden');
    document.getElementById('attTabHistory').classList.add('active');
    loadAttendanceLog();
  }
}

async function loadMarkAttendance() {
  const wrap = document.getElementById('markAttTableWrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading students...</p></div>`;
  attendanceData = {};
  try {
    const result = await apiCall('getStudents');
    if (!result.success) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error)}</p></div>`; return; }
    attendanceStudents = (result.data || []).filter(s => s.Status === 'Active' || !s.Status);
    if (!attendanceStudents.length) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No active students.</p></div>`; return; }
    attendanceStudents.forEach(s => { attendanceData[s.StudentID] = 'Present'; });
    const classes = [...new Set(attendanceStudents.map(s => s.Class).filter(Boolean))].sort();
    const filter = document.getElementById('attClassFilter');
    filter.innerHTML = '<option value="">All Classes</option>' + classes.map(c => `<option>${escapeHtml(c)}</option>`).join('');
    updateAttStats(); renderMarkTable(attendanceStudents);
  } catch(err) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`; }
}

function renderMarkTable(students) {
  const wrap = document.getElementById('markAttTableWrap');
  if (!students.length) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No students match.</p></div>`; return; }
  const rows = students.map((s, idx) => {
    const isPresent = (attendanceData[s.StudentID] || 'Present') === 'Present';
    return `
      <tr id="attRow_${escapeHtml(s.StudentID)}">
        <td style="font-weight:600;color:var(--text-muted);font-size:12px">${idx+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;font-weight:700;flex-shrink:0">${s.Name?s.Name.charAt(0).toUpperCase():'?'}</div>
            <div><div style="font-weight:600">${escapeHtml(s.Name||'')}</div><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(s.FatherName||'')}</div></div>
          </div>
        </td>
        <td>${escapeHtml(s.Class||'')}</td><td>${escapeHtml(s.Course||'')}</td>
        <td>
          <button id="toggleBtn_${escapeHtml(s.StudentID)}" class="toggle-present ${isPresent?'':'absent'}" onclick="toggleAttendance('${escapeHtml(s.StudentID)}')">
            <i class="fas ${isPresent?'fa-check-circle':'fa-times-circle'}"></i>
            <span>${isPresent?'Present':'Absent'}</span>
          </button>
        </td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(s.Mobile||'')}</td>
      </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Course</th><th>Status</th><th>Mobile</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function toggleAttendance(studentId) {
  const current = attendanceData[studentId] || 'Present';
  attendanceData[studentId] = current === 'Present' ? 'Absent' : 'Present';
  const isPresent = attendanceData[studentId] === 'Present';
  const btn = document.getElementById(`toggleBtn_${studentId}`);
  if (btn) {
    btn.className = `toggle-present ${isPresent?'':'absent'}`;
    btn.innerHTML = `<i class="fas ${isPresent?'fa-check-circle':'fa-times-circle'}"></i><span>${isPresent?'Present':'Absent'}</span>`;
  }
  updateAttStats();
}

function markAllPresent() {
  const vis = getFilteredStudents(); vis.forEach(s => { attendanceData[s.StudentID] = 'Present'; });
  renderMarkTable(vis); updateAttStats();
}
function markAllAbsent() {
  const vis = getFilteredStudents(); vis.forEach(s => { attendanceData[s.StudentID] = 'Absent'; });
  renderMarkTable(vis); updateAttStats();
}
function getFilteredStudents() {
  const cf = document.getElementById('attClassFilter').value;
  const q  = (document.getElementById('attSearch').value || '').toLowerCase();
  return attendanceStudents.filter(s => (!cf || s.Class === cf) && (!q || (s.Name||'').toLowerCase().includes(q) || (s.Mobile||'').includes(q)));
}
function filterAttendanceTable() { renderMarkTable(getFilteredStudents()); }
function updateAttStats() {
  const total  = attendanceStudents.length;
  const pCount = Object.values(attendanceData).filter(v => v === 'Present').length;
  document.getElementById('attTotalCount').textContent   = total;
  document.getElementById('attPresentCount').textContent = pCount;
  document.getElementById('attAbsentCount').textContent  = total - pCount;
  document.getElementById('attLowCount').textContent     = attendanceStudents.filter(s => Number(s.AttendancePercent||0) < 75).length;
}

async function submitAttendance() {
  const btn = document.getElementById('submitAttBtn');
  const btnText = document.getElementById('submitAttText');
  const spinner = document.getElementById('submitAttSpinner');
  if (!attendanceStudents.length) { showToast('No students to save attendance for.','warning'); return; }
  const today   = new Date().toISOString().split('T')[0];
  const records = attendanceStudents.map(s => `${s.StudentID}:${attendanceData[s.StudentID]||'Present'}`).join(',');
  btnText.innerHTML = 'Saving...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('markAttendance', { date: today, records });
    if (result.success) { showToast('Attendance saved!', 'success'); await loadMarkAttendance(); }
    else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to save attendance.','error'); }
  finally { btnText.innerHTML = '<i class="fas fa-save"></i> Save Attendance'; spinner.classList.add('hidden'); btn.disabled = false; }
}

async function loadAttendanceRecords() {
  const wrap = document.getElementById('viewAttTableWrap');
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading records...</p></div>`;
  try {
    const result = await apiCall('getStudents');
    if (!result.success) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error)}</p></div>`; return; }
    const students = result.data || [];
    if (!students.length) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>No students found.</p></div>`; return; }
    const rows = students.map(s => {
      const att   = Number(s.AttendancePercent || 0);
      const color = att >= 75 ? '#16a34a' : att >= 50 ? '#d97706' : '#dc2626';
      const label = att >= 75 ? 'Good' : att >= 50 ? 'Average' : 'Low';
      return `
        <tr>
          <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(s.StudentID||'')}</code></td>
          <td><div style="font-weight:600">${escapeHtml(s.Name||'')}</div><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(s.FatherName||'')}</div></td>
          <td>${escapeHtml(s.Class||'')}</td><td>${escapeHtml(s.Course||'')}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:120px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;flex-shrink:0">
                <div style="height:100%;width:${att}%;background:${color};border-radius:4px;transition:width .6s"></div>
              </div>
              <span style="font-weight:800;color:${color};min-width:36px">${att}%</span>
            </div>
          </td>
          <td><span class="status-badge ${att>=75?'status-active':'status-inactive'}">${label}</span></td>
          <td><button class="btn-icon" style="background:#dbeafe;color:#2563eb" onclick="openUpdateAttModal('${escapeHtml(s.StudentID)}','${escapeHtml(s.Name||'')}',${att})"><i class="fas fa-pen"></i></button></td>
        </tr>`;
    }).join('');
    wrap.innerHTML = `<table><thead><tr><th>ID</th><th>Student</th><th>Class</th><th>Course</th><th>Attendance %</th><th>Status</th><th>Edit</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch(err) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`; }
}

function openUpdateAttModal(id, name, currentVal) {
  updateAttTargetId = id; updateAttTargetName = name;
  document.getElementById('updateAttStudentName').textContent = name;
  document.getElementById('updateAttValue').value = currentVal;
  updateAttPreview(currentVal);
  document.getElementById('updateAttModal').classList.remove('hidden');
  document.getElementById('updateAttValue').oninput = function() { updateAttPreview(this.value); };
}
function updateAttPreview(val) {
  const pct   = Math.min(100, Math.max(0, Number(val)||0));
  const color = pct>=75?'#16a34a':pct>=50?'#d97706':'#dc2626';
  const label = pct>=75?'✅ Good Standing':pct>=50?'⚠️ Average':'❌ Low — Action Needed';
  document.getElementById('attPreviewBar').style.width = pct+'%';
  document.getElementById('attPreviewBar').style.background = color;
  document.getElementById('attPreviewLabel').textContent = label;
  document.getElementById('attPreviewLabel').style.color = color;
}
function closeUpdateAttModal() { updateAttTargetId=''; document.getElementById('updateAttModal').classList.add('hidden'); }
async function confirmUpdateAtt() {
  const val = Number(document.getElementById('updateAttValue').value);
  if (isNaN(val)||val<0||val>100) { showToast('Enter 0–100.','error'); return; }
  const btnText = document.getElementById('updateAttBtnText');
  const spinner = document.getElementById('updateAttSpinner');
  const btn     = document.getElementById('confirmUpdateAttBtn');
  btnText.textContent = 'Updating...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('updateStudent', { studentId: updateAttTargetId, attendancePercent: val });
    if (result.success) { closeUpdateAttModal(); showToast(`Attendance updated for ${updateAttTargetName}`, 'success'); loadAttendanceRecords(); }
    else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to update.','error'); }
  finally { btnText.textContent = 'Update'; spinner.classList.add('hidden'); btn.disabled = false; }
}

async function loadAttendanceLog() {
  const wrap   = document.getElementById('historyTableWrap');
  const dateVal = document.getElementById('historyDateFilter').value;
  if (!dateVal) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-calendar"></i><p>Select a date.</p></div>`; return; }
  wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading log...</p></div>`;
  try {
    const result = await apiCall('getAttendanceLog', { date: dateVal });
    if (!result.success) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error||'Failed.')}</p></div>`; return; }
    const logs = result.data || [];
    if (!logs.length) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>No attendance for ${dateVal}.</p></div>`; return; }
    const pCount = logs.filter(l => l.Status==='Present').length;
    const rows = logs.map((entry,i) => `
      <tr>
        <td style="font-weight:600;color:var(--text-muted);font-size:12px">${i+1}</td>
        <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(entry.StudentID||'')}</code></td>
        <td style="font-weight:600">${escapeHtml(entry.Name||'')}</td>
        <td>${escapeHtml(entry.Class||'')}</td>
        <td><span class="history-chip ${entry.Status==='Present'?'chip-present':'chip-absent'}"><i class="fas ${entry.Status==='Present'?'fa-check-circle':'fa-times-circle'}"></i> ${escapeHtml(entry.Status||'')}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(entry.MarkedAt||'')}</td>
      </tr>`).join('');
    wrap.innerHTML = `
      <div style="display:flex;gap:12px;padding:14px 20px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap">
        <span style="font-size:13px;font-weight:700;color:var(--text)"><i class="fas fa-calendar" style="color:var(--primary)"></i> ${dateVal}</span>
        <span style="font-size:13px;font-weight:600;color:#16a34a"><i class="fas fa-check-circle"></i> Present: ${pCount}</span>
        <span style="font-size:13px;font-weight:600;color:#dc2626"><i class="fas fa-times-circle"></i> Absent: ${logs.length-pCount}</span>
        <span style="font-size:13px;font-weight:600;color:var(--text-muted)">Total: ${logs.length}</span>
      </div>
      <table><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Class</th><th>Status</th><th>Time</th></tr></thead><tbody>${rows}</tbody></table>`;
  } catch(err) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`; }
}
function filterHistory() { loadAttendanceLog(); }

// ─── EXPENSES ─────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Rent','Salaries','Utilities','Stationery','Marketing','Maintenance','Equipment','Miscellaneous'];

async function loadExpenses() {
  const wrap = document.getElementById('expensesTableWrap');
  if (wrap) wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading expenses...</p></div>`;
  try {
    const month  = document.getElementById('expMonthFilter')?.value || '';
    const cat    = document.getElementById('expCatFilter')?.value   || '';
    const params = {};
    if (month) params.month    = month;
    if (cat)   params.category = cat;
    const [expResult, summaryResult] = await Promise.all([
      apiCall('getExpenses', params),
      apiCall('getExpenseSummary', { year: new Date().getFullYear() })
    ]);
    if (expResult.success) {
      allExpenses = expResult.data || [];
      renderExpenseStats(summaryResult.success ? summaryResult.data : null, allExpenses);
      renderExpensesTable(allExpenses);
    }
  } catch(err) {
    if (wrap) wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`;
  }
}

function renderExpenseStats(summary, expenses) {
  const totalMonth = expenses.reduce((s, e) => s + Number(e.Amount||0), 0);
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('expTotalMonth',    '₹' + totalMonth.toLocaleString('en-IN'));
  setEl('expTotalYear',     summary ? '₹' + Number(summary.total||0).toLocaleString('en-IN') : '₹0');
  setEl('expTotalCount',    expenses.length);

  // Top category
  if (summary && summary.byCategory) {
    const topCat = Object.entries(summary.byCategory).sort((a,b)=>b[1]-a[1])[0];
    setEl('expTopCategory', topCat ? topCat[0] : '—');
  }

  // Category breakdown chart bars
  const chartWrap = document.getElementById('expCategoryChart');
  if (chartWrap && summary && summary.byCategory) {
    const total = summary.total || 1;
    const entries = Object.entries(summary.byCategory).sort((a,b)=>b[1]-a[1]);
    const colors  = ['#2563eb','#16a34a','#dc2626','#d97706','#8b5cf6','#06b6d4','#f97316','#6366f1'];
    chartWrap.innerHTML = entries.map(([cat, amt], i) => {
      const pct = Math.round((amt / total) * 100);
      return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;font-weight:600;color:var(--text)">${escapeHtml(cat)}</span>
            <span style="font-size:12px;color:var(--text-muted)">₹${Number(amt).toLocaleString('en-IN')} <span style="color:${colors[i%colors.length]};font-weight:700">(${pct}%)</span></span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${colors[i%colors.length]};border-radius:4px;transition:width .6s ease"></div>
          </div>
        </div>`;
    }).join('') || '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:16px">No data yet</p>';
  }
}

function renderExpensesTable(expenses) {
  const wrap = document.getElementById('expensesTableWrap');
  if (!wrap) return;
  if (!expenses.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No expenses found. Add your first expense!</p></div>`;
    return;
  }
  const catColors = { Rent:'#2563eb', Salaries:'#16a34a', Utilities:'#d97706', Stationery:'#8b5cf6', Marketing:'#f97316', Maintenance:'#dc2626', Equipment:'#06b6d4', Miscellaneous:'#6366f1' };
  const rows = expenses.map(e => {
    const color = catColors[e.Category] || '#64748b';
    return `
      <tr>
        <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(e.ExpenseID||'')}</code></td>
        <td style="font-size:13px;font-weight:600">${escapeHtml(e.Date||'')}</td>
        <td><span style="background:${color}18;color:${color};border:1px solid ${color}40;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700">${escapeHtml(e.Category||'')}</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(e.Description||'')}">${escapeHtml(e.Description||'—')}</td>
        <td style="font-weight:800;color:#dc2626;font-size:15px">₹${Number(e.Amount||0).toLocaleString('en-IN')}</td>
        <td><span style="background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700"><i class="fas ${e.PaymentMode==='Cash'?'fa-money-bill-wave':'fa-mobile-alt'}"></i> ${escapeHtml(e.PaymentMode||'Cash')}</span></td>
        <td style="font-size:12px;color:var(--text-muted)">${escapeHtml(e.AddedBy||'')}</td>
        <td>
          <button class="btn-icon btn-icon-danger" onclick="openDeleteModal('${escapeHtml(e.ExpenseID||'')}','${escapeHtml(e.Category||'')} - ₹${Number(e.Amount||0).toLocaleString('en-IN')}','expense')" title="Delete">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>ID</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Mode</th><th>Added By</th><th>Delete</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function openAddExpenseModal() {
  document.getElementById('addExpenseForm').reset();
  document.getElementById('expDateInput').value = new Date().toISOString().split('T')[0];
  document.getElementById('addExpenseModal').classList.remove('hidden');
}
function closeAddExpenseModal() { document.getElementById('addExpenseModal').classList.add('hidden'); }

async function submitAddExpense(e) {
  e.preventDefault();
  const form    = e.target;
  const btnText = document.getElementById('addExpenseBtnText');
  const spinner = document.getElementById('addExpenseSpinner');
  const btn     = document.getElementById('addExpenseBtn');
  const data = {
    date:        form.expDate.value,
    category:    form.expCategory.value,
    description: form.expDescription.value.trim(),
    amount:      form.expAmount.value,
    paymentMode: form.expPaymentMode.value,
    addedBy:     localStorage.getItem('sc_user') || 'Admin'
  };
  if (!data.category||!data.amount) { showToast('Category and Amount are required.','error'); return; }
  btnText.textContent = 'Adding...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('addExpense', data);
    if (result.success) {
      closeAddExpenseModal();
      showToast('Expense of ₹'+Number(data.amount).toLocaleString('en-IN')+' added!', 'success');
      await loadExpenses(); await loadDashboard();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to add expense.','error'); }
  finally { btnText.textContent = 'Add Expense'; spinner.classList.add('hidden'); btn.disabled = false; }
}

// ─── CLASSES / BATCHES ────────────────────────────────────────────────────────
async function loadClasses() {
  const wrap = document.getElementById('classesTableWrap');
  if (wrap) wrap.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading classes...</p></div>`;
  try {
    const result = await apiCall('getClasses');
    if (result.success) { allClasses = result.data || []; renderClassStats(allClasses); renderClassesTable(allClasses); }
    else if (wrap) { wrap.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>${escapeHtml(result.error)}</p></div>`; }
  } catch(err) {
    if (wrap) wrap.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><p>Connection error.</p></div>`;
  }
}

function renderClassStats(classes) {
  const total    = classes.length;
  const active   = classes.filter(c => c.Status === 'Active').length;
  const enrolled = classes.reduce((s, c) => s + Number(c.Enrolled||0), 0);
  const capacity = classes.reduce((s, c) => s + Number(c.Capacity||0), 0);
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('clsTotalClasses',  total);
  setEl('clsActiveClasses', active);
  setEl('clsTotalEnrolled', enrolled);
  setEl('clsTotalCapacity', capacity);
}

function renderClassesTable(classes) {
  const wrap = document.getElementById('classesTableWrap');
  if (!wrap) return;
  if (!classes.length) {
    wrap.innerHTML = `<div class="empty-state"><i class="fas fa-chalkboard"></i><p>No classes found. Add your first class/batch!</p></div>`;
    return;
  }
  const rows = classes.map(c => {
    const enrolled = Number(c.Enrolled||0);
    const capacity = Number(c.Capacity||0);
    const pct      = capacity > 0 ? Math.min(100, Math.round((enrolled/capacity)*100)) : 0;
    const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#16a34a';
    return `
      <tr>
        <td><code style="font-family:var(--mono);font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">${escapeHtml(c.ClassID||'')}</code></td>
        <td>
          <div style="font-weight:700">${escapeHtml(c.ClassName||'')}</div>
          <div style="font-size:11px;color:var(--text-muted)">${escapeHtml(c.BatchName||'')}</div>
        </td>
        <td>${escapeHtml(c.Subject||'—')}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;flex-shrink:0">${c.TeacherName?(c.TeacherName.charAt(0).toUpperCase()):'T'}</div>
            <span style="font-weight:600">${escapeHtml(c.TeacherName||'—')}</span>
          </div>
        </td>
        <td style="font-size:12px"><i class="fas fa-clock" style="color:var(--primary)"></i> ${escapeHtml(c.Schedule||'—')}</td>
        <td style="font-size:12px"><i class="fas fa-door-open" style="color:var(--warning)"></i> ${escapeHtml(c.Room||'—')}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:700;font-size:13px">${enrolled}/${capacity}</span>
            <div style="flex:1;min-width:60px;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;transition:width .6s"></div>
            </div>
          </div>
        </td>
        <td><span class="status-badge ${c.Status==='Active'?'status-active':'status-inactive'}">${escapeHtml(c.Status||'Active')}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon" style="background:#dbeafe;color:#2563eb" onclick="openEditClassModal('${escapeHtml(c.ClassID)}')" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon btn-icon-danger" onclick="openDeleteModal('${escapeHtml(c.ClassID||'')}','${escapeHtml(c.ClassName||'')}','class')" title="Delete"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
  wrap.innerHTML = `<table><thead><tr><th>ID</th><th>Class/Batch</th><th>Subject</th><th>Teacher</th><th>Schedule</th><th>Room</th><th>Strength</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function filterClasses() {
  const q = (document.getElementById('classSearch')?.value || '').toLowerCase();
  renderClassesTable(allClasses.filter(c =>
    (c.ClassName||'').toLowerCase().includes(q) || (c.BatchName||'').toLowerCase().includes(q) ||
    (c.Subject||'').toLowerCase().includes(q)   || (c.TeacherName||'').toLowerCase().includes(q)
  ));
}

function openAddClassModal() {
  document.getElementById('addClassForm').reset();
  document.getElementById('addClassModal').classList.remove('hidden');
}
function closeAddClassModal() { document.getElementById('addClassModal').classList.add('hidden'); }

async function submitAddClass(e) {
  e.preventDefault();
  const form    = e.target;
  const btnText = document.getElementById('addClassBtnText');
  const spinner = document.getElementById('addClassSpinner');
  const btn     = document.getElementById('addClassBtn');
  const data = {
    className:   form.className.value.trim(),
    batchName:   form.batchName.value.trim(),
    subject:     form.subject.value.trim(),
    teacherName: form.teacherName.value.trim(),
    schedule:    form.schedule.value.trim(),
    room:        form.room.value.trim(),
    capacity:    form.capacity.value
  };
  if (!data.className) { showToast('Class Name is required.','error'); return; }
  btnText.textContent = 'Adding...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('addClass', data);
    if (result.success) {
      closeAddClassModal();
      showToast(`Class "${data.className}" added!`, 'success');
      await loadClasses();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to add class.','error'); }
  finally { btnText.textContent = 'Add Class'; spinner.classList.add('hidden'); btn.disabled = false; }
}

function openEditClassModal(classId) {
  const c = allClasses.find(cl => cl.ClassID === classId);
  if (!c) return;
  editClassTarget = c;
  document.getElementById('editClassId').value          = c.ClassID;
  document.getElementById('editClassName').value        = c.ClassName;
  document.getElementById('editBatchName').value        = c.BatchName;
  document.getElementById('editSubject').value          = c.Subject;
  document.getElementById('editTeacherName').value      = c.TeacherName;
  document.getElementById('editSchedule').value         = c.Schedule;
  document.getElementById('editRoom').value             = c.Room;
  document.getElementById('editCapacity').value         = c.Capacity;
  document.getElementById('editClassStatus').value      = c.Status;
  document.getElementById('editClassModal').classList.remove('hidden');
}
function closeEditClassModal() { editClassTarget = null; document.getElementById('editClassModal').classList.add('hidden'); }

async function submitEditClass(e) {
  e.preventDefault();
  const form    = e.target;
  const btnText = document.getElementById('editClassBtnText');
  const spinner = document.getElementById('editClassSpinner');
  const btn     = document.getElementById('editClassBtn');
  const data = {
    classId:     form.editClassId.value,
    className:   form.editClassName.value.trim(),
    batchName:   form.editBatchName.value.trim(),
    subject:     form.editSubject.value.trim(),
    teacherName: form.editTeacherName.value.trim(),
    schedule:    form.editSchedule.value.trim(),
    room:        form.editRoom.value.trim(),
    capacity:    form.editCapacity.value,
    status:      form.editClassStatus.value
  };
  btnText.textContent = 'Saving...'; spinner.classList.remove('hidden'); btn.disabled = true;
  try {
    const result = await apiCall('updateClass', data);
    if (result.success) {
      closeEditClassModal();
      showToast('Class updated!', 'success');
      await loadClasses();
    } else { handleApiError(result.error); }
  } catch(err) { showToast('Failed to update class.','error'); }
  finally { btnText.textContent = 'Save Changes'; spinner.classList.add('hidden'); btn.disabled = false; }
}

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
function handleApiError(error) {
  if (error && (error.toLowerCase().includes('token') || error.toLowerCase().includes('unauthorized'))) {
    clearSession();
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    showToast('Session expired. Please login again.', 'error');
    return;
  }
  showToast(error || 'An unexpected error occurred.', 'error');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'default', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', warning:'fa-triangle-exclamation', default:'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type]||icons.default}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 350); }, duration);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}