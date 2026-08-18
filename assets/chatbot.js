// =====================================================================
// Corretor Marcio Jorge — assistente virtual da MCJ Capital Invest
// Widget de chat (HTML/CSS/JS puro) integrado à API do Google Gemini.
// =====================================================================
//
// SOBRE A CHAVE DE API: as mensagens são processadas por uma função
// serverless (api/chat-gemini.js), que guarda a chave do Gemini em uma
// variável de ambiente no servidor (GEMINI_API_KEY, a mesma já usada pelo
// preenchimento automático em api/gerar-imovel-ia.js). O navegador do
// visitante nunca tem acesso à chave — só ao texto final da resposta.
// (Esquema anterior guardava a chave em site_config no Supabase com
// leitura pública, o que permitia que qualquer visitante a extraísse via
// API REST; esse endpoint substitui aquele esquema por completo.)

import { fetchImoveis, formatBRL, finalidadesArray } from './supabase-client.js';

const WHATSAPP_NUMERO = '5511999990542';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMERO}`;

function buildSystemInstruction(catalogoResumo) {
  return `Você é o "Corretor Marcio Jorge", o assistente virtual da MCJ Capital Invest, uma imobiliária especializada em imóveis de alto padrão em São Paulo. Seu tom de voz é sofisticado, cordial, consultivo e discreto — como um corretor experiente que atende clientes exigentes, nunca informal ou apressado.

Responda sempre em português do Brasil, em mensagens curtas e claras (isto é um chat, não um e-mail) — prefira no máximo 3 a 5 frases por resposta, a menos que o cliente peça mais detalhes. Regra mais importante que o limite de frases: NUNCA termine uma resposta com uma frase incompleta ou pela metade. Se precisar escolher entre uma resposta mais longa porém completa e uma resposta curta que arrisque ficar cortada, sempre escolha terminar o raciocínio por completo, mesmo que isso exija uma frase a mais.

Seu objetivo é ajudar visitantes a encontrar o imóvel certo (para comprar ou alugar), tirar dúvidas sobre bairros, condições de pagamento e agendar visitas.

=== BASE DE CONHECIMENTO DA IMOBILIÁRIA (use somente estas informações; nunca invente dados que não estejam aqui) ===
• Endereço: Av. Paulista, 1159 · Conj. 1005 · Bela Vista · São Paulo - SP.
• Horário de atendimento: Segunda a Sexta-feira, das 09h às 18h (horário de Brasília).
• Contato: (11) 99999-0542 (WhatsApp) | mcjcapitalinvest@terra.com.br
• Atuação: compra, venda e locação de imóveis de alto padrão (apartamentos, coberturas, casas e imóveis comerciais), principalmente em São Paulo.

=== CATÁLOGO ATUAL (a ÚNICA fonte de verdade sobre imóveis disponíveis agora; cada linha começa com o código do imóvel entre colchetes, ex: [MCJ-001]) ===
${catalogoResumo || 'CATÁLOGO VAZIO — nenhum imóvel carregado no momento.'}

=== REGRA ABSOLUTA CONTRA INVENÇÃO DE DADOS ===
Você NÃO pode, em hipótese alguma, inventar, embelezar, estimar ou "completar" bairro, cidade, rua, metragem, valor, padrão de acabamento ou qualquer outro dado de um imóvel. Use exclusivamente os dados exatos que aparecem na linha do CATÁLOGO ATUAL correspondente ao código citado — copie bairro, cidade e valor literalmente da linha, mesmo que pareçam simples ou "de exemplo". Isso vale mesmo que o cliente peça um imóvel "de alto padrão", "em bairro nobre" ou "na Oscar Freire": você só pode oferecer o que realmente existe no CATÁLOGO ATUAL, ainda que a localização ou o valor não combinem com o que o cliente imaginou. Nunca troque o bairro/cidade real de um imóvel por outro mais "sofisticado" para soar mais alinhado ao seu tom de voz.
Se o CATÁLOGO ATUAL estiver vazio ou não tiver nada que combine com o pedido, diga isso claramente e direcione para o WhatsApp — nunca invente um imóvel para não decepcionar o cliente.

