import { supabase, FOTOS_BUCKET, formatBRL, descricaoToHTML, sanitizeDescricao } from './supabase-client.js';
import { getGeminiKey, setGeminiKey, generateImovelFromText } from './gemini-ai.js';

// ---------- Elementos ----------
const loginWrap = document.getElementById('loginWrap');
const adminMain = document.getElementById('adminMain');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

const tabList = document.getElementById('tabList');
const tabNew = document.getElementById('tabNew');
const tabImport = document.getElementById('tabImport');
const tabPending = document.getElementById('tabPending');
const tabMessages = document.getElementById('tabMessages');
const panelList = document.getElementById('panelList');
const panelForm = document.getElementById('panelForm');
const panelImport = document.getElementById('panelImport');
const panelPending = document.getElementById('panelPending');
const panelMessages = document.getElementById('panelMessages');
const imoveisTableBody = document.getElementById('imoveisTableBody');
const emptyState = document.getElementById('emptyState');
const pendingTableBody = document.getElementById('pendingTableBody');
const pendingEmptyState = document.getElementById('pendingEmptyState');
const pendingCount = document.getElementById('pendingCount');
const messagesList = document.getElementById('messagesList');
const messagesEmptyState = document.getElementById('messagesEmptyState');
const messagesCount = document.getElementById('messagesCount');

const imovelForm = document.getElementById('imovelForm');
const formTitle = document.getElementById('formTitle');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const photoPreviewGrid = document.getElementById('photoPreviewGrid');
const uploadProgress = document.getElementById('uploadProgress');
const toast = document.getElementById('toast');
const ownerInfoBox = document.getElementById('ownerInfoBox');
const ownerInfoText = document.getElementById('ownerInfoText');
const pendingActions = document.getElementById('pendingActions');
const approveImovelBtn = document.getElementById('approveImovelBtn');
const rejectImovelBtn = document.getElementById('rejectImovelBtn');

const geminiApiKeyInput = document.getElementById('geminiApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const rawPropertyData = document.getElementById('rawPropertyData');
const generateAIBtn = document.getElementById('generateAIBtn');

let editingId = null;
let editingReturnTab = 'list'; // para onde voltar depois de salvar/cancelar (list ou pending)
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
  const raw = rawPropertyData.value.trim();
  if (!raw) {
    showToast('Cole as informações do imóvel no campo acima.', true);
    return;
  }

  generateAIBtn.disabled = true;
  const originalLabel = generateAIBtn.textContent;
  generateAIBtn.textContent = 'Gerando com IA...';

  try {
    const parsed = await generateImovelFromText(apiKey, raw);
    applyAIResult(parsed);
    showToast('Campos preenchidos automaticamente! Revise antes de salvar.');
  } catch (err) {
    showToast('Erro ao gerar com IA: ' + err.message, true);
  } finally {
    generateAIBtn.disabled = false;
    generateAIBtn.textContent = originalLabel;
  }
}

function applyAIResult(d) {
  if (d.codigo) imovelForm.codigo.value = d.codigo;
  if (d.titulo) imovelForm.titulo.value = d.titulo;
  if (d.finalidade === 'comprar' || d.finalidade === 'alugar') imovelForm.finalidade.value = d.finalidade;
  if (d.tipo) imovelForm.tipo.value = d.tipo;
  if (d.bairro) imovelForm.bairro.value = d.bairro;
  if (d.cidade) imovelForm.cidade.value = d.cidade;
  if (d.endereco) imovelForm.endereco.value = d.endereco;
  if (d.quartos !== undefined && d.quartos !== null) imovelForm.quartos.value = d.quartos;
  if (d.banheiros !== undefined && d.banheiros !== null) imovelForm.banheiros.value = d.banheiros;
  if (d.suites !== undefined && d.suites !== null) imovelForm.suites.value = d.suites;
  if (d.vagas !== undefined && d.vagas !== null) imovelForm.vagas.value = d.vagas;
  if (d.area) imovelForm.area.value = d.area;
  if (d.valor) imovelForm.valor.value = d.valor;
  if (d.valor_condominio) imovelForm.valor_condominio.value = d.valor_condominio;
  if (d.iptu && imovelForm.iptu) imovelForm.iptu.value = d.iptu;
  // A IA agora retorna a descrição em Markdown (###, ---, **negrito**, • listas);
  // descricaoToHTML() converte isso para o HTML que o editor rico exibe/edita.
  if (d.descricao) descricaoEditor.innerHTML = sanitizeDescricao(descricaoToHTML(d.descricao));
}

