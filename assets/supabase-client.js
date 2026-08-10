// Cliente Supabase compartilhado + funções auxiliares — QRV Artigos Táticos
// Usado por todas as páginas públicas e pelo admin.html (via <script type="module">)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ SUBSTITUA pelos dados do SEU projeto Supabase (Project Settings > API).
// Este projeto precisa ser NOVO e separado do projeto usado na MCJ Capital Invest.
const SUPABASE_URL = 'https://aixudpelpjyuwpsocikk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iSrtlIBmWaNKjSpxLPLo7g_ERGZtJ22';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const FOTOS_BUCKET = 'produtos-fotos';

// ⚠️ SUBSTITUA pelo número de WhatsApp da loja (com DDI+DDD, só números).
export const WHATSAPP_NUMERO = '5511993217675';

// ---------- Formatação ----------
export function formatBRL(value) {
  if (value === null || value === undefined || value === '') return 'Consulte o valor';
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return 'Consulte o valor';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function labelCategoria(cat) {
  const map = {
    vestuario: 'Vestuário e Fardamento',
    calcados: 'Calçados Militares',
    mochilas: 'Mochilas e Bolsas',
    insignias: 'Brevês, Insígnias e Bordados',
    protecao: 'Proteção e Defesa Pessoal',
    facas: 'Facas e Canivetes',
    kits: 'Kits Especializados',
    acessorios: 'Acessórios Táticos',
    replicas: 'Réplicas Decorativas',
  };
  return map[cat] || cat;
}

export function whatsappLink(produto) {
  const texto = produto
    ? `Olá! Tenho interesse no produto *${produto.titulo}* (código ${produto.codigo}) que vi no site da QRV Artigos Táticos.`
    : 'Olá! Vim pelo site da QRV Artigos Táticos e gostaria de mais informações.';
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(texto)}`;
}

// ---------- Configurações do site (tabela site_config: chave/valor) ----------
// Usado para guardar a chave da API do Gemini do chat "Recruta QRV" — assim
// ela é editável direto no Admin (aba de produtos) sem precisar mexer em
// código nem fazer commit/redeploy. A tabela tem leitura pública (o widget
// de chat roda em páginas públicas, sem login) e escrita restrita ao admin
// via RLS — rode supabase-site-config.sql uma vez no SQL Editor para criá-la.
export async function getSiteConfig(chave) {
  const { data, error } = await supabase.from('site_config').select('valor').eq('chave', chave).maybeSingle();
  if (error || !data) return '';
  return data.valor || '';
}

export async function setSiteConfig(chave, valor) {
  return supabase.from('site_config').upsert({ chave, valor }, { onConflict: 'chave' });
}

// ---------- Busca lista de produtos ativos (com filtros opcionais) ----------
export async function fetchProdutos({ categoria, corporacao, destaque, limit, precoMax, busca, codigo } = {}) {
  let query = supabase.from('produtos').select('*').eq('status', 'ativo').order('created_at', { ascending: false });
  if (categoria) query = query.eq('categoria', categoria);
  if (corporacao) query = query.eq('corporacao', corporacao);
  if (destaque !== undefined) query = query.eq('destaque', destaque);
  if (precoMax) query = query.lte('preco', precoMax);
  if (codigo) query = query.ilike('codigo', `%${codigo}%`);
  if (busca) query = query.ilike('titulo', `%${busca}%`);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar produtos:', error.message);
    return [];
  }
  return data || [];
}

// ---------- Busca um produto específico pelo código ----------
export async function fetchProdutoByCodigo(codigo) {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('codigo', codigo)
    .eq('status', 'ativo')
    .maybeSingle();
  if (error) {
    console.error('Erro ao buscar produto:', error.message);
    return null;
  }
  return data;
}

// ---------- Envia fotos para o bucket público (usado no admin) ----------
export async function uploadFotos(files) {
  const urls = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(FOTOS_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: pub } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
    urls.push(pub.publicUrl);
  }
  return urls;
}

// ---------- Formulário "Fale Conosco" ----------
export async function submitMensagemContato({ nome, email, telefone, mensagem }) {
  const { error } = await supabase.from('mensagens_contato').insert({ nome, email, telefone, mensagem });
  if (error) throw error;
}

// ---------- Formulário de solicitação de bordado/personalização ----------
export async function submitSolicitacaoBordado({ nome, telefone, tipo_peca, o_que_bordar, observacoes }) {
  const { error } = await supabase.from('solicitacoes_bordado').insert({ nome, telefone, tipo_peca, o_que_bordar, observacoes });
  if (error) throw error;
}

// ---------- Formulário "Seja um Revendedor" ----------
export async function submitSolicitacaoRevenda({ nome, telefone, cidade, tipo_negocio, observacoes }) {
  const { error } = await supabase.from('solicitacoes_revenda').insert({ nome, telefone, cidade, tipo_negocio, observacoes });
  if (error) throw error;
}

// ---------- Descrição: converte Markdown (ou texto puro) em HTML, e sanitiza antes de exibir ----------

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return escapeHTML(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Converte a descrição gerada pela IA (ou digitada manualmente) em HTML elegante:
// - "### Título" ou "#### Título"  -> <h3>/<h4>
// - "---" (linha só de traços)     -> <hr class="divider">
// - "**palavra**"                  -> <strong>
// - linhas começando com "•", "-" ou "*" -> <ul><li>
// - linhas em branco separam parágrafos <p>
export function markdownToHTML(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const htmlParts = [];
  let paragraphBuffer = [];
  let listBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      htmlParts.push(`<p>${inlineMarkdown(paragraphBuffer.join(' '))}</p>`);
      paragraphBuffer = [];
    }
  }
  function flushList() {
    if (listBuffer.length) {
      htmlParts.push(`<ul>${listBuffer.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
      listBuffer = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length >= 4 ? 4 : 3;
      htmlParts.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^-{3,}$/.test(line) || /^—{3,}$/.test(line)) {
      flushParagraph();
      flushList();
      htmlParts.push('<hr class="divider">');
      continue;
    }

    const bulletMatch = line.match(/^[•*-]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }
  flushParagraph();
  flushList();

  return htmlParts.join('');
}

