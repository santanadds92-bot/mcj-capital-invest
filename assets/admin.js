import { supabase, FOTOS_BUCKET, formatBRL, descricaoToHTML, sanitizeDescricao } from './supabase-client.js';

// ---------- Elementos ----------
const loginWrap = document.getElementById('loginWrap');
const adminMain = document.getElementById('adminMain');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

const tabList = document.getElementById('tabList');
const tabNew = document.getElementById('tabNew');
const panelList = document.getElementById('panelList');
const panelForm = document.getElementById('panelForm');
const imoveisTableBody = document.getElementById('imoveisTableBody');
const emptyState = document.getElementById('emptyState');

const imovelForm = document.getElementById('imovelForm');
const formTitle = document.getElementById('formTitle');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const photoPreviewGrid = document.getElementById('photoPreviewGrid');
const uploadProgress = document.getElementById('uploadProgress');
const toast = document.getElementById('toast');

let editingId = null;
let currentPhotos = []; // URLs já salvas no storage para o imóvel em edição/criação

// ---------- Editor de descrição (contenteditable + toolbar) ----------
const descricaoEditor = document.getElementById('descricaoEditor');
document.querySelectorAll('.editor-toolbar button').forEach(btn => {
  btn.addEventListener('click', () => {
    descricaoEditor.focus();
    const cmd = btn.dataset.cmd;
    const value = btn.dataset.value || null;
    document.execCommand(cmd, false, value);
  });
});

// ---------- Auth ----------
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    showAdmin(session.user.email);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginWrap.style.display = 'flex';
  adminMain.style.display = 'none';
  document.getElementById('adminUserBar').style.display = 'none';
}

function showAdmin(email) {
  loginWrap.style.display = 'none';
  adminMain.style.display = 'block';
  document.getElementById('adminUserBar').style.display = 'flex';
  userEmailEl.textContent = email;
  loadImoveis();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'E-mail ou senha inválidos.';
    loginError.style.display = 'block';
    return;
  }
  showAdmin(data.user.email);
});

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  showLogin();
});

// ---------- Tabs ----------
tabList.addEventListener('click', () => switchTab('list'));
tabNew.addEventListener('click', () => switchTab('form'));
cancelEditBtn.addEventListener('click', () => switchTab('list'));

function switchTab(tab) {
  tabList.classList.toggle('active', tab === 'list');
  tabNew.classList.toggle('active', tab === 'form');
  panelList.classList.toggle('active', tab === 'list');
  panelForm.classList.toggle('active', tab === 'form');
  if (tab === 'form' && !editingId) {
    resetForm();
  }
  if (tab === 'list') {
    loadImoveis();
  }
}

// ---------- Listagem ----------
async function loadImoveis() {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Erro ao carregar imóveis: ' + error.message, true);
    return;
  }

  if (!data || data.length === 0) {
    imoveisTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  imoveisTableBody.innerHTML = data.map(im => `
    <tr>
      <td>${im.codigo}</td>
      <td>${im.titulo}</td>
      <td>${im.finalidade === 'alugar' ? 'Alugar' : 'Comprar'}</td>
      <td>${formatBRL(im.valor)}</td>
      <td><span class="status-pill ${im.status}">${im.status}</span></td>
      <td class="actions">
        <button class="btn-sm" data-edit="${im.id}">Editar</button>
        <button class="btn-sm" data-delete="${im.id}">Excluir</button>
      </td>
    </tr>
  `).join('');

  imoveisTableBody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editImovel(btn.dataset.edit, data));
  });
  imoveisTableBody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteImovel(btn.dataset.delete));
  });
}

async function deleteImovel(id) {
  if (!confirm('Tem certeza que deseja excluir este imóvel? Essa ação não pode ser desfeita.')) return;
  const { error } = await supabase.from('imoveis').delete().eq('id', id);
  if (error) {
    showToast('Erro ao excluir: ' + error.message, true);
    return;
  }
  showToast('Imóvel excluído.');
  loadImoveis();
}

