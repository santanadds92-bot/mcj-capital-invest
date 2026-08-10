# QRV Artigos Táticos — Planejamento do Site

Antes de tudo: preciso que você cole/anexe o **texto** da resposta do Gemini — o PDF que chegou aqui foi só a captura do Instagram (perfil, posts, destaques), não a resposta dele. Sem o texto eu não consigo fazer o comparativo ponto a ponto que você pediu. O que segue abaixo é a minha leitura independente, a partir do Instagram, de como eu montaria esse projeto no mesmo padrão da MCJ. Quando você colar a resposta do Gemini eu reviso este documento e marco exatamente o que eu manteria, cortaria ou acrescentaria da proposta dele.

## 1. O que o Instagram revela sobre a marca

**Perfil:** @qrv_artigostaticos — "QRV Artigos Táticos" — 882 posts, 19,8 mil seguidores.

**Bio:**
- Loja de equipamentos táticos
- Acessórios, vestuário e artigos táticos
- Enviamos para todo o Brasil
- Seja um revendedor QRV
- Compras via Direct e WhatsApp
- Endereço: Av. Santos Dumont, 61, Guarulhos — CEP 07180-270
- Link: qrvartigostaticos.taplink.ws

**Horário de funcionamento** (post fixado):
- Segunda a Quinta: 10h às 20h30
- Sexta: 10h às 19h
- Sábado: 09h às 16h

**Logo:** brasão circular estilo "war store" — fundo preto/verde-oliva escuro, escudo com silhueta de soldado + mira/crosshair, texto "QRV" em dourado/bronze no centro, "WAR STORE" arqueado acima e "ARTIGOS TÁTICOS" arqueado abaixo. Visual de patch militar bordado.

**Destaques (highlights) do perfil:** Funcionamento, Clientes, Bordados, Entregas, PMSP, Metal, Convites — isso já é um mapa de conteúdo/páginas que a loja considera importante.

**Serviço de customização/bordado** (tabela de preços vista num post):
- Fixação de divisas: R$ 10,00 cada
- Manopla: R$ 10,00
- Insígnia: R$ 5,00 cada
- Dom (dominó/nome de guerra): R$ 15,00
- Bordado na camisa: R$ 11,40

## 2. Paleta de cores (extraída do feed e da logo)

| Uso | Cor | Hex aproximado |
|---|---|---|
| Base escura | Preto quase puro | `#0b0b0c` |
| Verde militar principal | Verde-oliva | `#4b5320` / `#5a5f3d` |
| Camuflado (textura de fundo) | Verde/marrom mesclado | mix de `#3d4025`, `#5c5847`, `#2c2a20` |
| Destaque dourado/bronze (logo, preços, CTAs) | Dourado bronze | `#c9a463` (o mesmo tom que já usamos na MCJ, coincidência boa) |
| Alerta / promoção | Vermelho | `#c0392b` |
| Texto claro | Bege/off-white | `#f3ede1` |

A ideia: tema escuro tático (preto + oliva) com dourado/bronze como cor de destaque — visualmente "seller de milícia/tropa de elite premium", não um camuflado cartunesco. Dá pra manter a mesma sofisticação da MCJ, só trocando o dourado-joia por um dourado-metal-de-farda.

## 3. Categorias de produto (a partir do que você descreveu + Instagram)

1. Fardas e uniformes (Forças Armadas, PM, combat shirt, bombacha)
2. Calçados militares (coturnos)
3. Mochilas e bolsas táticas
4. Brevês e insígnias (metálico e emborrachado)
5. Divisas, manoplas, dominós/nome de guerra (bordado sob encomenda)
6. Coberturas (bonés, quepes, gorros)
7. Equipamentos de proteção e defesa (spray de pimenta, joelheiras/cotoveleiras)
8. Facas, canivetes e acessórios de lâmina
9. Kits para recrutamento (PM, Forças Armadas — bundle pronto)
10. Acessórios táticos (cintos, coldres, mosquetões, paracord)
11. Réplicas decorativas (baioneta, granada de airsoft) — checar se você quer vender isso publicamente ou só sob consulta, por causa de restrição de marketplace/anúncio
12. Personalização/Bordado (serviço, não produto — com a tabela de preços acima)

## 4. Estrutura de páginas do site