generateAIBtn.addEventListener('click', generateWithAI);
refreshApiKeyStatus();

// ---------- Importação em massa via CSV da Shopify ----------
const csvUploadZone = document.getElementById('csvUploadZone');
const csvFileInput = document.getElementById('csvFileInput');
const importStatus = document.getElementById('importStatus');
const importPreview = document.getElementById('importPreview');
const importCount = document.getElementById('importCount');
const importActivateCheck = document.getElementById('importActivateCheck');
const importPreviewList = document.getElementById('importPreviewList');
const importCancelBtn = document.getElementById('importCancelBtn');
const importConfirmBtn = document.getElementById('importConfirmBtn');

let pendingImportItems = []; // imóveis extraídos do CSV, aguardando confirmação

csvUploadZone.addEventListener('click', () => csvFileInput.click());
csvUploadZone.addEventListener('dragover', (e) => { e.preventDefault(); csvUploadZone.style.borderColor = 'var(--gold)'; });
csvUploadZone.addEventListener('dragleave', () => { csvUploadZone.style.borderColor = ''; });
csvUploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  csvUploadZone.style.borderColor = '';
  if (e.dataTransfer.files?.[0]) handleCsvFile(e.dataTransfer.files[0]);
});
csvFileInput.addEventListener('change', () => {
  if (csvFileInput.files?.[0]) handleCsvFile(csvFileInput.files[0]);
});

function setImportStatus(msg, isError = false) {
  importStatus.style.display = msg ? 'block' : 'none';
  importStatus.textContent = msg;
  importStatus.classList.toggle('error', isError);
}

function handleCsvFile(file) {
  if (typeof Papa === 'undefined') {
    showToast('Biblioteca de leitura de CSV não carregou. Recarregue a página e tente novamente.', true);
    return;
  }
  setImportStatus('Lendo e processando o arquivo CSV...');
  importPreview.style.display = 'none';

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        pendingImportItems = buildImoveisFromShopifyRows(results.data);
      } catch (err) {
        setImportStatus('Erro ao processar o CSV: ' + err.message, true);
        return;
      }
      if (pendingImportItems.length === 0) {
        setImportStatus('Nenhum produto encontrado no CSV. Verifique se é a exportação padrão de produtos da Shopify.', true);
        return;
      }
      setImportStatus('');
      renderImportPreview();
    },
    error: (err) => {
      setImportStatus('Erro ao ler o arquivo: ' + err.message, true);
    },
  });
}

