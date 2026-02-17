// ===================================================
//  FULL-STACK APP  –  script.js
// ===================================================

// ===================================================
//  STORAGE  (Phase 4)
// ===================================================
const STORAGE_KEY = 'ipt_demo_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate structure has all required keys
      if (parsed.accounts && parsed.departments && parsed.employees && parsed.requests) {
        window.db = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn('Storage corrupt or missing – seeding defaults.', e);
  }

  // Missing or corrupt: seed fresh defaults
  window.db = {
    accounts: [
      {
        firstName: 'Admin', lastName: 'User',
        email: 'admin@example.com', password: 'Password123!',
        role: 'admin', verified: true
      }
    ],
    departments: [
      { name: 'Engineering', description: 'Software team' },
      { name: 'HR',          description: 'Human Resources' }
    ],
    employees: [],
    requests:  [],
  };

  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// ===================================================
//  APP STATE
// ===================================================
let currentUser = null;   // { firstName, lastName, email, password, role, verified }
let requestModal;

// ===================================================
//  INIT
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
  // Phase 4: load everything from the single STORAGE_KEY
  loadFromStorage();

  requestModal = new bootstrap.Modal(document.getElementById('requestModal'));

  // Restore session via auth_token
  const token = localStorage.getItem('auth_token');
  if (token) {
    const user = window.db.accounts.find(a => a.email === token);
    if (user) setAuthState(true, user);
  }

  // Set default hash if none, then run routing
  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    handleRouting();
  }

  bindEvents();
});

// ===================================================
//  ROUTING
// ===================================================

// Protected routes: must be logged in
const PROTECTED_ROUTES = ['#/profile', '#/requests'];
// Admin-only routes
const ADMIN_ROUTES     = ['#/employees', '#/accounts', '#/departments'];

// Map hash → page element ID suffix
const ROUTE_MAP = {
  '#/':             'home',
  '#/register':     'register',
  '#/verify-email': 'verify',
  '#/login':        'login',
  '#/profile':      'profile',
  '#/employees':    'employees',
  '#/departments':  'departments',
  '#/accounts':     'accounts',
  '#/requests':     'requests',
};

/** Push a new hash onto the history stack */
function navigateTo(hash) {
  window.location.hash = hash;
}

/** Read the current hash, enforce guards, show the right page */
function handleRouting() {
  const hash = window.location.hash || '#/';

  // --- Auth guards ---
  if (PROTECTED_ROUTES.includes(hash) && !currentUser) {
    navigateTo('#/login');
    return;
  }
  if (ADMIN_ROUTES.includes(hash) && (!currentUser || currentUser.role !== 'admin')) {
    navigateTo(currentUser ? '#/' : '#/login');
    return;
  }

  // --- Show matching page ---
  const pageKey = ROUTE_MAP[hash];
  document.querySelectorAll('.page').forEach(s => s.classList.remove('active'));

  if (pageKey) {
    const target = document.getElementById('page-' + pageKey);
    if (target) target.classList.add('active');

    // Page-specific re-renders
    if (pageKey === 'verify')       renderVerify();
    if (pageKey === 'profile')      renderProfile();
    if (pageKey === 'employees')    renderEmployees();
    if (pageKey === 'departments')  renderDepartments();
    if (pageKey === 'accounts')     renderAccounts();
    if (pageKey === 'requests')     renderRequests();
  } else {
    navigateTo('#/');
  }
}

// Listen for every hash change
window.addEventListener('hashchange', handleRouting);

// ===================================================
//  AUTH STATE  –  setAuthState(isAuth, user)
// ===================================================
function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;
  const body  = document.body;

  if (isAuth && user) {
    body.classList.remove('not-authenticated');
    body.classList.add('authenticated');
    body.classList.toggle('is-admin', user.role === 'admin');
    document.getElementById('navUsername').textContent =
      user.firstName + ' ' + user.lastName;
  } else {
    body.classList.remove('authenticated', 'is-admin');
    body.classList.add('not-authenticated');
  }
}