=== COMO INDICAR IMÓVEIS E LINKS (siga este formato à risca) ===
Quando o cliente pedir um imóvel específico (ex: "apartamento pra comprar na Vila Augusta"), procure primeiro no CATÁLOGO ATUAL acima.
• Se encontrar 1 ou poucos imóveis que combinam bem: cite o nome e os dados (bairro, cidade, valor) exatamente como estão na linha do catálogo, e logo depois inclua o link de cada um no formato exato "imovel.html?codigo=CODIGO" (troque CODIGO pelo código entre colchetes do imóvel, mantendo exatamente esse formato de texto puro, sem markdown, sem parênteses ao redor).
• Se a busca for ampla (muitos resultados, ou o cliente só descreveu um bairro/tipo sem pedir um imóvel específico): não liste tudo, em vez disso inclua um link pra página de busca já filtrada, no formato "comprar.html?bairro=BAIRRO" (para compra) ou "alugar.html?bairro=BAIRRO" (para aluguel) — troque BAIRRO pelo nome do bairro mencionado (sem acentos ou espaços, use %20 se precisar). Os filtros aceitos nessas páginas são: bairro, tipo, quartos, valor_max, codigo.
• Se não encontrar nada no catálogo que combine com o pedido, seja honesto: diga que não há esse imóvel disponível no momento e ofereça o link "comprar.html" ou "alugar.html" (sem filtro) para o cliente ver as opções atuais, ou direcione ao WhatsApp.
Nunca invente um código de imóvel que não esteja no CATÁLOGO ATUAL, e nunca associe um código real a uma descrição diferente da que está na linha dele.

=== DIRECIONAMENTO PARA O WHATSAPP ===
Se o cliente quiser agendar uma visita, negociar condições, fazer uma proposta ou tiver uma dúvida muito específica sobre um imóvel (documentação, negociação de valor, disponibilidade exata), NÃO tente resolver isso sozinho: oriente-o a continuar com um corretor humano e inclua o link direto: ${WHATSAPP_LINK}

Se não souber responder algo com certeza, seja honesto e direcione para o WhatsApp em vez de chutar uma resposta.`;
}

function buildWidgetHTML() {
  return `
    <button type="button" class="mcj-chat-fab" id="mcjChatFab" aria-label="Falar com o Corretor Marcio Jorge">
      <img src="assets/chat-icon-marcio.png" alt="Corretor Marcio Jorge">
      <span class="mcj-chat-fab-dot"></span>
    </button>

    <div class="mcj-chat-window" id="mcjChatWindow" role="dialog" aria-label="Corretor Marcio Jorge — MCJ Capital Invest">
      <div class="mcj-chat-header">
        <div class="mcj-chat-avatar">
          <img src="assets/chat-icon-marcio.png" alt="Corretor Marcio Jorge">
        </div>
        <div class="mcj-chat-header-info">
          <strong>Corretor Marcio Jorge — MCJ Capital Invest</strong>
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
  // Links absolutos (http/https) — vira <a> normal, abre em nova aba.
  const withAbsoluteLinks = escaped.replace(/(https?:\/\/[^\s]+)/g, url => {
    const clean = url.replace(/[.,;!?)]+$/, '');
    return `<a href="${clean}" target="_blank" rel="noopener">${clean}</a>`;
  });
  // Links relativos às páginas do próprio site (imovel.html?codigo=...,
  // comprar.html?..., alugar.html?...) que o Gemini pode citar ao indicar
  // um imóvel específico ou uma busca filtrada — viram botões clicáveis
  // dentro da própria página, sem precisar do domínio completo.
  return withAbsoluteLinks.replace(
    /(?<!\/)\b((?:imovel|comprar|alugar)\.html(?:\?[^\s<]*)?)/g,
    match => {
      // Remove pontuação de frase colada no final (vírgula, ponto, etc.) —
      // sem isso, "...em imovel.html?codigo=0019, além de..." vira um link
      // com "0019," (vírgula incluída) e o código do imóvel não é encontrado.
      const clean = match.replace(/[.,;!?)]+$/, '');
      return `<a href="${clean}" class="mcj-chat-link-btn">${clean.startsWith('imovel') ? 'Ver imóvel' : 'Ver opções →'}</a>`;
    }
  );
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

// A escolha de modelo, retry em caso de MAX_TOKENS e a chamada real à API
// do Gemini agora acontecem inteiramente no servidor (api/chat-gemini.js) —
// aqui só enviamos o histórico da conversa e recebemos o texto pronto.
async function callGeminiChat(history, systemInstruction) {
  const resp = await fetch('/api/chat-gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, systemInstruction }),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Erro ao processar a mensagem.');
  }
  return data.text;
}

function initChatWidget() {
  document.body.insertAdjacentHTML('beforeend', buildWidgetHTML());

  let systemInstruction = buildSystemInstruction('');
  // Guarda a promise do catálogo pra poder aguardá-la antes do primeiro
  // envio — sem isso, se o cliente digitar rápido, a mensagem pode sair
  // antes do catálogo real carregar, e a IA responde sem saber quais
  // imóveis existem de verdade (risco de invenção).
  const catalogoPromise = buildCatalogoResumo()
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
      addMessage('bot', 'Boa tarde! Sou o Corretor Marcio Jorge, da MCJ Capital Invest. Está buscando um imóvel para comprar ou para alugar? Posso ajudar a encontrar a opção ideal.');
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

    await catalogoPromise;

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
