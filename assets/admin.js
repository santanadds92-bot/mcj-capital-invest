import { supabase, FOTOS_BUCKET, formatBRL, descricaoToHTML, sanitizeDescricao, labelCategoria, getSiteConfig, setSiteConfig } from './supabase-client.js';
import { getGeminiKey, setGeminiKey, generateProdutoFromText } from './gemini-ai.js';
import { PRODUTOS_CATALOGO_SEED } from './produtos-catalogo-seed.js';

// ---------- Elementos ----------
const loginWrap = document.getElementById('loginWrap');
const adminMain = document.getElementById('adminMain');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

const tabList = document.getElementById('tabList');
const tabNew = document.getElementById('tabNew');
const tabBordados = document.getElementById('tabBordados');
const tabRevenda = document.getElementById('tabRevenda');
const tabMessages = document.getElementById('tabMessages');
const panelList = document.getElementById('panelList');
const panelForm = document.getElementById('panelForm');
const panelBordados = document.getElementById('panelBordados');
const panelRevenda = document.getElementById('panelRevenda');
const panelMessages = document.getElementById('panelMessages');
const produtosTableBody = document.getElementById('produtosTableBody');
const emptyState = document.getElementById('emptyState');
const bordadosList = document.getElementById('bordadosList');
const bordadosEmptyState = document.getElementById('bordadosEmptyState');
const bordadosCount = document.getElementById('bordadosCount');
const revendaList = document.getElementById('revendaList');
const revendaEmptyState = document.getElementById('revendaEmptyState');
const revendaCount = document.getElementById('revendaCount');
const messagesList = document.getElementById('messagesList');
const messagesEmptyState = document.getElementById('messagesEmptyState');
const messagesCount = document.getElementById('messagesCount');

const produtoForm = document.getElementById('produtoForm');
const formTitle = document.getElementById('formTitle');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const photoPreviewGrid = document.getElementById('photoPreviewGrid');
const uploadProgress = document.getElementById('uploadProgress');
const toast = document.getElementById('toast');

const geminiApiKeyInput = document.getElementById('geminiApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const rawProductData = document.getElementById('rawProductData');
const generateAIBtn = document.getElementById('generateAIBtn');

let editingId = null;
let currentPhotos = [];

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

// ---------- IA: Preenchimento automático (Google Gemini) ----------
function refreshApiKeyStatus() {
  const key = getGeminiKey();
  geminiApiKeyInput.value = key;
  apiKeyStatus.textContent = key ? 'Chave salva ✓' : '';
}

saveApiKeyBtn.addEventListener('click', () => {
  const key = geminiApiKeyInput.value.trim();
  if (!key) {
    showToast('Cole uma chave válida antes de salvar.', true);
    return;
  }
  setGeminiKey(key);
  refreshApiKeyStatus();
  showToast('Chave da API salva neste navegador.');
});

async function generateWithAI() {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    showToast('Cole e salve sua chave da API Gemini primeiro.', true);
    return;
  }
  const raw = rawProductData.value.trim();
  if (!raw) {
    showToast('Cole as informações do produto no campo acima.', true);
    return;
  }
  generateAIBtn.disabled = true;
  generateAIBtn.textContent = 'Gerando...';
  try {
    const d = await generateProdutoFromText(apiKey, raw);
    applyAIResult(d);
    showToast('Produto preenchido pela IA — revise antes de salvar.');
  } catch (err) {
    showToast('Erro ao gerar com IA: ' + err.message, true);
  } finally {
    generateAIBtn.disabled = false;
    generateAIBtn.textContent = 'Gerar com IA';
  }
}
generateAIBtn.addEventListener('click', generateWithAI);

function applyAIResult(d) {
  if (d.codigo) produtoForm.codigo.value = d.codigo;
  if (d.titulo) produtoForm.titulo.value = d.titulo;
  if (d.categoria) produtoForm.categoria.value = d.categoria;
  if (d.corporacao) produtoForm.corporacao.value = d.corporacao;
  if (Array.isArray(d.tamanhos)) produtoForm.tamanhos.value = d.tamanhos.join(', ');
  if (Array.isArray(d.cores)) produtoForm.cores.value = d.cores.join(', ');
  if (d.preco) produtoForm.preco.value = d.preco;
  if (d.personalizavel) document.getElementById('personalizavelCheck').checked = true;
  if (d.descricao) descricaoEditor.innerHTML = sanitizeDescricao(descricaoToHTML(d.descricao));
}