// ===================================================
//  EVENT BINDING
// ===================================================
function bindEvents() {
  // Navbar links (logged-out)
  document.getElementById('navLoginLink').addEventListener('click', e => {
    e.preventDefault(); navigateTo('#/login');
  });
  document.getElementById('navRegisterLink').addEventListener('click', e => {
    e.preventDefault(); navigateTo('#/register');
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false);
    navigateTo('#/');
  });

  // Dropdown nav items (data-page)
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = el.dataset.page;
      navigateTo(page === 'home' || page === '' ? '#/' : '#/' + page);
    });
  });

  // Home – Get Started
  document.getElementById('getStartedBtn').addEventListener('click', () => {
    navigateTo(currentUser ? '#/profile' : '#/login');
  });

  // Register
  document.getElementById('signUpBtn').addEventListener('click', handleRegister);

  // Verify
  document.getElementById('simulateVerifyBtn').addEventListener('click', handleSimulateVerify);

  // Login
  document.getElementById('loginBtn').addEventListener('click', handleLogin);

  // Profile edit – listener is attached inside renderProfile() to avoid stale closures

  // Employees
  document.getElementById('addEmployeeBtn').addEventListener('click', () => openEmployeeForm());
  document.getElementById('saveEmployeeBtn').addEventListener('click', saveEmployee);
  document.getElementById('cancelEmployeeBtn').addEventListener('click', () => resetEmployeeForm());

  // Departments
  document.getElementById('addDeptBtn').addEventListener('click', () => openDeptForm());
  document.getElementById('saveDeptBtn').addEventListener('click', saveDept);
  document.getElementById('cancelDeptBtn').addEventListener('click', () => closeDeptForm());

  // Accounts
  document.getElementById('addAccountBtn').addEventListener('click', () => openAccountForm());
  document.getElementById('saveAccountBtn').addEventListener('click', saveAccount);
  document.getElementById('cancelAccountBtn').addEventListener('click', () => closeAccountForm());

  // Requests
  document.getElementById('newRequestBtn').addEventListener('click', openRequestModal);
  document.getElementById('createOneBtn').addEventListener('click', openRequestModal);
  document.getElementById('submitRequestBtn').addEventListener('click', submitRequest);
  document.getElementById('addReqItemBtn').addEventListener('click', addReqItem);
}

// ===================================================
//  REGISTER
// ===================================================
function handleRegister() {
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName  = document.getElementById('regLastName').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const errEl     = document.getElementById('regError');

  errEl.classList.add('d-none');

  if (!firstName || !lastName || !email || !password) {
    errEl.textContent = 'Please fill in all fields.';
    errEl.classList.remove('d-none');
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.classList.remove('d-none');
    return;
  }
  if (window.db.accounts.find(a => a.email === email)) {
    errEl.textContent = 'An account with that email already exists.';
    errEl.classList.remove('d-none');
    return;
  }

  window.db.accounts.push({ firstName, lastName, email, password, role: 'user', verified: false });
  saveToStorage();  // Phase 4

  localStorage.setItem('unverified_email', email);

  ['regFirstName','regLastName','regEmail','regPassword'].forEach(
    id => document.getElementById(id).value = ''
  );

  navigateTo('#/verify-email');
}

// ===================================================
//  VERIFY EMAIL
// ===================================================
function renderVerify() {
  const email = localStorage.getItem('unverified_email') || '';
  document.getElementById('verifyEmail').textContent = email;
}

function handleSimulateVerify() {
  const email = localStorage.getItem('unverified_email');
  if (!email) return navigateTo('#/login');

  const idx = window.db.accounts.findIndex(a => a.email === email);
  if (idx !== -1) {
    window.db.accounts[idx].verified = true;
    saveToStorage();  // Phase 4
  }

  localStorage.removeItem('unverified_email');
  document.getElementById('loginVerifiedAlert').classList.remove('d-none');
  navigateTo('#/login');
}

// ===================================================
//  LOGIN
// ===================================================
function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');

  errEl.classList.add('d-none');

  const account = window.db.accounts.find(
    a => a.email === email && a.password === password && a.verified === true
  );

  if (!account) {
    const exists = window.db.accounts.find(a => a.email === email && a.password === password);
    errEl.textContent = exists
      ? 'Please verify your email before logging in.'
      : 'Invalid email or password.';
    errEl.classList.remove('d-none');
    return;
  }

  localStorage.setItem('auth_token', account.email);
  setAuthState(true, account);

  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginVerifiedAlert').classList.add('d-none');

  navigateTo('#/profile');
}

