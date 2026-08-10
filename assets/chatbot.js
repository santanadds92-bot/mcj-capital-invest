// =====================================================================
// Atendente Virtual Tático — "Recruta QRV"
// Widget de chat (HTML/CSS/JS puro) integrado à API do Google Gemini.
// =====================================================================
//
// IMPORTANTE SOBRE A CHAVE DE API (leia antes de publicar):
// Este é um site 100% estático, sem backend — qualquer chave usada aqui
// fica visível para QUALQUER visitante que inspecionar as requisições
// de rede. Isso significa que, em teoria, alguém poderia copiar essa
// chave e gerar cobranças na sua conta do Google.
//
// Por isso a chave NÃO fica mais escrita neste arquivo (evita também o
// bloqueio de "secret scanning" do GitHub que você viu ao commitar).
// Ela agora é cadastrada pelo Admin (painel do site → campo "Chave da
// API do Gemini do Chat"), salva na tabela `site_config` do Supabase
// (rode supabase-site-config.sql uma vez para criar essa tabela) e lida
// aqui em tempo real. Pra trocar a chave no futuro, basta colar uma
// nova no Admin e salvar — sem editar código, sem commit, sem redeploy.
//
// Para publicar com segurança, faça isto no Google AI Studio / Google
// Cloud Console (é rápido, uma vez só):
//   1. Crie uma chave de API específica só para este chat (não reuse a
//      mesma chave do admin.html).
//   2. Em "Restrições de API", limite essa chave só à Generative
//      Language API.
//   3. Em "Restrições de aplicativo" → "Referenciadores HTTP", cadastre
//      o domínio do site (ex: https://qrv-artigos-taticos.vercel.app/*)
//      pra chave só funcionar quando chamada a partir do seu site.
//   4. Defina uma cota diária baixa nessa chave, como trava de segurança.
import { getSiteConfig } from './supabase-client.js';

let GEMINI_API_KEY = '';

const WHATSAPP_NUMERO = '5511993217675'; // (11) 99321-7675
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMERO}`;

const MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

const SYSTEM_INSTRUCTION = `Você é o "Recruta QRV", o atendente virtual da loja QRV Artigos Táticos — um recruta novato, extremamente disciplinado, animado e caricato, no estilo clássico de caserna/filme militar. Você trata o cliente sempre como um superior ("senhor"/"senhora") e responde com entusiasmo exagerado, postura de sentido, mas sempre educado, prestativo e nunca grosseiro.

ESTILO DE FALA OBRIGATÓRIO — use com frequência (não em toda frase, mas várias vezes por resposta) expressões como:
"Sim, senhor!", "Não, senhor!", "Sem novidade, senhor!", "QAP, senhor!", "Na missão, senhor!", "Positivo!", "Afirmativo!", "Pronto para o combate!", "Câmbio!", "À disposição, senhor!".
Fale como um recruta extremamente disciplinado e vibrante que adora seu trabalho e trata cada dúvida do cliente como uma "missão". Pode usar metáforas leves de caserna (recrutamento, farda, ordem unida, sentido) desde que sem exagero que atrapalhe o entendimento.

Responda sempre em português do Brasil, em mensagens curtas e objetivas (isto é um chat, não um e-mail) — no máximo 2 a 4 frases por resposta, a menos que o cliente peça mais detalhes. O tom é divertido e vibrante, mas a informação sempre tem que ser clara e útil — nunca sacrifique a clareza pelo personagem.

Seu objetivo é ajudar os clientes a escolherem coturnos, mochilas, roupas, cutelaria, lanternas e tirar dúvidas gerais sobre compras.

=== BASE DE CONHECIMENTO DA LOJA (use somente estas informações; nunca invente dados que não estejam aqui) ===
• Endereço físico: Av. Santos Dumont, 61 - Cumbica, Guarulhos - SP.
• Horário de atendimento: Segunda a Quinta 10h–20h30 | Sexta 10h–19h | Sábado 09h–16h.
• Envios: frete e entrega para todo o Brasil.
• Parcelamento: até 3x sem juros no cartão.
• Bordados: fazem bordados personalizados sob encomenda (nome de guerra, tipo sanguíneo, insígnias, revenda).
• Contato direto / WhatsApp: (11) 99321-7675 | e-mail contato@qrvartigostaticos.com.br
• Catálogo / destaques: jaquetas impermeáveis, camisas combat ripstop, mochilas assault e paraquedista, coturnos em couro/cordura, óculos solares táticos Focus, calçados e cutelaria.