Mesmo espírito da MCJ: site institucional + catálogo dinâmico + painel admin de acesso único.

- **Home** — hero com a identidade QRV, categorias em destaque, produtos em destaque (coverflow como fizemos na MCJ), prova social (nº de seguidores/clientes, "enviamos para todo o Brasil"), CTA para WhatsApp.
- **Loja / Catálogo** — grid de produtos com filtro por categoria, tipo (farda/calçado/mochila/etc.), tamanho, faixa de preço, busca por nome.
- **Página de Produto** — fotos, descrição (gerada por IA a partir de texto bruto, igual fizemos no imóvel), variações (tamanho/cor quando aplicável), preço, botão "Comprar via WhatsApp" (em vez de carrinho/checkout — ver seção 6).
- **Bordado / Personalização** — página dedicada explicando o serviço, com a tabela de preços (fixação de divisa, manopla, insígnia, dom, bordado de camisa), e um formulário "Solicitar Bordado".
- **Seja um Revendedor** — formulário de contato para lojistas (isso já está na bio dele, é claramente importante pro negócio).
- **Quem Somos** — história da loja, endereço, horário de funcionamento.
- **Fale Conosco** — formulário + WhatsApp + endereço + mapa.
- **Admin (uso exclusivo seu)** — login único, CRUD de produtos, categorias, geração de descrição via IA, upload de fotos, controle de estoque simples (em estoque / sob encomenda / esgotado), mensagens de contato, solicitações de bordado, solicitações de revenda.

## 5. Banco de dados (Supabase) — mesmo padrão da MCJ

- **Auth:** um único usuário (seu e-mail), sem cadastro público de admin — igual à MCJ.
- **Tabela `produtos`**: código, nome, categoria, subcategoria, descrição (texto/markdown gerado por IA), preço, preço promocional (opcional), tamanhos disponíveis (array), cores (array), fotos (array, Storage), estoque/status (`disponível`, `sob encomenda`, `esgotado`), destaque (bool), status (`ativo`, `inativo`, `arquivado`), criado_em.
- **Tabela `categorias`**: nome, slug, ícone (pra montar o menu/filtros dinamicamente).
- **Tabela `mensagens_contato`**: igual à MCJ.
- **Tabela `solicitacoes_bordado`**: nome, telefone, tipo de peça, o que bordar (nome de guerra/insígnia/etc.), observações.
- **Tabela `solicitacoes_revenda`**: nome, telefone, cidade, tipo de negócio.
- **Storage:** bucket público de fotos de produto, upload só autenticado (admin), leitura pública.
- **RLS:** leitura pública só de produtos com `status = 'ativo'`; escrita só para o usuário autenticado — exatamente o modelo que já validamos na MCJ.

## 6. IA (Gemini) para descrição de produtos

Mesmo módulo `gemini-ai.js` que já existe, adaptado: em vez do prompt de imóvel (5 seções: Introdução, Estrutura, Diferenciais, Localização, Info Adicionais), um prompt de produto tático com estrutura tipo:
- Descrição curta (1-2 frases, pra card de listagem)
- Descrição completa (material, uso recomendado, tamanhos/variações, diferenciais)
- Ficha técnica em bullets (material, origem, compatibilidade com fardamento X)

Mesma lógica de "cole as infos brutas do produto → IA estrutura" que usamos no imóvel e no anunciar.html.

## 7. O que eu acrescentaria (além do que normalmente uma IA sugere de forma genérica)

- **Botão "Comprar via WhatsApp" em vez de checkout de verdade** — pelo que você descreveu, isso ainda é uma peça de apresentação pro seu amigo, e a própria bio dele já diz "Compras via Direct e WhatsApp". Monto o catálogo bonito e funcional, mas sem processar pagamento de fato na v1 — evita a complexidade (e o custo/burocracia) de gateway de pagamento antes de ele topar o projeto.
- **Página de Bordado/Personalização como página própria**, não só um campo dentro do produto — é claramente um serviço à parte com tabela de preço fixa, vi isso destacado no Instagram dele.
- **"Seja um Revendedor" como página e formulário dedicados** — está na bio, é um canal de negócio que ele já cultiva.
- **Indicador de estoque em 3 estados** (disponível / sob encomenda / esgotado) em vez de só ativo/inativo — faz sentido pra loja física com variação de estoque real.
- **Seletor de tamanho/cor no produto**, já que farda, coturno e boné têm essa variação natural.
- **Selo "Envio para todo o Brasil"** em destaque no header/footer, é um diferencial que ele já usa.