// ===================================================
//  PROFILE
// ===================================================
// ===================================================
//  PROFILE  (Phase 5)
// ===================================================
function renderProfile() {
  if (!currentUser) return;

  // Display user's full name
  document.getElementById('profileFullName').textContent =
    currentUser.firstName + ' ' + currentUser.lastName;

  // Display email
  document.getElementById('profileEmail').textContent = currentUser.email;

  // Display role (capitalised)
  document.getElementById('profileRole').textContent =
    currentUser.role === 'admin' ? 'Admin' : 'User';

  // Wire Edit Profile button – remove stale listeners by cloning, then re-attach
  const oldBtn = document.getElementById('editProfileBtn');
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  newBtn.addEventListener('click', () => {
    alert('Edit profile for ' + currentUser.firstName + ' ' + currentUser.lastName + ' – coming soon!');
  });
}

// ===================================================
//  EMPLOYEES  (Phase 6)
// ===================================================

/** Master render – call after any employees change */
function renderEmployeesTable() {
  const employees = window.db.employees;
  const tbody = document.getElementById('employeeTableBody');

  tbody.innerHTML = employees.length === 0
    ? '<tr><td colspan="5" class="text-center text-muted fst-italic">No employees yet.</td></tr>'
    : employees.map((e, i) => {
        // Resolve display name from linked account
        const acct = window.db.accounts.find(a => a.email === e.email);
        const displayName = acct ? `${acct.firstName} ${acct.lastName} (${e.email})` : e.email;
        return `
        <tr>
          <td>${e.id}</td>
          <td>${displayName}</td>
          <td>${e.position}</td>
          <td>${e.dept}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee(${i})">Edit</button>
            <button class="btn btn-sm btn-outline-danger"  onclick="deleteEmployee(${i})">Delete</button>
          </td>
        </tr>`;
      }).join('');

  // Keep dept dropdown in sync
  syncDeptDropdown();
}

// Alias so existing routing call still works
function renderEmployees() { renderEmployeesTable(); }

/** Populate the Department <select> inside the employee form */
function syncDeptDropdown() {
  const sel = document.getElementById('empDept');
  const current = sel.value;
  sel.innerHTML = window.db.departments.map(
    d => `<option value="${d.name}">${d.name}</option>`
  ).join('');
  // Re-select previous value if it still exists
  if ([...sel.options].some(o => o.value === current)) sel.value = current;
}

function openEmployeeForm(emp = null, idx = -1) {
  syncDeptDropdown();
  document.getElementById('empEditIndex').value = idx;
  document.getElementById('empId').value        = emp ? emp.id       : '';
  document.getElementById('empEmail').value     = emp ? emp.email    : '';
  document.getElementById('empPosition').value  = emp ? emp.position : '';
  document.getElementById('empDept').value      = emp ? emp.dept     : '';
  document.getElementById('empHireDate').value  = emp ? emp.hireDate : '';
  document.getElementById('empEmailError').classList.add('d-none');
  document.getElementById('employeeFormCard').classList.remove('d-none');
}

function resetEmployeeForm() {
  document.getElementById('employeeFormCard').classList.add('d-none');
  document.getElementById('empEmailError').classList.add('d-none');
}

function saveEmployee() {
  const idx = parseInt(document.getElementById('empEditIndex').value);
  const emp = {
    id:       document.getElementById('empId').value.trim(),
    email:    document.getElementById('empEmail').value.trim(),
    position: document.getElementById('empPosition').value.trim(),
    dept:     document.getElementById('empDept').value,
    hireDate: document.getElementById('empHireDate').value,
  };

  if (!emp.id || !emp.email || !emp.position) {
    return alert('Employee ID, Email, and Position are required.');
  }

  // Validate email matches an existing account
  const linkedAccount = window.db.accounts.find(a => a.email === emp.email);
  if (!linkedAccount) {
    const errEl = document.getElementById('empEmailError');
    errEl.textContent = `No account found for "${emp.email}". Create an account first.`;
    errEl.classList.remove('d-none');
    return;
  }
  document.getElementById('empEmailError').classList.add('d-none');

  if (idx >= 0) window.db.employees[idx] = emp;
  else          window.db.employees.push(emp);
  saveToStorage();

  resetEmployeeForm();
  renderEmployeesTable();
}