export function descricaoToHTML(raw) {
  if (!raw) return '';
  const looksLikeHTML = /<\/?(p|h[1-6]|ul|ol|li|strong|b|em|i|hr|br|span|a)[\s>]/i.test(raw);
  if (looksLikeHTML) return raw;
  return markdownToHTML(raw);
}

export function sanitizeDescricao(html) {
  if (typeof window !== 'undefined' && window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'hr', 'span', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  }
  return html
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '');
}

// Gera um número "restam em estoque" pseudo-aleatório mas estável por produto,
// só para efeito visual de urgência na vitrine (não reflete estoque real).
function estoqueRestante(codigo) {
  let hash = 0;
  for (let i = 0; i < (codigo || '').length; i++) hash = (hash * 31 + codigo.charCodeAt(i)) >>> 0;
  return 2 + (hash % 8); // entre 2 e 9
}

// ---------- Card HTML reutilizável (grade da loja, destaques) ----------
export function productCardHTML(produto, opts = {}) {
  const { showFreteBadge = false, showStock = false, buyLabel = 'Comprar' } = opts;
  const fotos = Array.isArray(produto.fotos) ? produto.fotos.filter(Boolean) : [];
  const capa = fotos[0] || null;
  const temPromo = produto.preco_promocional && Number(produto.preco_promocional) < Number(produto.preco);
  const precoFinal = temPromo ? produto.preco_promocional : produto.preco;
  const estoqueLabel = { disponivel: 'Disponível', sob_encomenda: 'Sob Encomenda', esgotado: 'Esgotado' }[produto.estoque_status] || '';
  const esgotado = produto.estoque_status === 'esgotado';

  const mediaHTML = capa
    ? `<img src="${capa}" alt="${produto.titulo}" loading="lazy">`
    : `<div class="ph-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>Foto em breve</div>`;

  const produtoJSON = JSON.stringify({
    codigo: produto.codigo,
    titulo: produto.titulo,
    preco: produto.preco,
    preco_promocional: produto.preco_promocional || null,
    fotos: capa ? [capa] : [],
  }).replace(/"/g, '&quot;');

  const parcelas = precoFinal >= 20 ? `<span class="installments">ou 3x de ${formatBRL(precoFinal / 3)} sem juros</span>` : '';
  const stockHTML = showStock && !esgotado ? `<span class="stock-warning">Só restam ${estoqueRestante(produto.codigo)} em estoque!</span>` : '';

  return `
    <article class="product-card" data-cat="${produto.categoria}">
      <a href="produto.html?codigo=${encodeURIComponent(produto.codigo)}">
        <div class="product-photo">
          ${showFreteBadge ? '<span class="badge frete">Frete Grátis</span>' : `<span class="badge">${labelCategoria(produto.categoria)}</span>`}
          ${produto.destaque && !showFreteBadge ? '<span class="badge op">Destaque</span>' : ''}
          ${esgotado ? '<span class="badge esgotado">Esgotado</span>' : ''}
          ${mediaHTML}
        </div>
        <div class="product-body">
          <h3>${produto.titulo}</h3>
          <p class="loc">${produto.corporacao || ''}${estoqueLabel ? ' · ' + estoqueLabel : ''}</p>
          <div class="product-price">
            ${temPromo ? `<span class="price-old">${formatBRL(produto.preco)}</span>` : ''}
            ${formatBRL(precoFinal)}
          </div>
          ${parcelas}
          ${stockHTML}
        </div>
      </a>
      <button type="button" class="btn-add-cart add-to-cart-btn" data-produto="${produtoJSON}" ${esgotado ? 'disabled' : ''}>
        ${esgotado ? 'Esgotado' : buyLabel}
      </button>
    </article>
  `;
}

// ---------- Placeholder de imagem (SVG em data-URI) para os exemplos da galeria ----------
export function placeholderPhoto(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%' height='100%' fill='#1a1c14'/><text x='50%' y='50%' fill='#a3a396' font-size='30' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
