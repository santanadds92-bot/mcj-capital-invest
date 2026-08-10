# Prompts para os 3 banners de categoria da QRV (Mochilas, Cutelaria, Calçados)

Copie e cole cada prompt no ChatGPT (ou outra ferramenta de geração de imagem). Os três seguem a mesma composição da referência — foto com gradiente escuro na base, título em branco bold, botão outline "conferir" — mas com produtos e paleta da QRV. Eles vão direto nos 3 cards de categoria do `index.html` (seção logo abaixo dos Lançamentos), substituindo o `hero-tatico.jpg` genérico que está lá hoje.

**Proporção para os três:** horizontal, aproximadamente 3:2 (ex: 600x360px ou 700x420px), pensado para ficar lado a lado em 3 colunas no site.

---

## Banner de Categoria 1 — Mochilas

Crie uma foto de produto para banner de e-commerce, proporção horizontal 3:2 (aproximadamente 600x360px), para a categoria "Mochilas" da loja QRV Artigos Táticos.

**Cena:** Uma mochila tática assault, na cor preta com detalhes em verde-oliva, com alças e fivelas MOLLE, apoiada sobre uma trilha de terra em uma floresta densa. Ao fundo, desfocado, um caminho de terra entre árvores, com luz suave de fim de tarde atravessando a folhagem (luz raking, tom quente). A mochila ocupa o lado direito do quadro, deixando o lado esquerdo mais escuro e limpo para receber texto.

**Composição/pós-produção:**
- Gradiente escuro (preto para transparente) cobrindo o canto inferior esquerdo da imagem, para dar contraste ao texto
- Tom de cor geral quente, verde-oliva e dourado, com sombras profundas — mesma atmosfera dos outros banners da QRV (nunca clara ou pastel)

**Texto sobre a imagem (canto inferior esquerdo):**
- Título grande, branco, negrito, tipografia condensada em caixa alta estilo militar (referência: Oswald Bold): "MOCHILAS"
- Abaixo do título, um botão pequeno retangular com borda dourada fina, fundo transparente/escuro e texto dourado em caixa baixa: "conferir"

**Estilo geral:** fotografia realista de still-life/produto ao ar livre, iluminação natural, alto contraste, visual "tático premium".

---

## Banner de Categoria 2 — Cutelaria

Crie uma foto de produto para banner de e-commerce, proporção horizontal 3:2 (aproximadamente 600x360px), para a categoria "Cutelaria" da loja QRV Artigos Táticos.

**Cena:** Uma faca tática com lâmina camuflada e cabo emborrachado, aberta e apoiada sobre uma tora de madeira rústica, próxima a uma fogueira desfocada ao fundo (brasas incandescentes criam pontos de luz quente/laranja). Ao lado da faca, um pedaço de corda paracord enrolada. Ambiente de acampamento noturno, escuro e atmosférico.

**Composição/pós-produção:**
- Gradiente escuro (preto para transparente) cobrindo o canto inferior esquerdo da imagem, para dar contraste ao texto
- Tom quente puxando para dourado/laranja nas luzes (reflexo da fogueira), com o restante da cena em preto/verde-oliva escuro — mesma atmosfera dos outros banners da QRV

**Texto sobre a imagem (canto inferior esquerdo):**
- Título grande, branco, negrito, tipografia condensada em caixa alta estilo militar (referência: Oswald Bold): "CUTELARIA"
- Abaixo do título, um botão pequeno retangular com borda dourada fina, fundo transparente/escuro e texto dourado em caixa baixa: "conferir"

**Estilo geral:** fotografia realista de still-life/produto em ambiente noturno de acampamento, alto contraste, clima rústico e "tático premium".

---

## Banner de Categoria 3 — Calçados

Crie uma foto de produto para banner de e-commerce, proporção horizontal 3:2 (aproximadamente 600x360px), para a categoria "Calçados" da loja QRV Artigos Táticos.

**Cena:** Um coturno/bota tática na cor coyote/caqui, em pé sobre folhas secas e terra, dentro de uma floresta com luz de fim de tarde atravessando as árvores ao fundo (desfocado). A bota ocupa o lado direito do quadro, com foco nítido nos detalhes do solado e dos cadarços.

**Composição/pós-produção:**
- Gradiente escuro (preto para transparente) cobrindo o canto inferior esquerdo da imagem, para dar contraste ao texto
- Tom quente, dourado e verde-oliva na vegetação e nas sombras — mesma atmosfera dos outros banners da QRV

**Texto sobre a imagem (canto inferior esquerdo):**
- Título grande, branco, negrito, tipografia condensada em caixa alta estilo militar (referência: Oswald Bold): "CALÇADOS"
- Abaixo do título, um botão pequeno retangular com borda dourada fina, fundo transparente/escuro e texto dourado em caixa baixa: "conferir"

**Estilo geral:** fotografia realista de still-life/produto ao ar livre, iluminação natural quente, alto contraste, visual "tático premium".

---

### Dica
Se o texto sair torto ou ilegível (comum em geradores de imagem), peça a versão **sem texto** de cada prompt (remova o bloco "Texto sobre a imagem") e escreva "MOCHILAS", "CUTELARIA" e "CALÇADOS" depois, direto no CSS do site — o card de categoria já está pronto pra isso em `assets/style.css` (`.category-tile`), então a foto só entra como fundo e o título/botão continuam sendo HTML real (mais nítido e fácil de trocar depois).