function editEmployee(i) {
  openEmployeeForm(window.db.employees[i], i);
}

function deleteEmployee(i) {
  if (!confirm('Delete this employee record?')) return;
  window.db.employees.splice(i, 1);
  saveToStorage();
  renderEmployeesTable();
}

// ===================================================
//  DEPARTMENTS  (Phase 6)
// ===================================================

/** Master render */
function renderDepartmentsList() {
  const tbody = document.getElementById('deptTableBody');
  tbody.innerHTML = window.db.departments.length === 0
    ? '<tr><td colspan="3" class="text-center text-muted fst-italic">No departments yet.</td></tr>'
    : window.db.departments.map((d, i) => `
      <tr>
        <td>${d.name}</td>
        <td>${d.description || '<span class="text-muted">—</span>'}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editDept(${i})">Edit</button>
          <button class="btn btn-sm btn-outline-danger"  onclick="deleteDept(${i})">Delete</button>
        </td>
      </tr>`).join('');
}

// Alias so existing routing call still works
function renderDepartments() { renderDepartmentsList(); }

function openDeptForm(dept = null, idx = -1) {
  document.getElementById('deptEditIndex').value = idx;
  document.getElementById('deptName').value      = dept ? dept.name        : '';
  document.getElementById('deptDesc').value      = dept ? dept.description : '';
  document.getElementById('deptNameError').classList.add('d-none');
  document.getElementById('deptFormCard').classList.remove('d-none');
}

function closeDeptForm() {
  document.getElementById('deptFormCard').classList.add('d-none');
}

function saveDept() {
  const idx  = parseInt(document.getElementById('deptEditIndex').value);
  const dept = {
    name:        document.getElementById('deptName').value.trim(),
    description: document.getElementById('deptDesc').value.trim(),
  };

  if (!dept.name) {
    const errEl = document.getElementById('deptNameError');
    errEl.textContent = 'Department name is required.';
    errEl.classList.remove('d-none');
    return;
  }

  // Prevent duplicate names (case-insensitive), unless editing self
  const duplicate = window.db.departments.findIndex(
    (d, i) => d.name.toLowerCase() === dept.name.toLowerCase() && i !== idx
  );
  if (duplicate !== -1) {
    const errEl = document.getElementById('deptNameError');
    errEl.textContent = `A department named "${dept.name}" already exists.`;
    errEl.classList.remove('d-none');
    return;
  }

  if (idx >= 0) window.db.departments[idx] = dept;
  else          window.db.departments.push(dept);
  saveToStorage();

  closeDeptForm();
  renderDepartmentsList();
  syncDeptDropdown(); // keep employee form dropdown current
}

function editDept(i) {
  openDeptForm(window.db.departments[i], i);
}

function deleteDept(i) {
  if (!confirm('Delete this department?')) return;
  window.db.departments.splice(i, 1);
  saveToStorage();
  renderDepartmentsList();
  syncDeptDropdown();
}

// ===================================================
//  ACCOUNTS  (Phase 6)
// ===================================================

/** Master render */
function renderAccountsList() {
  const tbody = document.getElementById('accountTableBody');
  tbody.innerHTML = window.db.accounts.map((a, i) => `
    <tr>
      <td>${a.firstName} ${a.lastName}</td>
      <td>${a.email}</td>
      <td>
        <span class="badge ${a.role === 'admin' ? 'bg-danger' : 'bg-secondary'}">
          ${a.role === 'admin' ? 'Admin' : 'User'}
        </span>
      </td>
      <td class="text-center">${a.verified ? '✅' : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1"  onclick="editAccount(${i})">Edit</button>
        <button class="btn btn-sm btn-outline-warning me-1"  onclick="resetPassword(${i})">Reset PW</button>
        <button class="btn btn-sm btn-outline-danger"        onclick="deleteAccount(${i})">Delete</button>
      </td>
    </tr>`).join('');
}

// Alias so existing routing call still works
function renderAccounts() { renderAccountsList(); }