refreshApiKeyStatus();

// ---------- Chave do Gemini usada pelo chat público "Recruta QRV" ----------
// Ao contrário da chave acima (só neste navegador), esta fica salva na
// tabela site_config do Supabase e é lida por assets/chatbot.js em
// qualquer página pública, para qualquer visitante — sem precisar editar
// código. Requer ter rodado supabase-site-config.sql uma vez no projeto.
const chatGeminiApiKeyInput = document.getElementById('chatGeminiApiKey');
const saveChatApiKeyBtn = document.getElementById('saveChatApiKeyBtn');
const chatApiKeyStatus = document.getElementById('chatApiKeyStatus');

async function refreshChatApiKeyStatus() {
  try {
    const key = await getSiteConfig('chatbot_gemini_key');
    chatGeminiApiKeyInput.value = key || '';
    chatApiKeyStatus.textContent = key ? 'Chave salva ✓' : '';
  } catch {
    chatApiKeyStatus.textContent = '';
  }
}

if (saveChatApiKeyBtn) {
  saveChatApiKeyBtn.addEventListener('click', async () => {
    const key = chatGeminiApiKeyInput.value.trim();
    if (!key) {
      showToast('Cole uma chave válida antes de salvar.', true);
      return;
    }
    const { error } = await setSiteConfig('chatbot_gemini_key', key);
    if (error) {
      showToast('Erro ao salvar (rode supabase-site-config.sql no Supabase se ainda não rodou): ' + error.message, true);
      return;
    }
    chatApiKeyStatus.textContent = 'Chave salva ✓';
    showToast('Chave do chat salva! Já vale para todos os visitantes do site.');
  });
}

refreshChatApiKeyStatus();

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
  loadProdutos();
  refreshBadgeCounts();
}

async function refreshBadgeCounts() {
  const [{ count: bordados }, { count: revenda }, { count: messages }] = await Promise.all([
    supabase.from('solicitacoes_bordado').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('solicitacoes_revenda').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
    supabase.from('mensagens_contato').select('id', { count: 'exact', head: true }).eq('lida', false),
  ]);
  updateBadge(bordadosCount, bordados || 0);
  updateBadge(revendaCount, revenda || 0);
  updateBadge(messagesCount, messages || 0);
}