// ---------- Mapeia as linhas do CSV da Shopify (agrupadas por "Handle") para o schema de imóveis ----------
function buildImoveisFromShopifyRows(rows) {
  const groups = new Map(); // Handle -> dados acumulados do produto

  for (const row of rows) {
    const handle = (row['Handle'] || '').trim();
    if (!handle) continue;

    if (!groups.has(handle)) {
      groups.set(handle, { handle, titulo: '', bodyHtml: '', preco: '', sku: '', fotos: [] });
    }
    const g = groups.get(handle);

    if (row['Title']?.trim()) g.titulo = row['Title'].trim();
    if (row['Body (HTML)']?.trim()) g.bodyHtml = row['Body (HTML)'].trim();
    if (row['Variant Price']?.trim()) g.preco = row['Variant Price'].trim();
    if (row['Variant SKU']?.trim() && !g.sku) g.sku = row['Variant SKU'].trim();
    const imgSrc = row['Image Src']?.trim();
    if (imgSrc && !g.fotos.includes(imgSrc)) g.fotos.push(imgSrc);
  }

  const items = [];
  let n = 1;
  for (const g of groups.values()) {
    if (!g.titulo) continue; // linha sem produto de verdade (ex: só imagem órfã)

    const plainText = `${g.titulo} ${g.bodyHtml.replace(/<[^>]*>/g, ' ')}`;
    const codigo = slugToCodigo(g.sku || g.handle || `IMP-${n}`);

    items.push({
      codigo,
      titulo: g.titulo,
      descricao: sanitizeDescricao(g.bodyHtml || ''),
      finalidade: /alugu[ei]l|alugar|loca[çc][ãa]o/i.test(plainText) ? 'alugar' : 'comprar',
      tipo: detectTipo(plainText),
      bairro: detectBairro(g.titulo),
      cidade: '',
      endereco: '',
      quartos: extractNumber(plainText, /(\d+)\s*(?:quartos?|dormit[oó]rios?|dorms?)/i),
      banheiros: extractNumber(plainText, /(\d+)\s*banheiros?/i),
      suites: extractNumber(plainText, /(\d+)\s*su[ií]tes?/i),
      vagas: extractNumber(plainText, /(\d+)\s*vagas?/i),
      area: extractNumber(plainText, /(\d+(?:[.,]\d+)?)\s*m(?:²|2)\b/i, true),
      valor: g.preco ? Number(g.preco.replace(',', '.')) || null : null,
      valor_condominio: null,
      iptu: null,
      video_url: '',
      fotos: g.fotos,
      destaque: false,
      _excluded: false,
    });
    n++;
  }
  return items;
}

function slugToCodigo(str) {
  return str.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `IMP-${Date.now()}`;
}

function detectTipo(text) {
  if (/cobertura/i.test(text)) return 'Cobertura';
  if (/\bcasa\b|sobrado/i.test(text)) return 'Casa';
  if (/terreno|lote\b/i.test(text)) return 'Terreno';
  if (/comercial|sala comercial|loja\b|galp[aã]o/i.test(text)) return 'Comercial';
  return 'Apartamento';
}

function detectBairro(title) {
  const m = title.match(/\b(?:em|no|na)\s+([A-ZÀ-Ú][\wÀ-ú]+(?:\s[A-ZÀ-Ú][\wÀ-ú]+){0,2})/);
  return m ? m[1].trim() : '';
}

function extractNumber(text, regex, isFloat = false) {
  const m = text.match(regex);
  if (!m) return isFloat ? null : 0;
  const raw = m[1].replace(',', '.');
  const num = isFloat ? parseFloat(raw) : parseInt(raw, 10);
  return Number.isNaN(num) ? (isFloat ? null : 0) : num;
}

function renderImportPreview() {
  const visibleItems = pendingImportItems.filter(i => !i._excluded);
  importCount.textContent = `${visibleItems.length} imóvel(is) pronto(s) para importar`;

  importPreviewList.innerHTML = pendingImportItems.map((item, idx) => `
    <div class="import-item ${item._excluded ? 'excluded' : ''}" data-idx="${idx}">
      <div class="import-item-photo">
        ${item.fotos[0] ? `<img src="${item.fotos[0]}" alt="">` : '<span>Sem foto</span>'}
      </div>
      <div class="import-item-body">
        <strong>${item.titulo}</strong>
        <span>${item.codigo} · ${item.tipo} · ${item.fotos.length} foto(s)${item.bairro ? ' · ' + item.bairro : ''}</span>
        <span>${formatBRL(item.valor)}</span>
      </div>
      <button type="button" class="btn-sm import-toggle" data-idx="${idx}">${item._excluded ? 'Incluir' : 'Remover'}</button>
    </div>
  `).join('');

  importPreviewList.querySelectorAll('.import-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      pendingImportItems[idx]._excluded = !pendingImportItems[idx]._excluded;
      renderImportPreview();
    });
  });

  importPreview.style.display = 'block';
}

importCancelBtn.addEventListener('click', () => {
  pendingImportItems = [];
  importPreview.style.display = 'none';
  csvFileInput.value = '';
  setImportStatus('');
});