=== DIRECIONAMENTO PARA O WHATSAPP ===
Se o cliente disser que quer fechar uma compra, finalizar um pedido, ou pedir um orçamento de bordado sob encomenda (que exige atendimento manual porque depende de detalhes específicos), NÃO tente resolver isso sozinho: anuncie que vai encaminhar o cliente para o "comando" (a equipe humana) e sempre inclua o link direto na sua resposta: ${WHATSAPP_LINK}

Se não souber responder algo com certeza (preço exato de um item específico, prazo de entrega para um CEP, disponibilidade de estoque de um produto específico), seja honesto ("Sem novidade sobre isso, senhor!") e direcione para o WhatsApp da loja em vez de chutar uma resposta.`;

function buildWidgetHTML() {
  return `
    <button type="button" class="qrv-chat-fab" id="qrvChatFab" aria-label="Abrir atendimento tático">
      <img src="assets/chat-icon-recruta.png" alt="Recruta QRV" class="qrv-chat-fab-avatar">
      <span class="qrv-chat-fab-dot"></span>
    </button>

    <div class="qrv-chat-window" id="qrvChatWindow" role="dialog" aria-label="Atendimento tático QRV">
      <div class="qrv-chat-header">
        <div class="qrv-chat-avatar">
          <img src="assets/chat-icon-recruta.png" alt="Recruta QRV">
        </div>
        <div class="qrv-chat-header-info">
          <strong>Recruta QRV — Atendimento Tático</strong>
          <div class="qrv-chat-status"><span class="dot"></span> Online</div>
        </div>
        <button type="button" class="qrv-chat-close" id="qrvChatClose" aria-label="Fechar chat">&times;</button>
      </div>
      <div class="qrv-chat-messages" id="qrvChatMessages"></div>
      <div class="qrv-chat-input-row">
        <input type="text" id="qrvChatInput" placeholder="Digite sua mensagem..." autocomplete="off" maxlength="500">
        <button type="button" class="qrv-chat-send" id="qrvChatSend" aria-label="Enviar mensagem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
    </div>
  `;
}

// Converte URLs cruas (ex: o link do WhatsApp) em links clicáveis dentro da bolha de mensagem.
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

async function callGeminiChat(history) {
  let lastError;
  for (const model of MODEL_CANDIDATES) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
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

  // Busca a chave salva pelo Admin assim que a página carrega (não bloqueia
  // a exibição do widget — só precisa estar pronta até o visitante mandar
  // a primeira mensagem).
  getSiteConfig('chatbot_gemini_key')
    .then(key => { GEMINI_API_KEY = key || ''; })
    .catch(() => { GEMINI_API_KEY = ''; });

  const fab = document.getElementById('qrvChatFab');
  const win = document.getElementById('qrvChatWindow');
  const closeBtn = document.getElementById('qrvChatClose');
  const messagesEl = document.getElementById('qrvChatMessages');
  const input = document.getElementById('qrvChatInput');
  const sendBtn = document.getElementById('qrvChatSend');

  let history = [];
  let sending = false;
  let welcomed = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `qrv-chat-msg ${role}`;
    bubble.innerHTML = linkify(text);
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'qrv-chat-typing';
    typing.id = 'qrvChatTyping';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('qrvChatTyping')?.remove();
  }

  function openChat() {
    win.classList.add('open');
    fab.classList.add('hidden-while-open');
    if (!welcomed) {
      welcomed = true;
      addMessage('bot', 'QAP! Sou o assistente virtual da QRV Artigos Táticos. Como posso te ajudar na sua missão hoje?');
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
      // Pode ser que a busca da chave ainda esteja em andamento (rede lenta) —
      // tenta buscar de novo uma vez antes de desistir.
      GEMINI_API_KEY = await getSiteConfig('chatbot_gemini_key').catch(() => '');
    }
    if (!GEMINI_API_KEY) {
      addMessage('user', text);
      input.value = '';
      addMessage('error', `Positivo, mas ainda não estou com o rádio conectado (chave da API não configurada). Fala direto com a equipe pelo WhatsApp: ${WHATSAPP_LINK}`);
      return;
    }

    addMessage('user', text);
    history.push({ role: 'user', parts: [{ text }] });
    input.value = '';
    sending = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const reply = await callGeminiChat(history);
      hideTyping();
      addMessage('bot', reply);
      history.push({ role: 'model', parts: [{ text: reply }] });
    } catch (err) {
      hideTyping();
      addMessage('error', `Falha na comunicação, câmbio. Tenta de novo em instantes ou fala direto com a equipe: ${WHATSAPP_LINK}`);
      console.error('Erro no chat QRV:', err);
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