function openAccountForm(acc = null, idx = -1) {
  document.getElementById('accEditIndex').value  = idx;
  document.getElementById('accFirstName').value  = acc ? acc.firstName : '';
  document.getElementById('accLastName').value   = acc ? acc.lastName  : '';
  document.getElementById('accEmail').value      = acc ? acc.email     : '';
  document.getElementById('accPassword').value   = '';
  document.getElementById('accRole').value       = acc ? acc.role      : 'user';
  document.getElementById('accVerified').checked = acc ? acc.verified  : false;
  document.getElementById('accFormError').classList.add('d-none');
  // Show password hint when editing (leave blank = keep current)
  document.getElementById('accPasswordHint').classList.toggle('d-none', idx === -1);
  document.getElementById('accountFormCard').classList.remove('d-none');
}

function closeAccountForm() {
  document.getElementById('accountFormCard').classList.add('d-none');
}

function saveAccount() {
  const idx     = parseInt(document.getElementById('accEditIndex').value);
  const errEl   = document.getElementById('accFormError');
  errEl.classList.add('d-none');

  const firstName = document.getElementById('accFirstName').value.trim();
  const lastName  = document.getElementById('accLastName').value.trim();
  const email     = document.getElementById('accEmail').value.trim();
  const password  = document.getElementById('accPassword').value;
  const role      = document.getElementById('accRole').value;
  const verified  = document.getElementById('accVerified').checked;

  // Validation
  if (!firstName || !lastName || !email) {
    errEl.textContent = 'First name, last name, and email are required.';
    errEl.classList.remove('d-none');
    return;
  }
  // New account needs a password; editing allows blank (= keep existing)
  if (idx === -1 && !password) {
    errEl.textContent = 'Password is required for new accounts.';
    errEl.classList.remove('d-none');
    return;
  }
  if (password && password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.classList.remove('d-none');
    return;
  }
  // Duplicate email check (ignore self on edit)
  const duplicate = window.db.accounts.findIndex(
    (a, i) => a.email.toLowerCase() === email.toLowerCase() && i !== idx
  );
  if (duplicate !== -1) {
    errEl.textContent = `An account with email "${email}" already exists.`;
    errEl.classList.remove('d-none');
    return;
  }

  const acc = {
    firstName,
    lastName,
    email,
    password: password || window.db.accounts[idx].password,
    role,
    verified,
  };

  if (idx >= 0) window.db.accounts[idx] = acc;
  else          window.db.accounts.push(acc);
  saveToStorage();

  closeAccountForm();
  renderAccountsList();
}

function editAccount(i) {
  openAccountForm(window.db.accounts[i], i);
}

function resetPassword(i) {
  const errEl = document.getElementById('accountTableBody')
    .querySelectorAll('tr')[i]?.querySelector('.reset-err');

  const np = prompt(
    `Reset password for ${window.db.accounts[i].email}\n\nEnter new password (min 6 chars):`
  );
  if (np === null) return;           // cancelled
  if (np.length < 6) {
    alert('Password must be at least 6 characters. Password not changed.');
    return;
  }
  window.db.accounts[i].password = np;
  saveToStorage();
  alert(`Password for ${window.db.accounts[i].email} reset successfully.`);
}

function deleteAccount(i) {
  const target = window.db.accounts[i];

  // Prevent self-deletion
  if (currentUser && target.email === currentUser.email) {
    alert('You cannot delete your own account while logged in.');
    return;
  }

  if (!confirm(`Delete account for ${target.firstName} ${target.lastName} (${target.email})?`)) return;
  window.db.accounts.splice(i, 1);
  saveToStorage();
  renderAccountsList();
}

// ===================================================
//  REQUESTS  (Phase 7)
// ===================================================

/** Status badge helper */
function statusBadge(status) {
  const map = {
    'Pending':  'bg-warning text-dark',
    'Approved': 'bg-success',
    'Rejected': 'bg-danger',
  };
  const cls = map[status] || 'bg-secondary';
  return `<span class="badge ${cls}">${status || 'Pending'}</span>`;
}

