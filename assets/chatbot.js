// =====================================================================
// Corretor Atendente — assistente virtual da MCJ Capital Invest
// Widget de chat (HTML/CSS/JS puro) integrado à API do Google Gemini.
// =====================================================================
//
// IMPORTANTE SOBRE A CHAVE DE API: este é um site 100% estático, sem
// backend — qualquer chave usada aqui fica visível para quem inspecionar
// as requisições de rede. Por isso ela NÃO fica escrita neste arquivo:
// é cadastrada pelo Admin (painel do site → campo "Chave da API do
// Corretor Atendente"), salva na tabela `site_config` do Supabase (rode
// site-config-setup.sql uma vez para criar essa tabela) e lida aqui em
// tempo real. Pra trocar a chave no futuro, basta colar uma nova no
// Admin e salvar — sem editar código, sem commit, sem redeploy.
//
// Para publicar com segurança, no Google AI Studio / Google Cloud Console:
//   1. Crie uma chave de API dedicada só para este chat.
//   2. Em "Restrições de API", limite essa chave só à Generative Language API.
//   3. Em "Restrições de aplicativo" → "Referenciadores HTTP", cadastre o
//      domínio do site pra chave só funcionar a partir dele.
//   4. Defina uma cota diária baixa, como trava de segurança.

import { getSiteConfig, fetchImoveis, formatBRL, finalidadesArray } from './supabase-client.js';

let GEMINI_API_KEY = '';

const WHATSAPP_NUMERO = '5511999990542';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMERO}`;

const MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

function buildSystemInstruction(catalogoResumo) {
  return `Você é o "Corretor Atendente" virtual da MCJ Capital Invest, uma imobiliária especializada em imóveis de alto padrão em São Paulo. Seu tom de voz é sofisticado, cordial, consultivo e discreto — como um corretor experiente que atende clientes exigentes, nunca informal ou apressado.

Responda sempre em português do Brasil, em mensagens curtas e claras (isto é um chat, não um e-mail) — no máximo 3 a 5 frases por resposta, a menos que o cliente peça mais detalhes.

Seu objetivo é ajudar visitantes a encontrar o imóvel certo (para comprar ou alugar), tirar dúvidas sobre bairros, condições de pagamento e agendar visitas.

=== BASE DE CONHECIMENTO DA IMOBILIÁRIA (use somente estas informações; nunca invente dados que não estejam aqui) ===
• Endereço: Av. Paulista, 1159 · Conj. 1005 · Bela Vista · São Paulo - SP.
• Horário de atendimento: Segunda a Sexta-feira, das 09h às 18h (horário de Brasília).
• Contato: (11) 99999-0542 (WhatsApp) | marciocjorge@terra.com.br
• Atuação: compra, venda e locação de imóveis de alto padrão (apartamentos, coberturas, casas e imóveis comerciais), principalmente em São Paulo.

=== CATÁLOGO ATUAL (imóveis disponíveis agora — use para responder perguntas sobre opções específicas) ===
${catalogoResumo || 'Nenhum imóvel carregado no momento — oriente o cliente a falar com um corretor humano pelo WhatsApp para conhecer o catálogo atualizado.'}

=== DIRECIONAMENTO PARA O WHATSAPP ===
Se o cliente quiser agendar uma visita, negociar condições, fazer uma proposta ou tiver uma dúvida muito específica sobre um imóvel (documentação, negociação de valor, disponibilidade exata), NÃO tente resolver isso sozinho: oriente-o a continuar com um corretor humano e inclua o link direto: ${WHATSAPP_LINK}

Se não souber responder algo com certeza, seja honesto e direcione para o WhatsApp em vez de chutar uma resposta.`;
}

function buildWidgetHTML() {
  return `
    <button type="button" class="mcj-chat-fab" id="mcjChatFab" aria-label="Falar com o Corretor Atendente">
      <img src="assets/chat-icon-corretor.png" alt="Corretor Atendente">
      <span class="mcj-chat-fab-dot"></span>
    </button>

    <div class="mcj-chat-window" id="mcjChatWindow" role="dialog" aria-label="Corretor Atendente MCJ Capital Invest">
      <div class="mcj-chat-header">
        <div class="mcj-chat-avatar">
          <img src="assets/chat-icon-corretor.png" alt="Corretor Atendente">
        </div>
        <div class="mcj-chat-header-info">
          <strong>Corretor Atendente — MCJ Capital Invest</strong>
          <div class="mcj-chat-status"><span class="dot"></span> Online</div>
        </div>
        <button type="button" class="mcj-chat-close" id="mcjChatClose" aria-label="Fechar chat">&times;</button>
      </div>
      <div class="mcj-chat-messages" id="mcjChatMessages"></div>
      <div class="mcj-chat-input-row">
        <input type="text" id="mcjChatInput" placeholder="Digite sua mensagem..." autocomplete="off" maxlength="500">
        <button type="button" class="mcj-chat-send" id="mcjChatSend" aria-label="Enviar mensagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function linkify(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/(https?:\/\/[^\s]+)/g, url => {
    const clean = url.replace(/[.,;!?)]+$/, '');
    return `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>`;
  });
}