// Garante que nenhum "codigo" se repita dentro do lote: o CSV da Shopify pode gerar
// códigos colididos (ex: dois handles diferentes que, depois de normalizados, viram
// o mesmo texto). Um UPSERT com o mesmo valor de conflito duas vezes no mesmo lote
// falha no Postgres ("ON CONFLICT DO UPDATE command cannot affect row a second time"),
// então aqui garantimos unicidade adicionando um sufixo -2, -3... quando necessário.
function ensureUniqueCodigos(rows) {
  const seen = new Map();
  return rows.map((row) => {
    const base = row.codigo;
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    if (count === 0) return row;
    return { ...row, codigo: `${base}-${count + 1}` };
  });
}

importConfirmBtn.addEventListener('click', async () => {
  const rows = ensureUniqueCodigos(
    pendingImportItems
      .filter(i => !i._excluded)
      .map(({ _excluded, ...item }) => ({
        ...item,
        status: importActivateCheck.checked ? 'ativo' : 'inativo',
      }))
  );

  if (rows.length === 0) {
    showToast('Nenhum imóvel selecionado para importar.', true);
    return;
  }

  importConfirmBtn.disabled = true;
  const originalLabel = importConfirmBtn.textContent;

  // Envia um de cada vez (em vez de um único .upsert(array)) para evitar qualquer
  // conflito de chave duplicada dentro do mesmo lote e para não perder tudo caso
  // um único imóvel tenha um dado inválido — os demais continuam sendo importados.
  let success = 0;
  const failures = [];
  for (let i = 0; i < rows.length; i++) {
    importConfirmBtn.textContent = `Importando ${i + 1}/${rows.length}...`;
    const { error } = await supabase.from('imoveis').upsert(rows[i], { onConflict: 'codigo' });
    if (error) {
      failures.push(`${rows[i].codigo}: ${error.message}`);
    } else {
      success++;
    }
  }

  importConfirmBtn.disabled = false;
  importConfirmBtn.textContent = originalLabel;

  if (failures.length > 0) {
    console.error('Falhas na importação:', failures);
    showToast(`${success} imóvel(is) importado(s). ${failures.length} falharam — veja o console para detalhes.`, failures.length === rows.length);
  } else {
    showToast(`${success} imóvel(is) importado(s) com sucesso!`);
  }

  if (success > 0) {
    pendingImportItems = [];
    importPreview.style.display = 'none';
    csvFileInput.value = '';
    switchTab('list');
  }
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
  refreshBadgeCounts();
}

// Atualiza os números nas abas "Anúncios Pendentes" e "Mensagens" sem precisar entrar nelas
async function refreshBadgeCounts() {
  const [{ count: pending }, { count: messages }] = await Promise.all([
    supabase.from('imoveis').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('mensagens_contato').select('id', { count: 'exact', head: true }),
  ]);
  updateBadge(pendingCount, pending || 0);
  updateBadge(messagesCount, messages || 0);
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
tabImport.addEventListener('click', () => switchTab('import'));
tabPending.addEventListener('click', () => switchTab('pending'));
tabMessages.addEventListener('click', () => switchTab('messages'));
cancelEditBtn.addEventListener('click', () => switchTab(editingReturnTab));

function switchTab(tab) {
  tabList.classList.toggle('active', tab === 'list');
  tabNew.classList.toggle('active', tab === 'form');
  tabImport.classList.toggle('active', tab === 'import');
  tabPending.classList.toggle('active', tab === 'pending');
  tabMessages.classList.toggle('active', tab === 'messages');
  panelList.classList.toggle('active', tab === 'list');
  panelForm.classList.toggle('active', tab === 'form');
  panelImport.classList.toggle('active', tab === 'import');
  panelPending.classList.toggle('active', tab === 'pending');
  panelMessages.classList.toggle('active', tab === 'messages');
  if (tab === 'form' && !editingId) {
    editingReturnTab = 'list';
    resetForm();
  }
  if (tab === 'list') {
    loadImoveis();
  }
  if (tab === 'pending') {
    loadPendingImoveis();
  }
  if (tab === 'messages') {
    loadMessages();
  }
}

// ---------- Listagem (ordenável, com edição inline e ações em massa) ----------
const bulkActionsBar = document.getElementById('bulkActionsBar');
const bulkSelectedCount = document.getElementById('bulkSelectedCount');
const bulkAtivarBtn = document.getElementById('bulkAtivarBtn');
const bulkArquivarBtn = document.getElementById('bulkArquivarBtn');
const bulkExcluirBtn = document.getElementById('bulkExcluirBtn');
const selectAllImoveis = document.getElementById('selectAllImoveis');

let imoveisCache = [];
let imoveisSort = { field: null, dir: 'asc' };
const selectedIds = new Set();

async function loadImoveis() {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Erro ao carregar imóveis: ' + error.message, true);
    return;
  }

  imoveisCache = data || [];
  selectedIds.clear();
  renderImoveisTable();
}

function sortedImoveis() {
  const { field, dir } = imoveisSort;
  if (!field) return imoveisCache;
  const mult = dir === 'asc' ? 1 : -1;
  return [...imoveisCache].sort((a, b) => {
    let va = a[field], vb = b[field];
    if (field === 'valor') { va = Number(va) || 0; vb = Number(vb) || 0; }
    else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase(); }
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}

function renderImoveisTable() {
  const list = sortedImoveis();

  if (list.length === 0) {
    imoveisTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    updateBulkBar();
    return;
  }
  emptyState.style.display = 'none';

  imoveisTableBody.innerHTML = list.map(im => `
    <tr data-row="${im.id}">
      <td class="col-check"><input type="checkbox" class="row-check" data-id="${im.id}" ${selectedIds.has(im.id) ? 'checked' : ''}></td>
      <td class="col-codigo"><input type="text" class="inline-edit" data-id="${im.id}" data-field="codigo" value="${(im.codigo || '').replace(/"/g, '&quot;')}"></td>
      <td class="col-titulo"><input type="text" class="inline-edit" data-id="${im.id}" data-field="titulo" value="${(im.titulo || '').replace(/"/g, '&quot;')}"></td>
      <td class="col-finalidade">
        <select class="inline-edit" data-id="${im.id}" data-field="finalidade">
          <option value="comprar" ${im.finalidade !== 'alugar' ? 'selected' : ''}>Comprar</option>
          <option value="alugar" ${im.finalidade === 'alugar' ? 'selected' : ''}>Alugar</option>
        </select>
      </td>
      <td class="col-valor"><input type="number" step="0.01" class="inline-edit" data-id="${im.id}" data-field="valor" value="${im.valor ?? ''}"></td>
      <td><span class="status-pill ${im.status}">${im.status}</span></td>
      <td class="actions">
        <button class="btn-sm" data-edit="${im.id}">Editar</button>
        <button class="btn-sm" data-archive="${im.id}">Arquivar</button>
        <button class="btn-sm btn-danger" data-delete="${im.id}">Excluir</button>
      </td>
    </tr>
  `).join('');

  imoveisTableBody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editImovel(btn.dataset.edit, imoveisCache));
  });
  imoveisTableBody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteImovel(btn.dataset.delete));
  });
  imoveisTableBody.querySelectorAll('[data-archive]').forEach(btn => {
    btn.addEventListener('click', () => archiveImoveis([btn.dataset.archive]));
  });
  imoveisTableBody.querySelectorAll('.inline-edit').forEach(el => {
    const evt = el.tagName === 'SELECT' ? 'change' : 'blur';
    el.addEventListener(evt, () => saveInlineField(el));
    if (el.tagName !== 'SELECT') {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
    }
  });
  imoveisTableBody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedIds.add(cb.dataset.id);
      else selectedIds.delete(cb.dataset.id);
      updateBulkBar();
    });
  });

  updateBulkBar();
  updateSortHeaders();
}

