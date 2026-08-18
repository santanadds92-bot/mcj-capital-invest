// Proxy serverless para o chat público "Corretor Marcio Jorge" (assets/chatbot.js).
//
// Antes, a chave do Gemini usada pelo chat ficava salva na tabela
// `site_config` do Supabase com política de LEITURA PÚBLICA (para que
// qualquer visitante conseguisse usar o chat sem login) — o que significava
// que, tecnicamente, qualquer pessoa conseguia ler essa chave direto via API
// REST do Supabase. Esta função elimina esse problema: a chave agora mora
// exclusivamente em uma variável de ambiente no servidor (GEMINI_API_KEY —
// a mesma já usada por api/gerar-imovel-ia.js) e o navegador do visitante
// nunca tem acesso a ela, só ao texto final da resposta.
//
// O catálogo de imóveis embutido no `systemInstruction` é montado no
// navegador (assets/chatbot.js) a partir de dados já públicos do site — não
// há segredo nisso, então não há problema em recebê-lo do cliente a cada
// chamada.

const MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

// ---------- Rate limit distribuído (Supabase) com fallback em memória ----------
// Mesmo esquema documentado em api/gerar-imovel-ia.js: contador principal no
// Supabase (compartilhado entre todas as instâncias serverless da Vercel),
// com um Map em memória local como rede de segurança caso o Supabase não
// responda ou a variável SUPABASE_SERVICE_ROLE_KEY ainda não tenha sido
// configurada.
const SUPABASE_URL = 'https://zmvxmsvbvuiikxsuxoxl.supabase.co';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 40; // uma conversa normal troca várias mensagens, então o teto é mais folgado que o do preenchimento automático

const rateLimitMap = new Map();
function isRateLimitedInMemory(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref?.();

async function isRateLimited(bucketKey) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return isRateLimitedInMemory(bucketKey);

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_bucket_key: bucketKey,
        p_window_ms: RATE_LIMIT_WINDOW_MS,
        p_max_requests: RATE_LIMIT_MAX,
      }),
    });
    if (!resp.ok) return isRateLimitedInMemory(bucketKey);
    return await resp.json();
  } catch {
    return isRateLimitedInMemory(bucketKey);
  }
}

const MAX_MESSAGE_LENGTH = 1000; // por mensagem do usuário
const MAX_HISTORY_TURNS = 40; // trava de tamanho de conversa (usuário + IA somados)
const MAX_SYSTEM_INSTRUCTION_LENGTH = 12000; // cobre o catálogo de imóveis com folga

async function requestGemini(apiKey, model, history, systemInstruction, maxOutputTokens) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: history,
        // temperature baixa de propósito: catálogo de imóveis reais, não
        // texto criativo — queremos que o modelo cite os dados literalmente.
        generationConfig: { temperature: 0.2, maxOutputTokens },
      }),
    }
  );
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.error?.message || `Erro na API do Gemini (modelo ${model})`);
    err.code = 'API_ERROR';
    throw err;
  }
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || []).map(p => p.text || '').join('').trim();
  return { text, finishReason: candidate?.finishReason };
}

async function callGeminiChat(apiKey, history, systemInstruction) {
  let lastError;
  for (const model of MODEL_CANDIDATES) {
    try {
      let { text, finishReason } = await requestGemini(apiKey, model, history, systemInstruction, 2048);

      if (finishReason === 'MAX_TOKENS') {
        const retry = await requestGemini(apiKey, model, history, systemInstruction, 4096);
        if (retry.text) {
          text = retry.text;
          finishReason = retry.finishReason;
        }
      }

      if (!text) {
        lastError = new Error('A IA não retornou nenhum conteúdo.');
        continue;
      }
      return text;
    } catch (err) {
      lastError = err;
      const msg = (err.message || '').toLowerCase();
      if (err.code === 'API_ERROR' && !(msg.includes('not found') || msg.includes('not supported') || msg.includes('no longer available') || msg.includes('deprecated'))) {
        throw err;
      }
      // modelo indisponível/depreciado — tenta o próximo da lista.
    }
  }
  throw lastError || new Error('Nenhum modelo do Gemini respondeu.');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (await isRateLimited(`chat-gemini:${ip}`)) {
    res.status(429).json({ error: 'Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Atendimento automático indisponível no momento (chave da API não configurada no servidor).' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const history = Array.isArray(body?.history) ? body.history : null;
  const systemInstruction = typeof body?.systemInstruction === 'string' ? body.systemInstruction : '';

  if (!history || history.length === 0) {
    res.status(400).json({ error: 'Histórico de conversa vazio ou inválido.' });
    return;
  }
  if (history.length > MAX_HISTORY_TURNS) {
    res.status(400).json({ error: 'Conversa muito longa. Recarregue a página para começar uma nova.' });
    return;
  }
  if (systemInstruction.length > MAX_SYSTEM_INSTRUCTION_LENGTH) {
    res.status(400).json({ error: 'Contexto inválido.' });
    return;
  }
  for (const turn of history) {
    const parts = turn && Array.isArray(turn.parts) ? turn.parts : null;
    if (!turn || (turn.role !== 'user' && turn.role !== 'model') || !parts) {
      res.status(400).json({ error: 'Formato de histórico inválido.' });
      return;
    }
    const text = parts.map(p => (p && typeof p.text === 'string') ? p.text : '').join('');
    if (text.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: 'Mensagem muito longa.' });
      return;
    }
  }

  try {
    const text = await callGeminiChat(apiKey, history, systemInstruction);
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao processar a mensagem.' });
  }
};