function editImovel(id, list) {
  const im = list.find(i => i.id === id);
  if (!im) return;
  editingId = id;
  formTitle.textContent = 'Editar Imóvel';

  imovelForm.codigo.value = im.codigo || '';
  imovelForm.titulo.value = im.titulo || '';
  imovelForm.finalidade.value = im.finalidade || 'comprar';
  imovelForm.tipo.value = im.tipo || '';
  imovelForm.bairro.value = im.bairro || '';
  imovelForm.cidade.value = im.cidade || '';
  imovelForm.endereco.value = im.endereco || '';
  imovelForm.quartos.value = im.quartos || 0;
  imovelForm.banheiros.value = im.banheiros || 0;
  imovelForm.suites.value = im.suites || 0;
  imovelForm.vagas.value = im.vagas || 0;
  imovelForm.area.value = im.area || '';
  imovelForm.valor.value = im.valor || '';
  imovelForm.valor_condominio.value = im.valor_condominio || '';
  imovelForm.video_url.value = im.video_url || '';
  descricaoEditor.innerHTML = descricaoToHTML(im.descricao || '');
  imovelForm.destaque.checked = !!im.destaque;
  imovelForm.status.value = im.status || 'ativo';

  currentPhotos = Array.isArray(im.fotos) ? [...im.fotos] : [];
  renderPhotoPreviews();

  switchTab('form');
}

// ---------- Formulário: criar/editar ----------
function resetForm() {
  editingId = null;
  formTitle.textContent = 'Novo Imóvel';
  imovelForm.reset();
  descricaoEditor.innerHTML = '';
  currentPhotos = [];
  renderPhotoPreviews();
}

imovelForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(imovelForm);

  const payload = {
    codigo: fd.get('codigo').trim(),
    titulo: fd.get('titulo').trim(),
    finalidade: fd.get('finalidade'),
    tipo: fd.get('tipo'),
    bairro: fd.get('bairro'),
    cidade: fd.get('cidade'),
    endereco: fd.get('endereco'),
    quartos: Number(fd.get('quartos')) || 0,
    banheiros: Number(fd.get('banheiros')) || 0,
    suites: Number(fd.get('suites')) || 0,
    vagas: Number(fd.get('vagas')) || 0,
    area: fd.get('area') ? Number(fd.get('area')) : null,
    valor: fd.get('valor') ? Number(fd.get('valor')) : null,
    valor_condominio: fd.get('valor_condominio') ? Number(fd.get('valor_condominio')) : null,
    video_url: fd.get('video_url'),
    descricao: sanitizeDescricao(descricaoEditor.innerHTML.trim()),
    destaque: fd.get('destaque') === 'on',
    status: fd.get('status'),
    fotos: currentPhotos,
  };

  let error;
  if (editingId) {
    ({ error } = await supabase.from('imoveis').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('imoveis').insert(payload));
  }

  if (error) {
    showToast('Erro ao salvar: ' + error.message, true);
    return;
  }
  showToast('Imóvel salvo com sucesso!');
  switchTab('list');
});

// ---------- Upload de fotos ----------
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--gold)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (files.length === 0) return;
  uploadProgress.style.display = 'block';
  uploadProgress.textContent = `Enviando ${files.length} foto(s)...`;

  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      showToast('Erro ao enviar foto: ' + error.message, true);
      continue;
    }
    const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
    currentPhotos.push(pub.publicUrl);
  }

  uploadProgress.style.display = 'none';
  fileInput.value = '';
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  photoPreviewGrid.innerHTML = currentPhotos.map((url, idx) => `
    <div class="photo-preview">
      <img src="${url}" alt="Foto ${idx + 1}">
      <button type="button" class="remove-photo" data-idx="${idx}">&times;</button>
    </div>
  `).join('');

  photoPreviewGrid.querySelectorAll('.remove-photo').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPhotos.splice(Number(btn.dataset.idx), 1);
      renderPhotoPreviews();
    });
  });
}

// ---------- Toast ----------
let toastTimeout;
function showToast(msg, isError = false) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ---------- Início ----------
checkSession();