/** Format ISO date string to locale-friendly short date */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Master render – only shows requests belonging to currentUser.email */
function renderRequestsList() {
  const mine     = window.db.requests.filter(
    r => r.employeeEmail === (currentUser && currentUser.email)
  );
  const emptyDiv = document.getElementById('requestsEmpty');
  const table    = document.getElementById('requestsTable');
  const tbody    = document.getElementById('requestTableBody');

  if (mine.length === 0) {
    emptyDiv.classList.remove('d-none');
    table.classList.add('d-none');
    return;
  }

  emptyDiv.classList.add('d-none');
  table.classList.remove('d-none');

  // Sort newest first
  const sorted = [...mine].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map((r) => {
    // Find the real index in window.db.requests for deletion
    const globalIdx = window.db.requests.indexOf(r);
    const itemsSummary = r.items
      .map(it => `${it.name} <span class="text-muted">×${it.qty}</span>`)
      .join(', ');
    return `
      <tr>
        <td class="text-nowrap">${fmtDate(r.date)}</td>
        <td>${r.type}</td>
        <td class="req-items-cell">${itemsSummary}</td>
        <td class="text-center">${statusBadge(r.status)}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger"
                  onclick="deleteRequest(${globalIdx})">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

// Alias so routing call still works
function renderRequests() { renderRequestsList(); }

/** Open modal – reset form each time */
function openRequestModal() {
  document.getElementById('reqError').classList.add('d-none');
  document.getElementById('reqType').value = 'Equipment';
  buildReqItems([{ name: '', qty: 1 }]);
  requestModal.show();
}

/** Rebuild the items rows from an array */
function buildReqItems(items) {
  const container = document.getElementById('reqItemsList');
  container.innerHTML = '';
  items.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'input-group mb-2 req-item-row';
    row.innerHTML = `
      <input type="text"   class="form-control req-item-name"
             placeholder="Item name" value="${it.name}">
      <input type="number" class="form-control req-item-qty"
             style="max-width:90px" min="1" value="${it.qty}">
      <button type="button" class="btn btn-outline-danger req-remove-btn"
              onclick="removeReqItem(this)" title="Remove">×</button>`;
    container.appendChild(row);
  });
}

/** Add a blank row – preserve existing values */
function addReqItem() {
  const rows  = document.querySelectorAll('.req-item-row');
  const items = [...rows].map(row => ({
    name: row.querySelector('.req-item-name').value,
    qty:  row.querySelector('.req-item-qty').value,
  }));
  items.push({ name: '', qty: 1 });
  buildReqItems(items);
  // Focus the new name input
  const allNames = document.querySelectorAll('.req-item-name');
  allNames[allNames.length - 1].focus();
}

/** Remove one item row */
function removeReqItem(btn) {
  const row = btn.closest('.req-item-row');
  // Don't remove the very last row – just clear it instead
  const allRows = document.querySelectorAll('.req-item-row');
  if (allRows.length === 1) {
    row.querySelector('.req-item-name').value = '';
    row.querySelector('.req-item-qty').value  = 1;
    return;
  }
  row.remove();
}

/** Validate + save the request */
function submitRequest() {
  const errEl = document.getElementById('reqError');
  errEl.classList.add('d-none');

  const type  = document.getElementById('reqType').value;
  const rows  = document.querySelectorAll('.req-item-row');
  const items = [...rows]
    .map(row => ({
      name: row.querySelector('.req-item-name').value.trim(),
      qty:  parseInt(row.querySelector('.req-item-qty').value) || 1,
    }))
    .filter(it => it.name !== '');

  // Validate: at least one named item
  if (items.length === 0) {
    errEl.textContent = 'Please add at least one item before submitting.';
    errEl.classList.remove('d-none');
    return;
  }

  // Build request object with all required fields
  const request = {
    employeeEmail: currentUser.email,
    type,
    items,
    status: 'Pending',
    date:   new Date().toISOString(),
  };

  window.db.requests.push(request);
  saveToStorage();

  requestModal.hide();
  renderRequestsList();
}

/** Delete by global index in window.db.requests */
function deleteRequest(globalIdx) {
  const r = window.db.requests[globalIdx];
  if (!r) return;
  if (!confirm(`Delete this ${r.type} request from ${fmtDate(r.date)}?`)) return;
  window.db.requests.splice(globalIdx, 1);
  saveToStorage();
  renderRequestsList();
}