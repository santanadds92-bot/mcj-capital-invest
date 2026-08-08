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

// ---------- Metadados (quartos, banheiros etc.) formatados para exibição ----------
export function metaResumo(imovel) {
  const parts = [];
  if (imovel.quartos) parts.push(`${imovel.quartos} Quarto${imovel.quartos > 1 ? 's' : ''}`);
  if (imovel.banheiros) parts.push(`${imovel.banheiros} Banheiro${imovel.banheiros > 1 ? 's' : ''}`);
  if (imovel.area) parts.push(`${imovel.area}m²`);
  return parts;
}

// ---------- Card HTML reutilizável (grade da home, destaques, similares) ----------
export function propertyCardHTML(imovel) {
  const capa = Array.isArray(imovel.fotos) && imovel.fotos.length > 0 ? imovel.fotos[0] : null;
  const meta = metaResumo(imovel).map(m => `<span>${m}</span>`).join('');
  const finalidadeLabel = imovel.finalidade === 'alugar' ? 'Alugar' : 'Comprar';
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(' · ');

  return `
    <article class="property-card" data-op="${imovel.finalidade}">
      <a href="imovel.html?codigo=${encodeURIComponent(imovel.codigo)}">
        <div class="property-photo" ${capa ? `style="background-image:url('${capa}');background-size:cover;background-position:center;"` : ''}>
          <span class="badge">${finalidadeLabel}</span>
          ${imovel.destaque ? '<span class="badge op">Destaque</span>' : ''}
          ${!capa ? `<div class="ph-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/></svg>Foto em breve</div>` : ''}
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
