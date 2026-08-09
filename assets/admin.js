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
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildAIPrompt(raw) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      }
    );
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Erro na API do Gemini');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('A IA não retornou nenhum conteúdo.');

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