// Clique nos cabeçalhos ordenáveis (crescente / decrescente alternando)
document.querySelectorAll('.imoveis-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;
    if (imoveisSort.field === field) {
      imoveisSort.dir = imoveisSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      imoveisSort = { field, dir: 'asc' };
    }
    renderImoveisTable();
  });
});

function updateSortHeaders() {
  document.querySelectorAll('.imoveis-table th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === imoveisSort.field) {
      th.classList.add(imoveisSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });
}

// Edição inline (código, título, finalidade, valor) direto na tabela
async function saveInlineField(el) {
  const id = el.dataset.id;
  const field = el.dataset.field;
  let value = el.value;
  if (field === 'valor') value = value === '' ? null : Number(value);
  if (field === 'codigo' || field === 'titulo') value = value.trim();

  const im = imoveisCache.find(i => i.id === id);
  if (im && im[field] === value) return; // nada mudou

  const { error } = await supabase.from('imoveis').update({ [field]: value }).eq('id', id);
  if (error) {
    showToast('Erro ao salvar: ' + error.message, true);
    return;
  }
  if (im) im[field] = value;
  el.classList.add('saved');
  setTimeout(() => el.classList.remove('saved'), 900);
}

// Seleção em massa
if (selectAllImoveis) {
  selectAllImoveis.addEventListener('change', () => {
    const list = sortedImoveis();
    if (selectAllImoveis.checked) {
      list.forEach(im => selectedIds.add(im.id));
    } else {
      selectedIds.clear();
    }
    renderImoveisTable();
  });
}

