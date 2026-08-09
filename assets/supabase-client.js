// Cliente Supabase compartilhado + funções auxiliares
// Usado por index.html, imovel.html e admin.html (via <script type="module">)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zmvxmsvbvuiikxsuxoxl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OoqjA-L-EBDy6sYcJlRZew_J-f1LHnF';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const FOTOS_BUCKET = 'imoveis-fotos';

// ---------- Formatação ----------
export function formatBRL(value) {
  if (value === null || value === undefined || value === '') return 'Consulte valores';
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return 'Consulte valores';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------- Vídeo: transforma link do YouTube/Vimeo em URL de embed ----------
export function videoEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // YouTube: youtu.be/ID  ou  youtube.com/watch?v=ID  ou  youtube.com/embed/ID
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '');
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return url;
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo: vimeo.com/ID
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}

// ---------- Mapa: gera URL de embed do Google Maps sem precisar de API key ----------
export function mapsEmbedUrl(query) {
  const q = encodeURIComponent(query || 'São Paulo, SP');
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

// ---------- Busca lista de imóveis ativos (com filtro opcional de finalidade / destaque) ----------
export async function fetchImoveis({ finalidade, destaque, limit } = {}) {
  let query = supabase.from('imoveis').select('*').eq('status', 'ativo').order('created_at', { ascending: false });
  if (finalidade) query = query.eq('finalidade', finalidade);
  if (destaque !== undefined) query = query.eq('destaque', destaque);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar imóveis:', error.message);
    return [];
  }
  return data || [];
}

// ---------- Envia fotos para o bucket público (usado no admin e no formulário público de anúncio) ----------
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

// ---------- Envia um imóvel público para aprovação (fica com status "pendente", invisível na busca) ----------
export async function submitImovelParaAprovacao(payload) {
  const codigo = `PEND-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await supabase.from('imoveis').insert({
    ...payload,
    codigo,
    status: 'pendente',
    destaque: false,
  });
  if (error) throw error;
  return codigo;
}

// ---------- Envia uma mensagem do formulário "Fale Conosco" ----------
export async function submitMensagemContato({ nome, email, telefone, mensagem }) {
  const { error } = await supabase.from('mensagens_contato').insert({ nome, email, telefone, mensagem });
  if (error) throw error;
}

// ---------- Busca um imóvel específico pelo código ----------
export async function fetchImovelByCodigo(codigo) {
  const { data, error } = await supabase
    .from('imoveis')
    .select('*')
    .eq('codigo', codigo)
    .eq('status', 'ativo')
    .maybeSingle();
  if (error) {
    console.error('Erro ao buscar imóvel:', error.message);
    return null;
  }
  return data;
}

// ---------- Descrição: converte Markdown (ou texto puro) em HTML, e sanitiza antes de exibir ----------

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Aplica formatação inline de Markdown: **negrito** -> <strong>. O texto já
// vem escapado antes de chegar aqui, então é seguro inserir a tag.
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

// Registros antigos podem ter sido salvos como HTML puro (vindo do editor rico do
// admin) — se detectarmos tags reais, mantemos como está. Caso contrário (texto
// puro ou Markdown vindo da IA/formulário público), convertemos com markdownToHTML.
export function descricaoToHTML(raw) {
  if (!raw) return '';
  const looksLikeHTML = /<\/?(p|h[1-6]|ul|ol|li|strong|b|em|i|hr|br|span|a)[\s>]/i.test(raw);
  if (looksLikeHTML) return raw;
  return markdownToHTML(raw);
}

// Sanitiza o HTML da descrição antes de inserir no DOM (protege contra script/HTML malicioso).
// Usa DOMPurify se estiver carregado na página (via CDN); caso contrário faz um fallback básico.
export function sanitizeDescricao(html) {
  if (typeof window !== 'undefined' && window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'hr', 'span', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  }
  // fallback simples: remove tags de script/estilo/iframe e atributos on*
  return html
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '');
}

// ---------- Metadados (quartos, banheiros etc.) formatados para exibição ----------
export function metaResumo(imovel) {
  const parts = [];
  if (imovel.quartos) parts.push(`${imovel.quartos} Quarto${imovel.quartos > 1 ? 's' : ''}`);
  if (imovel.banheiros) parts.push(`${imovel.banheiros} Banheiro${imovel.banheiros > 1 ? 's' : ''}`);
  if (imovel.area) parts.push(`${imovel.area}m²`);
  return parts;
}

// ---------- Card HTML reutilizável (grade da home, destaques, similares) ----------
// Foto de capa como <img> real (mais simples e estável que background-image/carrossel).
export function propertyCardHTML(imovel) {
  const fotos = Array.isArray(imovel.fotos) ? imovel.fotos.filter(Boolean) : [];
  const capa = fotos[0] || null;
  const meta = metaResumo(imovel).map(m => `<span>${m}</span>`).join('');
  const finalidadeLabel = imovel.finalidade === 'alugar' ? 'Alugar' : 'Comprar';
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(' · ');

  const mediaHTML = capa
    ? `<img src="${capa}" alt="${imovel.titulo}" loading="lazy">`
    : `<div class="ph-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>Foto em breve</div>`;

  return `
    <article class="property-card" data-op="${imovel.finalidade}">
      <a href="imovel.html?codigo=${encodeURIComponent(imovel.codigo)}">
        <div class="property-photo">
          <span class="badge">${finalidadeLabel}</span>
          ${imovel.destaque ? '<span class="badge op">Destaque</span>' : ''}
          ${mediaHTML}
        </div>
        <div class="property-body">
          <h3>${imovel.titulo}</h3>
          <p class="loc">${local}</p>
          <div class="property-meta">${meta}</div>
          <div class="property-price">${formatBRL(imovel.valor)}</div>
        </div>
      </a>
    </article>
  `;
}

// ---------- Placeholder de imagem (SVG em data-URI) para os exemplos da galeria ----------
export function placeholderPhoto(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'><rect width='100%' height='100%' fill='#1b1a17'/><text x='50%' y='50%' fill='#a79d8c' font-size='34' font-family='sans-serif' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