function updateBadge(el, count) {
  el.textContent = count > 0 ? count : '';
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
tabBordados.addEventListener('click', () => switchTab('bordados'));
tabRevenda.addEventListener('click', () => switchTab('revenda'));
tabMessages.addEventListener('click', () => switchTab('messages'));
cancelEditBtn.addEventListener('click', () => switchTab('list'));

function switchTab(tab) {
  tabList.classList.toggle('active', tab === 'list');
  tabNew.classList.toggle('active', tab === 'form');
  tabBordados.classList.toggle('active', tab === 'bordados');
  tabRevenda.classList.toggle('active', tab === 'revenda');
  tabMessages.classList.toggle('active', tab === 'messages');
  panelList.classList.toggle('active', tab === 'list');
  panelForm.classList.toggle('active', tab === 'form');
  panelBordados.classList.toggle('active', tab === 'bordados');
  panelRevenda.classList.toggle('active', tab === 'revenda');
  panelMessages.classList.toggle('active', tab === 'messages');
  if (tab === 'form' && !editingId) {
    resetForm();
  }
  if (tab === 'list') loadProdutos();
  if (tab === 'bordados') loadBordados();
  if (tab === 'revenda') loadRevenda();
  if (tab === 'messages') loadMessages();
}

// ---------- Listagem de produtos (ordenável, edição inline, ações em massa) ----------
const bulkActionsBar = document.getElementById('bulkActionsBar');
const bulkSelectedCount = document.getElementById('bulkSelectedCount');
const bulkAtivarBtn = document.getElementById('bulkAtivarBtn');
const bulkArquivarBtn = document.getElementById('bulkArquivarBtn');
const bulkExcluirBtn = document.getElementById('bulkExcluirBtn');
const selectAllProdutos = document.getElementById('selectAllProdutos');

let produtosCache = [];
let produtosSort = { field: null, dir: 'asc' };
const selectedIds = new Set();

async function loadProdutos() {
  const { data, error } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
  if (error) {
    showToast('Erro ao carregar produtos: ' + error.message, true);
    return;
  }
  produtosCache = data || [];
  selectedIds.clear();
  renderProdutosTable();
}

function sortedProdutos() {
  const { field, dir } = produtosSort;
  if (!field) return produtosCache;
  const mult = dir === 'asc' ? 1 : -1;
  return [...produtosCache].sort((a, b) => {
    let va = a[field], vb = b[field];
    if (field === 'preco') { va = Number(va) || 0; vb = Number(vb) || 0; }
    else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}

function renderProdutosTable() {
  const list = sortedProdutos();
  if (list.length === 0) {
    produtosTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    updateBulkBar();
    return;
  }
  emptyState.style.display = 'none';

  produtosTableBody.innerHTML = list.map(p => `
    <tr data-row="${p.id}">
      <td class="col-check"><input type="checkbox" class="row-check" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td>
      <td class="col-codigo"><input type="text" class="inline-edit" data-id="${p.id}" data-field="codigo" value="${(p.codigo || '').replace(/"/g, '&quot;')}"></td>
      <td class="col-titulo"><input type="text" class="inline-edit" data-id="${p.id}" data-field="titulo" value="${(p.titulo || '').replace(/"/g, '&quot;')}"></td>
      <td class="col-categoria">
        <select class="inline-edit" data-id="${p.id}" data-field="categoria">
          ${['vestuario','calcados','mochilas','insignias','protecao','facas','kits','acessorios','replicas']
            .map(c => `<option value="${c}" ${p.categoria === c ? 'selected' : ''}>${labelCategoria(c)}</option>`).join('')}
        </select>
      </td>
      <td class="col-preco"><input type="number" step="0.01" class="inline-edit" data-id="${p.id}" data-field="preco" value="${p.preco ?? ''}"></td>
      <td><span class="status-pill ${p.status}">${p.status}</span></td>
      <td class="actions">
        <button class="btn-sm" data-edit="${p.id}">Editar</button>
        <button class="btn-sm" data-archive="${p.id}">Arquivar</button>
        <button class="btn-sm btn-danger" data-delete="${p.id}">Excluir</button>
      </td>
    </tr>
  `).join('');

  produtosTableBody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editProduto(btn.dataset.edit, produtosCache));
  });
  produtosTableBody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteProdutos([btn.dataset.delete]));
  });
  produtosTableBody.querySelectorAll('[data-archive]').forEach(btn => {
    btn.addEventListener('click', () => archiveProdutos([btn.dataset.archive]));
  });
  produtosTableBody.querySelectorAll('.inline-edit').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'blur';
    el.addEventListener(evt, () => saveInlineField(el));
    if (el.tagName !== 'SELECT') {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
    }
  });
  produtosTableBody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.id);
      else selectedIds.delete(cb.dataset.id);
      updateBulkBar();
    });
  });

  updateBulkBar();
  updateSortHeaders();
}

document.querySelectorAll('.produtos-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (produtosSort.field === field) {
      produtosSort.dir = produtosSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      produtosSort = { field, dir: 'asc' };
    }
    renderProdutosTable();
  });
});