function updateBulkBar() {
  const count = selectedIds.size;
  if (bulkActionsBar) bulkActionsBar.style.display = count > 0 ? 'flex' : 'none';
  if (bulkSelectedCount) bulkSelectedCount.textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
  if (selectAllImoveis) {
    const list = sortedImoveis();
    selectAllImoveis.checked = list.length > 0 && list.every(im => selectedIds.has(im.id));
  }
}

async function archiveImoveis(ids) {
  const { error } = await supabase.from('imoveis').update({ status: 'arquivado' }).in('id', ids);
  if (error) {
    showToast('Erro ao arquivar: ' + error.message, true);
    return;
  }
  showToast(ids.length > 1 ? 'Imóveis arquivados.' : 'Imóvel arquivado.');
  ids.forEach(id => selectedIds.delete(id));
  loadImoveis();
}

async function ativarImoveis(ids) {
  const { error } = await supabase.from('imoveis').update({ status: 'ativo' }).in('id', ids);
  if (error) {
    showToast('Erro ao ativar: ' + error.message, true);
    return;
  }
  showToast(ids.length > 1 ? 'Imóveis ativados.' : 'Imóvel ativado.');
  ids.forEach(id => selectedIds.delete(id));
  loadImoveis();
}

async function deleteImoveis(ids) {
  const msg = ids.length > 1
    ? `Tem certeza que deseja excluir ${ids.length} imóveis? Essa ação não pode ser desfeita.`
    : 'Tem certeza que deseja excluir este imóvel? Essa ação não pode ser desfeita.';
  if (!confirm(msg)) return;
  const { error } = await supabase.from('imoveis').delete().in('id', ids);
  if (error) {
    showToast('Erro ao excluir: ' + error.message, true);
    return;
  }
  showToast(ids.length > 1 ? 'Imóveis excluídos.' : 'Imóvel excluído.');
  ids.forEach(id => selectedIds.delete(id));
  loadImoveis();
}

async function deleteImovel(id) {
  deleteImoveis([id]);
}

if (bulkAtivarBtn) bulkAtivarBtn.addEventListener('click', () => ativarImoveis([...selectedIds]));
if (bulkArquivarBtn) bulkArquivarBtn.addEventListener('click', () => archiveImoveis([...selectedIds]));
if (bulkExcluirBtn) bulkExcluirBtn.addEventListener('click', () => deleteImoveis([...selectedIds]));

function fillFormWithImovel(im) {
  editingId = im.id;

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
  imovelForm.iptu.value = im.iptu || '';
  imovelForm.video_url.value = im.video_url || '';
  descricaoEditor.innerHTML = descricaoToHTML(im.descricao || '');
  imovelForm.destaque.checked = !!im.destaque;
  imovelForm.status.value = im.status || 'ativo';

  currentPhotos = Array.isArray(im.fotos) ? [...im.fotos] : [];
  renderPhotoPreviews();
}

function editImovel(id, list) {
  const im = list.find(i => i.id === id);
  if (!im) return;
  formTitle.textContent = 'Editar Imóvel';
  editingReturnTab = 'list';
  ownerInfoBox.style.display = 'none';
  pendingActions.style.display = 'none';
  fillFormWithImovel(im);
  switchTab('form');
}

