// Função serverless (Vercel) — recebe o texto bruto de um imóvel colado por
// qualquer visitante na página pública "Anunciar Seu Imóvel", monta o prompt
// e chama a API do Google Gemini usando a chave GEMINI_API_KEY guardada como
// variável de ambiente no projeto da Vercel.
//
// Diferença crucial em relação ao fluxo antigo (assets/gemini-ai.js chamado
// direto do navegador): aqui a chave NUNCA chega ao navegador do visitante —
// ela só existe no servidor. O navegador só fala com esta função, e esta
// função é quem fala com o Google. Por isso é seguro deixar essa opção
// disponível automaticamente para qualquer pessoa que acessar o site, sem
// pedir chave pessoal a ninguém.
//
// Configuração necessária (uma única vez, feita direto no painel da Vercel,
// não no código): Project Settings → Environment Variables → adicionar
// GEMINI_API_KEY com uma chave gerada em aistudio.google.com/apikey.
// Recomendado: crie uma chave dedicada só para isso e, nas restrições dela no
// Google AI Studio, limite-a à Generative Language API e defina uma cota
// diária baixa como trava de segurança contra abuso.

const GEMINI_MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash'];

function buildImovelPrompt(raw) {
  return `Você é um assistente que transforma anúncios informais de imóveis de alto padrão (geralmente copiados do WhatsApp) em dados estruturados para o site da imobiliária MCJ Capital Invest.

Analise o texto abaixo e retorne SOMENTE um objeto JSON válido (sem markdown, sem crases, sem texto fora do JSON), com exatamente estas chaves:

{
  "codigo": string (código/referência do imóvel, se houver no texto; senão ""),
  "titulo": string (título comercial atrativo, ex: "Apartamento Ultra Luxo no Jardins"),
  "finalidade": array com um ou os dois valores — ["comprar"], ["alugar"] ou ["comprar","alugar"] (o texto pode indicar as duas finalidades ao mesmo tempo, ex: "vende ou aluga"),
  "tipo": um destes valores exatamente — "Apartamento", "Casa", "Cobertura", "Comercial" ou "Terreno",
  "bairro": string,
  "cidade": string (ex: "São Paulo - SP"),
  "endereco": string (endereço completo se houver; senão bairro + cidade),
  "quartos": number,
  "banheiros": number,
  "suites": number,
  "vagas": number,
  "area": number (em m², apenas o número),
  "valor": number (valor de VENDA, apenas números, sem "R$" ou pontos; 0 se o imóvel for só para alugar),
  "valor_aluguel": number (valor do ALUGUEL mensal, apenas números; 0 se o imóvel for só para vender),
  "valor_condominio": number (apenas números, 0 se não informado),
  "iptu": number (valor do IPTU, apenas números, 0 se não informado),
  "descricao": string em MARKDOWN (não HTML) — siga ESTRITAMENTE as instruções de tom, estilo e estrutura descritas abaixo.
}

============================================================
INSTRUÇÕES OBRIGATÓRIAS PARA O CAMPO "descricao"
============================================================

Tom de voz: sofisticado, corporativo, persuasivo — texto de material comercial de uma imobiliária de imóveis de alto padrão/luxo. Nunca use tom informal, nunca copie o texto bruto literalmente: reescreva e enriqueça o conteúdo, mesmo que o texto original seja curto ou telegráfico. A descrição deve ser longa, completa e bem desenvolvida (nunca apenas 1 ou 2 frases soltas), preenchendo com linguagem própria do mercado imobiliário de alto padrão qualquer lacuna de informação que não tenha vindo no texto original (sem inventar números, endereços ou características factuais que não foram informados).

Formate a resposta em MARKDOWN simples, seguindo exatamente esta sintaxe (o site converte isso em HTML automaticamente):
- Use "### Nome do Título" para cada título de seção.
- Use "---" (três traços sozinhos em uma linha) como linha divisória elegante entre cada grande seção.
- Use "**palavra**" para aplicar negrito nas características de maior impacto comercial (ex: "**8 andares**", "**1.803m²**", "**localização privilegiada**").
- Use "•" no início da linha para cada item de lista/tópico.
- Não use HTML, não use \`\`\` (blocos de código), não use markdown de outros tipos (sem #### de nível 1 "#", sem links, sem tabelas).

Estrutura obrigatória, exatamente nesta ordem:

1. "### Introdução" seguido de um parágrafo impactante de abertura, destacando metragem, localização e o potencial do imóvel (investimento, moradia, uso comercial etc.).

2. "---" e depois "### Estrutura e Funcionalidade" seguido de uma lista de tópicos com "•" detalhando o aproveitamento do espaço, divisão de ambientes/andares, layout e adaptabilidade do imóvel a diferentes usos.

3. "---" e depois "### Diferenciais do Imóvel" seguido de uma lista de tópicos com "•" destacando os pontos fortes, acabamentos, comodidades e visibilidade comercial ou residencial do imóvel.

4. "---" e depois "### Localização Privilegiada" seguido de um parágrafo sobre a região, vias de acesso e conveniências do entorno (comércio, mobilidade, valorização da área).

5. "---" e depois "### Informações Adicionais" seguido de uma lista de tópicos com "•" resumindo, em itens curtos e objetivos: Localização, Área, Finalidade, Valor (e Condomínio/IPTU quando houver). Use exatamente os dados numéricos fornecidos no texto original nesse resumo — não invente valores.

Regra adicional: se alguma informação necessária para uma seção não existir no texto original, escreva a seção mesmo assim de forma genérica e elegante (sem inventar fatos específicos), nunca omita uma seção da estrutura.

Se alguma informação não estiver no texto, use 0 para números e "" para textos nos outros campos do JSON (fora da descrição) — nunca invente dados factuais que não estejam no texto original.

Texto bruto colado pelo usuário:
"""
${raw}
"""`;
}

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
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.5,
              maxOutputTokens: 4096,
            },
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

