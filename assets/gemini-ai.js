// Módulo compartilhado de IA (Google Gemini) — usado tanto no painel admin
// (admin.js) quanto na página pública "Anunciar Seu Imóvel" (anunciar.html).
//
// Por que não existe uma "chave padrão do sistema" embutida aqui: qualquer
// chave colocada em um arquivo JS servido publicamente pode ser lida por
// qualquer visitante do site (basta abrir o código-fonte) e usada por
// terceiros, gerando cobranças na conta do Google de quem é dono da chave.
// Por isso cada pessoa que for gerar cadastros por IA (você no admin, ou um
// proprietário anunciando um imóvel) cola sua própria chave gratuita, que
// fica salva somente no navegador dela (localStorage), nunca é enviada para
// o servidor da MCJ nem para nenhum outro lugar além da própria API do Google.

export const GEMINI_KEY_STORAGE = 'mcj_gemini_api_key';

export function getGeminiKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
}

export function setGeminiKey(key) {
  localStorage.setItem(GEMINI_KEY_STORAGE, key);
}

export function buildImovelPrompt(raw) {
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
              maxOutputTokens: 4096, // dá espaço suficiente para a descrição longa e completa exigida no prompt
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

// Une as duas etapas: monta o prompt do imóvel, chama o Gemini e já devolve o JSON parseado.
export async function generateImovelFromText(apiKey, rawText) {
  const text = await callGemini(apiKey, buildImovelPrompt(rawText));
  return JSON.parse(text);
}
