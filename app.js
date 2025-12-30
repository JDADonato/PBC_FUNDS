/**
 * PILGRIMS BAPTIST CHURCH - FINANCE PORTAL
 * Logic Engine: Gesture-Based Management & Cloud Sync
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwnY1HKQfGRhwqbmNX9d3bZCVFVc5XOjKhkOUB6rhAo7rWbXpWy9Kvx7_JQ3WYZttTG/exec";
const ADMIN_PASS = "pilgrimsbaptistchurch";

// --- STATE MANAGEMENT ---
let incSources = JSON.parse(localStorage.getItem('pbc_inc')) || ['Tithes', 'Offerings', 'Fund Raising'];
let expCats = JSON.parse(localStorage.getItem('pbc_exp')) || ['Outdoor Fellowship', 'Food Fellowship', 'Refreshments', 'Seminars', 'Year End', 'Fund raising'];
let currentReportData = { income: [], expenses: [] };
let pendingAction = null; 

// --- NAVIGATION & MOBILE MENU ---
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function showSection(section, btn) {
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('open');
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.getElementById('current-view').innerText = section.toUpperCase();
    const render = document.getElementById('content-render');
    render.innerHTML = ''; 

    switch (section) {
        case 'income': renderIncomeForm(render); break;
        case 'expenses': renderExpenseForm(render); break;
        case 'reports': renderReports(render); break;
        case 'settings': renderSettings(render); break;
    }
    lucide.createIcons();
}

// --- FORM RENDERING ---
function renderIncomeForm(container) {
    container.innerHTML = `
        <div class="stat-card fade-in">
            <h3 style="margin-bottom:25px"><i data-lucide="plus-circle" style="color:var(--primary)"></i> Record Income</h3>
            <div class="form-grid">
                <div class="input-field"><label>Date</label><input type="date" id="f-date" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="input-field"><label>Schedule</label><select id="f-week"><option>Week 1</option><option>Week 2</option><option>Week 3</option><option>Week 4</option><option>Week 5</option></select></div>
                <div class="input-field"><label>Fund Source</label><select id="f-source">${incSources.map(s => `<option>${s}</option>`).join('')}</select></div>
                <div class="input-field"><label>Amount (PHP)</label><input type="number" id="f-amount" placeholder="0.00"></div>
                <div class="input-field" style="grid-column: 1 / -1;"><label>Recorder Name</label><input type="text" id="f-recorder" placeholder="Enter full name"></div>
            </div>
            <div style="margin-top:30px; text-align:right"><button class="btn-action" onclick="handleSubmit('Income')">Save to Cloud</button></div>
        </div>`;
}

function renderExpenseForm(container) {
    container.innerHTML = `
        <div class="stat-card fade-in">
            <h3 style="margin-bottom:25px; color:#b91c1c"><i data-lucide="minus-circle"></i> Record Expenditure</h3>
            <div class="form-grid">
                <div class="input-field"><label>Date</label><input type="date" id="f-date" value="${new Date().toISOString().split('T')[0]}"></div>
                <div class="input-field"><label>Category</label><select id="f-category">${expCats.map(s => `<option>${s}</option>`).join('')}</select></div>
                <div class="input-field"><label>Amount (PHP)</label><input type="number" id="f-amount" placeholder="0.00"></div>
                <div class="input-field"><label>Recorder</label><input type="text" id="f-recorder" placeholder="Enter full name"></div>
            </div>
            <div style="margin-top:30px; text-align:right"><button class="btn-action" style="background:#b91c1c" onclick="handleSubmit('Expenses')">Confirm Withdrawal</button></div>
        </div>`;
}

// --- REPORTS & FILTERING ---
async function renderReports(container) {
    container.innerHTML = `<div class="stat-card"><p>Synchronizing Ledger...</p></div>`;
    try {
        const res = await fetch(SCRIPT_URL);
        currentReportData = await res.json();
        renderFilteredReport();
    } catch (e) { 
        notify("Cloud connection failed", "cloud-off"); 
    }
}

function renderFilteredReport() {
    const container = document.getElementById('content-render');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    const mSelect = document.getElementById('month-filter');
    const yInput = document.getElementById('year-filter');
    
    const monthFilter = mSelect ? mSelect.value : 'all';
    const yearFilter = yInput ? yInput.value : new Date().getFullYear();
    const displayMonth = monthFilter === 'all' ? 'Annual' : monthNames[parseInt(monthFilter)];

    const filterFn = (r) => {
        const d = new Date(r[1]);
        return (monthFilter === 'all' || d.getMonth() === parseInt(monthFilter)) && d.getFullYear() === parseInt(yearFilter);
    };

    const fInc = (currentReportData.income || []).slice(1).filter(filterFn);
    const fExp = (currentReportData.expenses || []).slice(1).filter(filterFn);
    
    const hasData = fInc.length > 0 || fExp.length > 0;
    const tInc = fInc.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);
    const tExp = fExp.reduce((s, r) => s + (parseFloat(r[3]) || 0), 0);

    container.innerHTML = `
        <div class="stat-card report-controls no-print">
            <div class="input-field"><label>YEAR</label><input type="number" id="year-filter" value="${yearFilter}" onchange="renderFilteredReport()"></div>
            <div class="input-field"><label>MONTH</label><select id="month-filter" onchange="renderFilteredReport()">
                <option value="all">All</option>
                ${monthNames.map((m,i)=>`<option value="${i}" ${monthFilter == i ? 'selected' : ''}>${m}</option>`).join('')}
            </select></div>
            <button class="btn-action" onclick="exportPDF()" style="margin-left:auto"><i data-lucide="download"></i> PDF Report</button>
        </div>
        <div id="report-to-print">
            <div class="stat-card" style="padding: 20px 15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--primary); padding-bottom:15px; margin-bottom:25px">
                    <div><h2 style="color:var(--primary); margin:0">Pilgrims Baptist Church</h2><p style="margin:5px 0; font-size:0.85rem;">Financial Ledger: ${displayMonth} ${yearFilter}</p></div>
                    <img src="youth_green.png" width="60">
                </div>
                <div class="summary-grid">
                    <div class="mini-stat"><span>Income</span><strong>₱${tInc.toLocaleString()}</strong></div>
                    <div class="mini-stat"><span>Expenses</span><strong style="color:#b91c1c">₱${tExp.toLocaleString()}</strong></div>
                    <div class="mini-stat" style="background:var(--primary);"><span>Balance</span><strong>₱${(tInc - tExp).toLocaleString()}</strong></div>
                </div>
                
                ${hasData ? `
                    <table class="compact-table">
                        <thead><tr><th>Date</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
                        <tbody id="ledger-body">
                            ${fInc.map(r => renderRow(r, 'Income')).join('')}
                            ${fExp.map(r => renderRow(r, 'Expenses')).join('')}
                        </tbody>
                    </table>
                ` : renderEmptyState()}
            </div>
        </div>`;
    
    if(hasData) attachGestureListeners();
    lucide.createIcons();
}

function renderRow(r, type) {
    return `
        <tr data-type="${type}" data-json='${JSON.stringify(r).replace(/'/g, "&apos;")}'>
            <td>${new Date(r[1]).toLocaleDateString()}</td>
            <td>${type === 'Income' ? r[5] : r[2]} <br><small style="color:gray">${r[4]}</small></td>
            <td style="text-align:right">₱${parseFloat(r[3]).toLocaleString()}</td>
        </tr>`;
}

function renderEmptyState() {
    return `
        <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            <i data-lucide="folder-search" style="width:48px; height:48px; margin: 0 auto 15px; opacity:0.3; display:block;"></i>
            <p style="font-weight:600; margin:0;">No records available</p>
            <p style="font-size:0.8rem; margin-top:5px;">Try adjusting your filters or check your connection.</p>
        </div>`;
}

// --- GESTURE ENGINE (Desktop: Click | Mobile: Long-Press) ---
function attachGestureListeners() {
    const rows = document.querySelectorAll('#ledger-body tr');
    let pressTimer;
    let isLongPress = false;

    rows.forEach(row => {
        const rowData = JSON.parse(row.getAttribute('data-json'));
        const type = row.getAttribute('data-type');

        row.addEventListener('touchstart', (e) => {
            isLongPress = false;
            pressTimer = window.setTimeout(() => {
                isLongPress = true;
                openPasswordModal('manage', type, rowData);
            }, 700); 
        }, { passive: true });

        row.addEventListener('touchend', () => {
            clearTimeout(pressTimer);
        }, { passive: true });

        row.addEventListener('click', () => {
            if (!isLongPress) {
                openPasswordModal('manage', type, rowData);
            }
        });
    });
}

// --- SECURITY & MODAL WORKFLOW ---
function openPasswordModal(action, type, rowData) {
    pendingAction = { action, type, rowData };
    document.getElementById('modal-overlay').classList.add('active');
    document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
    document.getElementById('password-modal').classList.remove('hidden');
    document.getElementById('admin-pw-input').value = '';
    document.getElementById('admin-pw-input').focus();
    lucide.createIcons();
}

function verifyAdmin() {
    const pw = document.getElementById('admin-pw-input').value.replace(/\s/g, '').toLowerCase();
    if (pw === ADMIN_PASS) {
        document.getElementById('password-modal').classList.add('hidden');
        if (pendingAction.action === 'manage') openEditModal();
        else if (pendingAction.action === 'delete') openDeleteModal();
    } else { 
        notify("Incorrect Password", "shield-alert"); 
    }
}

function openEditModal() {
    const d = pendingAction.rowData;
    const type = pendingAction.type;
    document.getElementById('edit-modal').classList.remove('hidden');
    const container = document.getElementById('edit-form-container');
    
    container.innerHTML = `
        <div class="input-field"><label>Date</label><input type="date" id="e-date" value="${new Date(d[1]).toISOString().split('T')[0]}"></div>
        <div class="input-field"><label>Amount</label><input type="number" id="e-amount" value="${d[3]}"></div>
        <div class="input-field" style="grid-column: span 2"><label>Recorder</label><input type="text" id="e-recorder" value="${d[4]}"></div>
        ${type==='Income' ? 
            `<div class="input-field" style="grid-column: span 2"><label>Source</label><select id="e-source">${incSources.map(s=>`<option ${d[5]==s?'selected':''}>${s}</option>`).join('')}</select></div>` : 
            `<div class="input-field" style="grid-column: span 2"><label>Category</label><select id="e-category">${expCats.map(s=>`<option ${d[2]==s?'selected':''}>${s}</option>`).join('')}</select></div>`
        }`;
    document.getElementById('save-edit-btn').onclick = executeEdit;
    lucide.createIcons();
}

function confirmInternalDelete() {
    document.getElementById('edit-modal').classList.add('hidden');
    openDeleteModal();
}

function openDeleteModal() {
    const d = pendingAction.rowData;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('delete-info-summary').innerHTML = `
        <strong>${pendingAction.type === 'Income' ? d[5] : d[2]}</strong><br>
        ₱${parseFloat(d[3]).toLocaleString()} | ${new Date(d[1]).toLocaleDateString()}
    `;
}

// --- CLOUD CRUD OPERATIONS ---
async function handleSubmit(type) {
    const amount = document.getElementById('f-amount').value;
    const recorder = document.getElementById('f-recorder').value;
    if(!amount || !recorder) return notify("All fields required", "alert-circle");
    
    const data = { type, date: document.getElementById('f-date').value, amount, recorder: recorder.toUpperCase(), week: document.getElementById('f-week')?.value || '', source: document.getElementById('f-source')?.value || '', category: document.getElementById('f-category')?.value || '' };
    notify("Syncing...", "refresh-cw");
    await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(data), mode: 'no-cors' });
    notify("Data Saved", "check-circle");
    showSection(type.toLowerCase());
}

async function executeEdit() {
    const updateData = { action: "edit", type: pendingAction.type, oldTimestamp: pendingAction.rowData[0], date: document.getElementById('e-date').value, amount: document.getElementById('e-amount').value, recorder: document.getElementById('e-recorder').value.toUpperCase(), week: document.getElementById('e-week')?.value || '', source: document.getElementById('e-source')?.value || '', category: document.getElementById('e-category')?.value || '' };
    notify("Updating...", "refresh-cw");
    await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(updateData), mode: 'no-cors' });
    notify("Updated", "check-circle");
    closeModals();
    renderReports(document.getElementById('content-render'));
}

async function executeDelete() {
    notify("Deleting...", "trash-2");
    await fetch(SCRIPT_URL, { method: "POST", mode: 'no-cors', body: JSON.stringify({ action: "delete", type: pendingAction.type, timestamp: pendingAction.rowData[0] }) });
    notify("Removed", "check-circle");
    closeModals();
    renderReports(document.getElementById('content-render'));
}

// --- SETTINGS ---
function renderSettings(container) {
    container.innerHTML = `
        <div class="settings-grid fade-in">
            <div class="stat-card">
                <h3 style="margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                    <i data-lucide="list-plus" style="color:var(--primary)"></i> Income Sources
                </h3>
                <div class="settings-input-group">
                    <input id="ni" type="text" placeholder="Add source...">
                    <button class="btn-action btn-icon-only" onclick="addSet('inc')">
                        <i data-lucide="plus"></i>
                    </button>
                </div>
                <div class="list-box">
                    ${incSources.map((s, i) => `
                        <div class="list-item">
                            <span>${s}</span>
                            <button class="btn-delete-item" onclick="delSet('inc', ${i})">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="stat-card">
                <h3 style="margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                    <i data-lucide="list-minus" style="color:#b91c1c"></i> Expense Categories
                </h3>
                <div class="settings-input-group">
                    <input id="ne" type="text" placeholder="Add category...">
                    <button class="btn-action btn-icon-only" onclick="addSet('exp')">
                        <i data-lucide="plus"></i>
                    </button>
                </div>
                <div class="list-box">
                    ${expCats.map((s, i) => `
                        <div class="list-item">
                            <span>${s}</span>
                            <button class="btn-delete-item" onclick="delSet('exp', ${i})">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    lucide.createIcons();
}

// --- HELPERS & UTILS ---
function closeModals() { document.getElementById('modal-overlay').classList.remove('active'); }

function notify(message, iconName) {
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.style.display = 'flex';
    t.style.alignItems = 'center';
    t.style.gap = '10px';
    
    t.innerHTML = `
        <i data-lucide="${iconName}" style="width:18px; height:18px;"></i>
        <span>${message}</span>
    `;
    
    document.getElementById('toast-container').appendChild(t);
    lucide.createIcons(); 
    
    setTimeout(() => { 
        t.style.opacity = '0'; 
        setTimeout(() => t.remove(), 400); 
    }, 3500);
}

function exportPDF() { html2pdf().from(document.getElementById('report-to-print')).set({ margin: 0.5, filename: 'PBC_Report.pdf' }).save(); }
function addSet(t) { const v = document.getElementById(t==='inc'?'ni':'ne').value; if(!v) return; if(t==='inc') incSources.push(v); else expCats.push(v); localStorage.setItem(t==='inc'?'pbc_inc':'pbc_exp', JSON.stringify(t==='inc'?incSources:expCats)); showSection('settings'); }
function delSet(t,i) { if(t==='inc') incSources.splice(i,1); else expCats.splice(i,1); localStorage.setItem(t==='inc'?'pbc_inc':'pbc_exp', JSON.stringify(t==='inc'?incSources:expCats)); showSection('settings'); }

window.onload = () => { showSection('income', document.querySelector('.nav-btn')); lucide.createIcons(); };