function updateSortHeaders() {
  document.querySelectorAll('.produtos-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === produtosSort.field) {
      th.classList.add(produtosSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

async function saveInlineField(el) {
  const id = el.dataset.id;
  const field = el.dataset.field;
  let value = el.value;
  if (field === 'preco') value = value === '' ? null : Number(value);
  if (field === 'codigo' || field === 'titulo') value = value.trim();

  const p = produtosCache.find(i => i.id === id);
  if (p && p[field] === value) return;

  const { error } = await supabase.from('produtos').update({ [field]: value }).eq('id', id);
  if (error) {
    showToast('Erro ao salvar: ' + error.message, true);
    return;
  }
  if (p) p[field] = value;
  el.classList.add('saved');
  setTimeout(() => el.classList.remove('saved'), 900);
}

if (selectAllProdutos) {
  selectAllProdutos.addEventListener('change', () => {
    const list = sortedProdutos();
    if (selectAllProdutos.checked) list.forEach(p => selectedIds.add(p.id));
    else selectedIds.clear();
    renderProdutosTable();
  });
}

function updateBulkBar() {
  const count = selectedIds.size;
  if (bulkActionsBar) bulkActionsBar.style.display = count > 0 ? 'flex' : 'none';
  if (bulkSelectedCount) bulkSelectedCount.textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
  if (selectAllProdutos) {
    const list = sortedProdutos();
    selectAllProdutos.checked = list.length > 0 && list.every(p => selectedIds.has(p.id));
  }
}

async function archiveProdutos(ids) {
  const { error } = await supabase.from('produtos').update({ status: 'arquivado' }).in('id', ids);
  if (error) { showToast('Erro ao arquivar: ' + error.message, true); return; }
  showToast(ids.length > 1 ? 'Produtos arquivados.' : 'Produto arquivado.');
  ids.forEach(id => selectedIds.delete(id));
  loadProdutos();
}

async function ativarProdutos(ids) {
  const { error } = await supabase.from('produtos').update({ status: 'ativo' }).in('id', ids);
  if (error) { showToast('Erro ao ativar: ' + error.message, true); return; }
  showToast(ids.length > 1 ? 'Produtos ativados.' : 'Produto ativado.');
  ids.forEach(id => selectedIds.delete(id));
  loadProdutos();
}

async function deleteProdutos(ids) {
  const msg = ids.length > 1
    ? `Tem certeza que deseja excluir ${ids.length} produtos? Essa ação não pode ser desfeita.`
    : 'Tem certeza que deseja excluir este produto? Essa ação não pode ser desfeita.';
  if (!confirm(msg)) return;
  const { error } = await supabase.from('produtos').delete().in('id', ids);
  if (error) { showToast('Erro ao excluir: ' + error.message, true); return; }
  showToast(ids.length > 1 ? 'Produtos excluídos.' : 'Produto excluído.');
  ids.forEach(id => selectedIds.delete(id));
  loadProdutos();
}

if (bulkAtivarBtn) bulkAtivarBtn.addEventListener('click', () => ativarProdutos([...selectedIds]));
if (bulkArquivarBtn) bulkArquivarBtn.addEventListener('click', () => archiveProdutos([...selectedIds]));
if (bulkExcluirBtn) bulkExcluirBtn.addEventListener('click', () => deleteProdutos([...selectedIds]));

// ---------- Formulário: criar/editar ----------
function fillFormWithProduto(p) {
  editingId = p.id;
  produtoForm.codigo.value = p.codigo || '';
  produtoForm.titulo.value = p.titulo || '';
  produtoForm.categoria.value = p.categoria || 'vestuario';
  produtoForm.corporacao.value = p.corporacao || 'Geral';
  produtoForm.estoque_status.value = p.estoque_status || 'disponivel';
  produtoForm.tamanhos.value = Array.isArray(p.tamanhos) ? p.tamanhos.join(', ') : '';
  produtoForm.cores.value = Array.isArray(p.cores) ? p.cores.join(', ') : '';
  produtoForm.preco.value = p.preco || '';
  produtoForm.preco_promocional.value = p.preco_promocional || '';
  produtoForm.status.value = p.status || 'ativo';
  document.getElementById('destaqueCheck').checked = !!p.destaque;
  document.getElementById('personalizavelCheck').checked = !!p.personalizavel;
  descricaoEditor.innerHTML = descricaoToHTML(p.descricao || '');
  currentPhotos = Array.isArray(p.fotos) ? [...p.fotos] : [];
  renderPhotoPreviews();
}

function editProduto(id, list) {
  const p = list.find(i => i.id === id);
  if (!p) return;
  formTitle.textContent = 'Editar Produto';
  fillFormWithProduto(p);
  switchTab('form');
}

function resetForm() {
  editingId = null;
  formTitle.textContent = 'Novo Produto';
  produtoForm.reset();
  descricaoEditor.innerHTML = '';
  currentPhotos = [];
  renderPhotoPreviews();
  rawProductData.value = '';
}

function parseListInput(value) {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

produtoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(produtoForm);

  const payload = {
    codigo: fd.get('codigo').trim(),
    titulo: fd.get('titulo').trim(),
    categoria: fd.get('categoria'),
    corporacao: fd.get('corporacao'),
    tamanhos: parseListInput(fd.get('tamanhos') || ''),
    cores: parseListInput(fd.get('cores') || ''),
    preco: fd.get('preco') ? Number(fd.get('preco')) : null,
    preco_promocional: fd.get('preco_promocional') ? Number(fd.get('preco_promocional')) : null,
    estoque_status: fd.get('estoque_status'),
    personalizavel: fd.get('personalizavel') === 'on',
    destaque: fd.get('destaque') === 'on',
    status: fd.get('status'),
    descricao: sanitizeDescricao(descricaoEditor.innerHTML.trim()),
    fotos: currentPhotos,
  };

  let error;
  if (editingId) {
    ({ error } = await supabase.from('produtos').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('produtos').insert(payload));
  }

  if (error) {
    showToast('Erro ao salvar: ' + error.message, true);
    return;
  }
  showToast('Produto salvo com sucesso!');
  editingId = null;
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
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
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

// ---------- Solicitações de Bordado ----------
async function loadBordados() {
  const { data, error } = await supabase.from('solicitacoes_bordado').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Erro ao carregar bordados: ' + error.message, true); return; }
  updateBadge(bordadosCount, (data || []).filter(s => s.status === 'novo').length);

  if (!data || data.length === 0) {
    bordadosList.innerHTML = '';
    bordadosEmptyState.style.display = 'block';
    return;
  }
  bordadosEmptyState.style.display = 'none';

  bordadosList.innerHTML = data.map(s => `
    <div class="message-card">
      <div class="message-card-header">
        <strong>${s.nome}</strong>
        <span>${new Date(s.created_at).toLocaleString('pt-BR')} · <span class="status-pill ${s.status === 'novo' ? 'pendente' : 'ativo'}">${s.status}</span></span>
      </div>
      <div class="message-card-contact"><span>${s.telefone}</span>${s.tipo_peca ? `<span>Peça: ${s.tipo_peca}</span>` : ''}</div>
      ${s.o_que_bordar ? `<p><strong>Bordar:</strong> ${s.o_que_bordar}</p>` : ''}
      ${s.observacoes ? `<p>${s.observacoes}</p>` : ''}
      <div class="message-card-actions">
        ${s.status === 'novo' ? `<button class="btn-sm" data-concluir="${s.id}">Marcar como Concluído</button>` : ''}
        <button class="btn-sm btn-danger" data-delete-bordado="${s.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  bordadosList.querySelectorAll('[data-concluir]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('solicitacoes_bordado').update({ status: 'concluido' }).eq('id', btn.dataset.concluir);
      loadBordados();
    });
  });
  bordadosList.querySelectorAll('[data-delete-bordado]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta solicitação?')) return;
      await supabase.from('solicitacoes_bordado').delete().eq('id', btn.dataset.deleteBordado);
      loadBordados();
    });
  });
}

// ---------- Solicitações de Revenda ----------
async function loadRevenda() {
  const { data, error } = await supabase.from('solicitacoes_revenda').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Erro ao carregar solicitações de revenda: ' + error.message, true); return; }
  updateBadge(revendaCount, (data || []).filter(s => s.status === 'novo').length);

  if (!data || data.length === 0) {
    revendaList.innerHTML = '';
    revendaEmptyState.style.display = 'block';
    return;
  }
  revendaEmptyState.style.display = 'none';

  revendaList.innerHTML = data.map(s => `
    <div class="message-card">
      <div class="message-card-header">
        <strong>${s.nome}</strong>
        <span>${new Date(s.created_at).toLocaleString('pt-BR')} · <span class="status-pill ${s.status === 'novo' ? 'pendente' : 'ativo'}">${s.status}</span></span>
      </div>
      <div class="message-card-contact"><span>${s.telefone}</span>${s.cidade ? `<span>${s.cidade}</span>` : ''}${s.tipo_negocio ? `<span>${s.tipo_negocio}</span>` : ''}</div>
      ${s.observacoes ? `<p>${s.observacoes}</p>` : ''}
      <div class="message-card-actions">
        ${s.status === 'novo' ? `<button class="btn-sm" data-contatado="${s.id}">Marcar como Contatado</button>` : ''}
        <button class="btn-sm btn-danger" data-delete-revenda="${s.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  revendaList.querySelectorAll('[data-contatado]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('solicitacoes_revenda').update({ status: 'contatado' }).eq('id', btn.dataset.contatado);
      loadRevenda();
    });
  });
  revendaList.querySelectorAll('[data-delete-revenda]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta solicitação?')) return;
      await supabase.from('solicitacoes_revenda').delete().eq('id', btn.dataset.deleteRevenda);
      loadRevenda();
    });
  });
}