function editPendingImovel(id, list) {
  const im = list.find(i => i.id === id);
  if (!im) return;
  formTitle.textContent = 'Revisar Anúncio Pendente';
  editingReturnTab = 'pending';
  fillFormWithImovel(im);

  const contatoPartes = [];
  if (im.proprietario_nome) contatoPartes.push(im.proprietario_nome);
  if (im.proprietario_telefone) contatoPartes.push(im.proprietario_telefone);
  if (im.proprietario_email) contatoPartes.push(im.proprietario_email);
  ownerInfoText.textContent = contatoPartes.length > 0 ? contatoPartes.join(' · ') : 'Nenhum dado de contato informado.';
  ownerInfoBox.style.display = 'block';
  pendingActions.style.display = 'flex';

  switchTab('form');
}

approveImovelBtn.addEventListener('click', async () => {
  if (!editingId) return;
  approveImovelBtn.disabled = true;
  const { error } = await supabase.from('imoveis').update({ status: 'ativo' }).eq('id', editingId);
  approveImovelBtn.disabled = false;
  if (error) {
    showToast('Erro ao aprovar: ' + error.message, true);
    return;
  }
  showToast('Imóvel aprovado e publicado no site!');
  editingId = null;
  switchTab('pending');
});

rejectImovelBtn.addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Recusar e excluir este anúncio? Essa ação não pode ser desfeita.')) return;
  const { error } = await supabase.from('imoveis').delete().eq('id', editingId);
  if (error) {
    showToast('Erro ao excluir: ' + error.message, true);
    return;
  }
  showToast('Anúncio recusado e removido.');
  editingId = null;
  switchTab('pending');
});

// ---------- Anúncios pendentes (enviados pela página pública "Anunciar Seu Imóvel") ----------
async function loadPendingImoveis() {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Erro ao carregar anúncios pendentes: ' + error.message, true);
    return;
  }

  updateBadge(pendingCount, data?.length || 0);

  if (!data || data.length === 0) {
    pendingTableBody.innerHTML = '';
    pendingEmptyState.style.display = 'block';
    return;
  }
  pendingEmptyState.style.display = 'none';

  pendingTableBody.innerHTML = data.map(im => `
    <tr>
      <td>${im.titulo}</td>
      <td>${im.finalidade === 'alugar' ? 'Alugar' : 'Comprar'}</td>
      <td>${im.proprietario_nome || '—'}</td>
      <td>${im.proprietario_telefone || '—'}</td>
      <td class="actions">
        <button class="btn-sm" data-view="${im.id}">Ver Ficha</button>
      </td>
    </tr>
  `).join('');

  pendingTableBody.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => editPendingImovel(btn.dataset.view, data));
  });
}

// ---------- Mensagens recebidas pelo formulário "Fale Conosco" ----------
async function loadMessages() {
  const { data, error } = await supabase
    .from('mensagens_contato')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Erro ao carregar mensagens: ' + error.message, true);
    return;
  }

  updateBadge(messagesCount, data?.length || 0);

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
      <button class="btn-sm" data-delete-msg="${msg.id}">Excluir</button>
    </div>
  `).join('');

  messagesList.querySelectorAll('[data-delete-msg]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir esta mensagem?')) return;
      const { error: delError } = await supabase.from('mensagens_contato').delete().eq('id', btn.dataset.deleteMsg);
      if (delError) {
        showToast('Erro ao excluir: ' + delError.message, true);
        return;
      }
      loadMessages();
    });
  });
}

function updateBadge(el, count) {
  el.textContent = count > 0 ? count : '';
}

// ---------- Formulário: criar/editar ----------
function resetForm() {
  editingId = null;
  editingReturnTab = 'list';
  formTitle.textContent = 'Novo Imóvel';
  imovelForm.reset();
  descricaoEditor.innerHTML = '';
  currentPhotos = [];
  renderPhotoPreviews();
  rawPropertyData.value = '';
  ownerInfoBox.style.display = 'none';
  pendingActions.style.display = 'none';
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
    iptu: fd.get('iptu') ? Number(fd.get('iptu')) : null,
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
  editingId = null;
  switchTab(editingReturnTab);
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
