// Módulo compartilhado de IA (Google Gemini) — usado no painel admin da QRV
// Artigos Táticos para gerar descrições de produto a partir de um texto bruto.
//
// Por que não existe uma "chave padrão do sistema" embutida aqui: qualquer
// chave colocada em um arquivo JS servido publicamente pode ser lida por
// qualquer visitante do site (basta abrir o código-fonte) e usada por
// terceiros, gerando cobranças na conta do Google de quem é dono da chave.
// Por isso a chave fica salva somente no navegador de quem for usar o admin
// (localStorage), nunca é enviada para nenhum servidor além da própria API
// do Google.

export const GEMINI_KEY_STORAGE = 'qrv_gemini_api_key';

export function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
}

export function setGeminiKey(key) {
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
}

export function buildProdutoPrompt(raw) {
  return `Você é um assistente que transforma informações brutas de produtos (equipamentos e artigos táticos/militares) em dados estruturados para o site da loja QRV Artigos Táticos.

Analise o texto abaixo e retorne SOMENTE um objeto JSON válido (sem markdown, sem crases, sem texto fora do JSON), com exatamente estas chaves:

{
  "codigo": string (código/referência do produto, se houver no texto; senão ""),
  "titulo": string (nome comercial do produto, claro e direto, ex: "Combat Shirt Ripstop Multicam"),
  "categoria": um destes valores exatamente — "vestuario", "calcados", "mochilas", "insignias", "protecao", "facas", "kits", "acessorios" ou "replicas",
  "corporacao": string (ex: "Exército Brasileiro", "Marinha do Brasil", "Aeronáutica", "PMESP", "Polícia Militar", "Bombeiros", "Polícia Civil", "Geral" — use "Geral" se não for específico de uma corporação),
  "tamanhos": array de strings com os tamanhos mencionados (ex: ["P","M","G","GG"] ou ["38","39","40"]; array vazio se não houver),
  "cores": array de strings com as cores mencionadas (array vazio se não houver),
  "preco": number (apenas números, sem "R$" ou pontos de milhar),
  "personalizavel": boolean (true se o produto permite/exige bordado de nome de guerra, tipo sanguíneo ou identificação personalizada),
  "descricao": string em HTML puro (não Markdown) — siga ESTRITAMENTE as instruções de tom, estilo e estrutura descritas abaixo.
}

============================================================
INSTRUÇÕES OBRIGATÓRIAS PARA O CAMPO "descricao"
============================================================

Tom de voz: técnico, direto e confiável — texto de e-commerce especializado em equipamentos táticos e militares, para um público que entende do assunto (policiais, militares, recrutas, colecionadores, entusiastas). Nunca use tom informal excessivo nem linguagem de marketing genérica; foque em material, funcionalidade, resistência e uso prático/operacional. Reescreva e enriqueça o conteúdo mesmo que o texto original seja curto, sem inventar especificações técnicas que não foram informadas.

Formate a resposta em HTML puro, usando SOMENTE estas tags: <p>, <h3>, <strong>, <ul>, <li>, <hr>. Nada de markdown (sem "###", sem "**", sem "•"), nada de <html>/<head>/<body>, nada de classes ou estilos inline, nada de texto fora dessas tags.

Estrutura obrigatória, exatamente nesta ordem:

1. Um único <p> abrindo com o nome do produto em <strong> seguido de um parágrafo introdutório marcante, direto, que já comunica a proposta de valor do equipamento (ex: "<p><strong>Combat Shirt Ripstop Multicam</strong> foi desenvolvida para quem não pode falhar em campo...</p>").

2. <hr> e depois <h3>Construção e Materiais de Alta Resistência</h3> seguido de um <ul> com <li> destacando em <strong> os termos técnicos de maior impacto (ex: "<li><strong>Tecido Ripstop</strong>: resistente a rasgos e cortes, essencial para o uso diário em campo.</li>", também cobrindo Cordura, costuras reforçadas/travadas, tratamento hidrorrepelente, ferragens e fivelas, conforme o que se aplicar ao produto).

3. <hr> e depois <h3>Ergonomia e Funcionalidade Operacional</h3> seguido de um <ul> com <li> em <strong> sobre caimento, ajuste, mobilidade, bolsos/compartimentos, ventilação, compatibilidade com colete/fardamento — o que fizer sentido para o produto.

4. <hr> e depois <h3>Diferenciais do Equipamento</h3> seguido de um <ul> com <li> focados em uso tático, missões, rotina operacional, EDC (everyday carry) e durabilidade a longo prazo.

Regra adicional: se alguma informação necessária para uma seção não existir no texto original, escreva a seção mesmo assim de forma genérica e coerente para a categoria do produto (sem inventar especificações técnicas específicas, como medidas ou composições exatas, que não foram informadas), nunca omita uma seção da estrutura.

Se alguma informação não estiver no texto, use "" para textos e array vazio para listas nos outros campos do JSON (fora da descrição) — nunca invente dados factuais que não estejam no texto original.

Texto bruto colado pelo usuário:
"""
${raw}
"""`;
}

// Lista de modelos a tentar, em ordem de preferência. "gemini-flash-latest" é um
// alias oficial do Google que sempre aponta para o modelo Flash estável mais
// recente — evita que o recurso quebre quando um modelo específico for
// desativado no futuro. Os nomes fixos abaixo entram como reserva.
const GEMINI_MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-3.6-flash'];

export async function callGemini(apiKey, prompt) {
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

// Une as duas etapas: monta o prompt do produto, chama o Gemini e já devolve o JSON parseado.
export async function generateProdutoFromText(apiKey, rawText) {
  const text = await callGemini(apiKey, buildProdutoPrompt(rawText));
  return JSON.parse(text);
}