// ---------- Rate limit distribuído (Supabase) com fallback em memória ----------
// O contador principal fica no banco (tabela public.rate_limits + função
// check_rate_limit, ver rate-limit-setup.sql), acessado com a
// SUPABASE_SERVICE_ROLE_KEY — por isso é compartilhado de verdade entre
// todas as instâncias serverless da Vercel, ao contrário de um Map em
// memória. Se por qualquer motivo o Supabase não responder (fora do ar,
// variável de ambiente ainda não configurada etc.), caímos de volta no
// contador em memória local como rede de segurança, para nunca deixar o
// endpoint sem NENHUMA proteção.
const SUPABASE_URL = 'https://zmvxmsvbvuiikxsuxoxl.supabase.co';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const RATE_LIMIT_MAX = 8; // no máximo 8 gerações por IP a cada 10 minutos

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

const MAX_RAW_LENGTH = 6000; // limite generoso para o texto colado, evita payloads gigantes inflando custo/tokens

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (await isRateLimited(`gerar-imovel-ia:${ip}`)) {
    res.status(429).json({ error: 'Muitas gerações em pouco tempo. Aguarde alguns minutos e tente novamente.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'Preenchimento automático indisponível no momento (chave da API não configurada no servidor). Preencha os campos manualmente ou tente novamente mais tarde.',
    });
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
  const raw = (body && body.raw ? String(body.raw) : '').trim();
  if (!raw) {
    res.status(400).json({ error: 'Texto do imóvel não informado.' });
    return;
  }
  if (raw.length > MAX_RAW_LENGTH) {
    res.status(400).json({ error: 'Texto muito longo. Cole um resumo mais curto do imóvel.' });
    return;
  }

  try {
    const prompt = buildImovelPrompt(raw);
    const text = await callGemini(apiKey, prompt);
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao gerar com IA.' });
  }
};
