/* Homework Hub — local, offline-first PWA */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const storeKey = 'hh.items.v1';
let items = loadItems();

const listEl = $('#list');
const tplItem = $('#tplItem');
const filterState = { mode: 'all', q: '', sort: 'dueAsc' };

// Install prompt
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('#btnInstall'); btn.hidden = false;
  btn.onclick = async () => {
    btn.disabled = true;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    btn.hidden = true;
  };
});

// Form add
$('#formNew').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = $('#title').value.trim();
  const subject = $('#subject').value.trim();
  const due = $('#due').value;
  const priority = $('#priority').value;
  if (!title || !due) return;
  const it = {
    id: crypto.randomUUID(),
    title, subject, due,
    priority,
    done: false,
    createdAt: new Date().toISOString()
  };
  items.push(it);
  saveItems(); render();
  e.target.reset();
  $('#title').focus();
});

// Filters
$$('.chip').forEach(btn => btn.addEventListener('click', () => {
  $$('.chip').forEach(c => c.classList.remove('chip-active'));
  btn.classList.add('chip-active');
  filterState.mode = btn.dataset.filter;
  render();
}));

// Search & sort
$('#search').addEventListener('input', (e) => { filterState.q = e.target.value.toLowerCase(); render(); });
$('#sort').addEventListener('change', (e) => { filterState.sort = e.target.value; render(); });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  if (e.key.toLowerCase() === 'n') { e.preventDefault(); $('#title').focus(); }
});

// Export
$('#btnExport').addEventListener('click', () => {
  const data = JSON.stringify(items, null, 2);
  downloadFile('homework_hub_backup.json', data, 'application/json');
});

// Import
$('#fileImport').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let imported = [];
  if (file.name.endsWith('.json')) {
    imported = JSON.parse(text);
  } else if (file.name.endsWith('.csv')) {
    imported = parseCSV(text);
  } else {
    alert('Use a .json or .csv file');
    return;
  }
  // Merge: existing IDs kept, new ones added
  const map = new Map(items.map(it => [it.id, it]));
  for (const it of imported) {
    if (!it.id) it.id = crypto.randomUUID();
    map.set(it.id, { ...map.get(it.id), ...it });
  }
  items = Array.from(map.values());
  saveItems(); render();
  e.target.value = '';
});

function parseCSV(text) {
  // very simple CSV (expects header title,subject,due,priority,done)
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',').map(s => s.trim().toLowerCase());
  const idx = (k) => header.indexOf(k);
  const out = [];
  for (const line of lines) {
    const cols = line.split(',');
    out.push({
      id: crypto.randomUUID(),
      title: cols[idx('title')] || '',
      subject: cols[idx('subject')] || '',
      due: cols[idx('due')] || '',
      priority: cols[idx('priority')] || 'normal',
      done: (cols[idx('done')] || '').toLowerCase().startsWith('t'),
      createdAt: new Date().toISOString()
    });
  }
  return out;
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function loadItems() {
  try { return JSON.parse(localStorage.getItem(storeKey)) || []; }
  catch { return []; }
}
function saveItems() {
  localStorage.setItem(storeKey, JSON.stringify(items));
}

function withinWeek(dateStr) {
  const d = new Date(dateStr); if (Number.isNaN(d)) return false;
  const now = new Date();
  const weekAhead = new Date(now); weekAhead.setDate(now.getDate() + 7);
  d.setHours(0,0,0,0); now.setHours(0,0,0,0); weekAhead.setHours(0,0,0,0);
  return d >= now && d <= weekAhead;
}
function isToday(dateStr) {
  const d = new Date(dateStr); const now = new Date();
  return d.toDateString() === now.toDateString();
}
function isOverdue(dateStr, done) {
  const d = new Date(dateStr); const now = new Date();
  d.setHours(0,0,0,0); now.setHours(0,0,0,0);
  return !done && d < now;
}

function render() {
  // filter
  let filtered = items.filter(it => {
    const q = filterState.q;
    const hit = (it.title + ' ' + (it.subject||'')).toLowerCase().includes(q);
    if (!hit) return false;
    switch (filterState.mode) {
      case 'today': return isToday(it.due);
      case 'week': return withinWeek(it.due);
      case 'overdue': return isOverdue(it.due, it.done);
      case 'done': return it.done;
      default: return true; // all
    }
  });
  // sort
  filtered.sort((a,b) => {
    switch (filterState.sort) {
      case 'dueDesc': return (new Date(b.due) - new Date(a.due));
      case 'prio': return prioRank(b.priority) - prioRank(a.priority) || (new Date(a.due) - new Date(b.due));
      case 'alpha': return a.title.localeCompare(b.title);
      default: return (new Date(a.due) - new Date(b.due));
    }
  });
  // render
  listEl.innerHTML = '';
  for (const it of filtered) {
    listEl.appendChild(renderItem(it));
  }
}
function prioRank(p) { return p === 'high' ? 2 : p === 'normal' ? 1 : 0; }

function renderItem(it) {
  const node = tplItem.content.firstElementChild.cloneNode(true);
  const chk = node.querySelector('.done');
  const title = node.querySelector('.title');
  const sub = node.querySelector('.subline');
  const badges = node.querySelector('.badges');

  chk.checked = !!it.done;
  chk.addEventListener('change', () => { it.done = chk.checked; saveItems(); render(); });

  title.textContent = it.title;
  const d = new Date(it.due);
  const dd = Number.isNaN(d) ? 'No due date' : d.toLocaleDateString();
  sub.textContent = [it.subject || '—', dd].join(' • ');

  badges.innerHTML = '';
  const bPrio = document.createElement('span');
  bPrio.className = 'badge ' + it.priority;
  bPrio.textContent = it.priority.toUpperCase();
  badges.appendChild(bPrio);

  if (isOverdue(it.due, it.done)) {
    const bOver = document.createElement('span');
    bOver.className = 'badge danger';
    bOver.style.borderColor = '#5b1c1c';
    bOver.style.background = '#2a1212';
    bOver.textContent = 'OVERDUE';
    badges.appendChild(bOver);
  } else if (isToday(it.due)) {
    const bToday = document.createElement('span');
    bToday.className = 'badge';
    bToday.style.borderColor = '#234f4a';
    bToday.style.background = '#0f2b28';
    bToday.textContent = 'TODAY';
    badges.appendChild(bToday);
  }

  node.querySelector('.edit').addEventListener('click', () => openEdit(it));
  node.querySelector('.delete').addEventListener('click', () => {
    if (!confirm('Delete this assignment?')) return;
    items = items.filter(x => x.id !== it.id);
    saveItems(); render();
  });

  return node;
}

// Edit dialog
const dlg = $('#dlgEdit');
function openEdit(it) {
  $('#e_title').value = it.title;
  $('#e_subject').value = it.subject || '';
  $('#e_due').value = it.due;
  $('#e_priority').value = it.priority;
  dlg.showModal();
  $('#btnSaveEdit').onclick = () => {
    it.title = $('#e_title').value.trim();
    it.subject = $('#e_subject').value.trim();
    it.due = $('#e_due').value;
    it.priority = $('#e_priority').value;
    saveItems(); render();
  };
}

render();

// PWA: register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}