// Monta um resumo curto do catálogo atual pra dar contexto real ao Gemini
// (evita a IA "alucinar" imóveis que não existem).
async function buildCatalogoResumo() {
  try {
    const imoveis = await fetchImoveis({ limit: 25 });
    if (!imoveis.length) return '';
    return imoveis.map(im => {
      const f = finalidadesArray(im).map(x => x === 'alugar' ? 'Alugar' : 'Comprar').join(' / ');
      const precos = [];
      if (finalidadesArray(im).includes('comprar') && im.valor) precos.push(`Venda ${formatBRL(im.valor)}`);
      if (finalidadesArray(im).includes('alugar') && im.valor_aluguel) precos.push(`Aluguel ${formatBRL(im.valor_aluguel)}/mês`);
      const local = [im.bairro, im.cidade].filter(Boolean).join(', ');
      return `• [${im.codigo}] ${im.titulo} — ${f} — ${local} — ${im.quartos || 0} quartos — ${precos.join(' · ')}`;
    }).join('\n');
  } catch {
    return '';
  }
}

async function callGeminiChat(history, systemInstruction) {
  let lastError;
  for (const model of MODEL_CANDIDATES) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: history,
            generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) {
        lastError = new Error(data.error?.message || `Erro na API do Gemini (modelo ${model})`);
        const msg = (data.error?.message || '').toLowerCase();
        if (msg.includes('not found') || msg.includes('not supported') || msg.includes('no longer available') || msg.includes('deprecated')) {
          continue;
        }
        throw lastError;
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

function initChatWidget() {
  document.body.insertAdjacentHTML('beforeend', buildWidgetHTML());

  let systemInstruction = buildSystemInstruction('');
  getSiteConfig('chatbot_gemini_key')
    .then(key => { GEMINI_API_KEY = key || ''; })
    .catch(() => { GEMINI_API_KEY = ''; });
  buildCatalogoResumo()
    .then(resumo => { systemInstruction = buildSystemInstruction(resumo); })
    .catch(() => {});

  const fab = document.getElementById('mcjChatFab');
  const win = document.getElementById('mcjChatWindow');
  const closeBtn = document.getElementById('mcjChatClose');
  const messagesEl = document.getElementById('mcjChatMessages');
  const input = document.getElementById('mcjChatInput');
  const sendBtn = document.getElementById('mcjChatSend');

  let history = [];
  let sending = false;
  let welcomed = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `mcj-chat-msg ${role}`;
    bubble.innerHTML = linkify(text);
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'mcj-chat-typing';
    typing.id = 'mcjChatTyping';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('mcjChatTyping')?.remove();
  }

  function openChat() {
    win.classList.add('open');
    fab.classList.add('hidden-while-open');
    if (!welcomed) {
      welcomed = true;
      addMessage('bot', 'Boa tarde! Sou o Corretor Atendente da MCJ Capital Invest. Está buscando um imóvel para comprar ou para alugar? Posso ajudar a encontrar a opção ideal.');
    }
    input.focus();
  }

  function closeChat() {
    win.classList.remove('open');
    fab.classList.remove('hidden-while-open');
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || sending) return;

    if (!GEMINI_API_KEY) {
      GEMINI_API_KEY = await getSiteConfig('chatbot_gemini_key').catch(() => '');
    }
    if (!GEMINI_API_KEY) {
      addMessage('user', text);
      input.value = '';
      addMessage('error', `No momento o atendimento automático está indisponível (chave da API não configurada). Fale diretamente com um de nossos corretores pelo WhatsApp: ${WHATSAPP_LINK}`);
      return;
    }

    addMessage('user', text);
    history.push({ role: 'user', parts: [{ text }] });
    input.value = '';
    sending = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const reply = await callGeminiChat(history, systemInstruction);
      hideTyping();
      addMessage('bot', reply);
      history.push({ role: 'model', parts: [{ text: reply }] });
    } catch (err) {
      hideTyping();
      addMessage('error', `Não foi possível processar sua mensagem agora. Tente novamente em instantes ou fale diretamente com um corretor: ${WHATSAPP_LINK}`);
      console.error('Erro no Corretor Atendente:', err);
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  fab.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });
}

document.addEventListener('DOMContentLoaded', initChatWidget);
