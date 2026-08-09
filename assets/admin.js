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
const tabImport = document.getElementById('tabImport');
const panelList = document.getElementById('panelList');
const panelForm = document.getElementById('panelForm');
const panelImport = document.getElementById('panelImport');
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

const geminiApiKeyInput = document.getElementById('geminiApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const rawPropertyData = document.getElementById('rawPropertyData');
const generateAIBtn = document.getElementById('generateAIBtn');

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

// ---------- IA: Preenchimento automático (Google Gemini 1.5 Flash) ----------
const GEMINI_KEY_STORAGE = 'mcj_gemini_api_key';

function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
}

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
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
  refreshApiKeyStatus();
  showToast('Chave da API salva neste navegador.');
});

function buildAIPrompt(raw) {
  return `Você é um assistente que transforma anúncios informais de imóveis de alto padrão (geralmente copiados do WhatsApp) em dados estruturados para o site da imobiliária MCJ Capital Invest.

Analise o texto abaixo e retorne SOMENTE um objeto JSON válido (sem markdown, sem crases, sem texto fora do JSON), com exatamente estas chaves:

{
  "codigo": string (código/referência do imóvel, se houver no texto; senão ""),
  "titulo": string (título comercial atrativo, ex: "Apartamento Ultra Luxo no Jardins"),
  "finalidade": "comprar" ou "alugar",
  "tipo": um destes valores exatamente — "Apartamento", "Casa", "Cobertura", "Comercial" ou "Terreno",
  "bairro": string,
  "cidade": string (ex: "São Paulo - SP"),
  "endereco": string (endereço completo se houver; senão bairro + cidade),
  "quartos": number,
  "banheiros": number,
  "suites": number,
  "vagas": number,
  "area": number (em m², apenas o número),
  "valor": number (valor de venda/aluguel, apenas números, sem "R$" ou pontos),
  "valor_condominio": number (apenas números, 0 se não informado),
  "iptu": number (valor do IPTU, apenas números, 0 se não informado),
  "descricao": string em HTML rico, usando as tags <h3>, <p>, <strong>, <ul>, <li> e <hr> para organizar seções como "Sobre o Imóvel" e "Características" (em lista). Não inclua <html>, <head> ou <body>, apenas o conteúdo interno.
}

Se alguma informação não estiver no texto, use 0 para números e "" para textos — nunca invente dados que não estejam no texto original.

Texto bruto colado pelo usuário:
"""
${raw}
"""`;
}

// Lista de modelos a tentar, em ordem de preferência. "gemini-flash-latest" é um
// alias oficial do Google que sempre aponta para o modelo Flash estável mais
// recente — evita que o recurso quebre de novo quando um modelo específico
// (ex: gemini-1.5-flash, gemini-2.5-flash) for desativado no futuro. Os nomes
// fixos abaixo entram como reserva, caso o alias falhe por algum motivo.
const GEMINI_MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash'];

async function callGemini(apiKey, prompt) {
  let lastError;
  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        lastError = new Error(data.error?.message || `Erro na API do Gemini (modelo ${model})`);
        // Se o erro for "modelo não encontrado/indisponível", tenta o próximo da lista.
        const msg = (data.error?.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('not supported') || msg.includes('no longer available') || msg.includes('deprecated')) {
          continue;
        }
        throw lastError; // outros erros (ex: chave inválida) não valem a pena tentar de novo
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error('A IA não retornou nenhum conteúdo.');
        continue;
      }
      return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Nenhum modelo do Gemini respondeu.');
}

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
    const text = await callGemini(apiKey, buildAIPrompt(raw));
    const parsed = JSON.parse(text);
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
  if (d.descricao) descricaoEditor.innerHTML = sanitizeDescricao(d.descricao);
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
cancelEditBtn.addEventListener('click', () => switchTab('list'));

function switchTab(tab) {
  tabList.classList.toggle('active', tab === 'list');
  tabNew.classList.toggle('active', tab === 'form');
  tabImport.classList.toggle('active', tab === 'import');
  panelList.classList.toggle('active', tab === 'list');
  panelForm.classList.toggle('active', tab === 'form');
  panelImport.classList.toggle('active', tab === 'import');
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
  imovelForm.iptu.value = im.iptu || '';
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
  rawPropertyData.value = '';
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