// ---------- Mensagens recebidas pelo formulário "Fale Conosco" ----------
async function loadMessages() {
  const { data, error } = await supabase.from('mensagens_contato').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Erro ao carregar mensagens: ' + error.message, true); return; }
  updateBadge(messagesCount, (data || []).filter(m => !m.lida).length);

  if (!data || data.length === 0) {
    messagesList.innerHTML = '';
    messagesEmptyState.style.display = 'block';
    return;
  }
  messagesEmptyState.style.display = 'none';

  messagesList.innerHTML = data.map(msg => `
    <div class="message-card">
      <div class="message-card-header">
        <strong>${msg.nome}</strong>
        <span>${new Date(msg.created_at).toLocaleString('pt-BR')}</span>
      </div>
      <div class="message-card-contact">
        ${msg.email ? `<span>${msg.email}</span>` : ''}
        ${msg.telefone ? `<span>${msg.telefone}</span>` : ''}
      </div>
      <p>${msg.mensagem}</p>
      <div class="message-card-actions">
        ${!msg.lida ? `<button class="btn-sm" data-lida="${msg.id}">Marcar como Lida</button>` : ''}
        <button class="btn-sm btn-danger" data-delete-msg="${msg.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  messagesList.querySelectorAll('[data-lida]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await supabase.from('mensagens_contato').update({ lida: true }).eq('id', btn.dataset.lida);
      loadMessages();
    });
  });
  messagesList.querySelectorAll('[data-delete-msg]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta mensagem?')) return;
      await supabase.from('mensagens_contato').delete().eq('id', btn.dataset.deleteMsg);
      loadMessages();
    });
  });
}

// ---------- Importar Catálogo (upsert em lote dos produtos do print) ----------
const importCatalogoBtn = document.getElementById('importCatalogoBtn');
if (importCatalogoBtn) {
  importCatalogoBtn.addEventListener('click', async () => {
    const total = PRODUTOS_CATALOGO_SEED.length;
    if (!confirm(`Importar ${total} produtos do catálogo (patches, breves, kits, calçados, etc.)?\n\nProdutos com o mesmo código já cadastrado serão atualizados, os demais serão criados.`)) return;

    importCatalogoBtn.disabled = true;
    importCatalogoBtn.textContent = 'Importando...';
    try {
      const { data, error } = await supabase
        .from('produtos')
        .upsert(PRODUTOS_CATALOGO_SEED, { onConflict: 'codigo' })
        .select('id');
      if (error) throw error;
      showToast(`${data?.length ?? total} produtos importados com sucesso!`);
      loadProdutos();
      refreshBadgeCounts();
    } catch (err) {
      showToast('Erro ao importar catálogo: ' + err.message, true);
    } finally {
      importCatalogoBtn.disabled = false;
      importCatalogoBtn.textContent = 'Importar Catálogo';
    }
  });
}

// ---------- Toast ----------
let toastTimeout;
function showToast(msg, isError = false) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.style.display = 'block';
  toast.classList.add('show');
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.style.display = 'none'; }, 300);
  }, 3000);
}

checkSession();