## 8. O que eu cortaria/simplificaria pra essa v1 de demonstração

- **Sem carrinho de compras multi-item nem checkout de pagamento** (ver item acima) — adiciona semanas de trabalho e não é o que decide se ele topa ou não.
- **Sem sistema de inventário complexo** (baixa automática de estoque por venda) — só um campo de status manual, como o de imóveis.
- **Sem multi-vendedor/marketplace** — é loja única dele, não plataforma.
- **Réplicas decorativas (baioneta, granada) fora do catálogo público inicial**, ou numa categoria à parte com aviso — para não confundir com armamento real e evitar problema de moderação se algum dia rodar anúncio pago.

## 9. Comparativo com a resposta do Gemini

### ⚠️ Ponto crítico: a stack proposta não é a que usamos na MCJ

O Gemini escreveu "mantendo a exata mesma arquitetura robusta que usamos na MCJ Capital Invest", mas descreveu **Next.js (App Router) + Shadcn/UI + Tailwind + Framer Motion + React Hook Form + Zod + Route Handlers**. A MCJ inteira foi construída em **HTML/CSS/JS puro, sem framework, sem build, com o Supabase client chamado direto do navegador**, e deploy direto no Vercel via GitHub. São arquiteturas bem diferentes — o Gemini não tinha essa informação.

**Decisão confirmada com você:** seguimos com HTML/CSS/JS puro, exatamente como na MCJ. Menos peça móvel, deploy simples, e eu itero arquivo por arquivo com você em tempo real como já fizemos.

### ✅ O que eu aproveito da proposta do Gemini (é genuinely melhor que a minha primeira versão)

- **Categorização por corporação** (Exército, Aeronáutica, PMESP, batalhão) como filtro, além da categoria de produto — muito mais fiel ao público de quem compra farda/insígnia.
- **Lista de produtos mais detalhada**: japona PMESP, conjunto rip stop, moletom, camiseta gola careca, coldre velado/ostensivo (polímero, couro, neoprene, axilar), porta-algemas, lanterna tática (ex. X900), balaclava, bandoleira, kit cantil (cantil + caneca + porta-cantil), kit sobrevivência na selva. Vou incorporar tudo isso na lista de produtos de demonstração.
- **Campo "Nome de Guerra / Batalhão" no próprio produto customizável** — melhor que só ter a página de Bordado separada; farei as duas coisas: produto com `is_customizable` abre um campo de personalização, E a página `/bordados` continua existindo pro serviço avulso (fixação de divisa, manopla, etc.).
- **Slogan sugerido "Equipando você para o combate"** — bom gancho, uso como possível headline do hero (ajusto o tom com você antes de bater o martelo).
- **Paleta de cores** — praticamente idêntica à que eu já tinha extraído (preto + verde-oliva + dourado/ocre); vou adotar os hex dele como referência principal por serem levemente mais neutros/legíveis em UI escura.

### ❌ O que eu não levo para frente da proposta dele

- **Next.js, Shadcn/UI, Framer Motion, React Hook Form + Zod, Route Handlers** — troca de arquitetura, decidido que não segue.
- **Tabela `admin_users` separada** — desnecessária; a RLS já resolve checando `auth.jwt() ->> 'email'` direto na policy, exatamente como fizemos na MCJ (um único e-mail autorizado, sem tabela extra).
- **`technical_specs JSONB` genérico** — troco por colunas normais (tamanhos, cores, corporação) no mesmo estilo direto que usamos nos imóveis, mais fácil de filtrar e editar no admin sem parsing de JSON.
- **Réplicas decorativas (baioneta, granada) sem nenhuma ressalva** — mantenho minha recomendação de deixá-las numa categoria separada com aviso, por segurança de moderação.

## 10. Próximo passo

Plano mesclado e validado. Já tenho o suficiente pra começar a construir a base do site (estrutura de páginas, Supabase, admin) no mesmo padrão da MCJ. Me diz se quer revisar mais algum ponto antes, ou se posso começar a codificar.
