# Prompt para posicionar a logo oficial da QRV no banner hero

## ⚠️ Importante antes de usar o GPT
Geradores de imagem (inclusive o do ChatGPT) **redesenham** tudo que recebem — mesmo quando você manda "não altere nada", eles tendem a recriar a logo com pequenas distorções: letras trocadas, brasão levemente diferente, proporções mudando. Como você disse que essa logo é oficial e não pode mudar em nada, o jeito 100% seguro é eu inserir o arquivo real da logo (`assets/logo.png`, que já está no site) diretamente por código, sem gerar nada — fica pixel-perfect, exatamente igual ao arquivo oficial. Posso fazer isso agora mesmo no `index.html`, é só confirmar.

Se mesmo assim você quiser tentar gerar via GPT (por exemplo para testar um efeito de integração com o fundo, ou gerar uma versão em outra resolução), seguem o prompt e as instruções de conferência abaixo.

---

## Prompt para o GPT

Envie as duas imagens anexadas ao ChatGPT (a screenshot do banner com o retângulo vermelho marcado, e o arquivo oficial da logo da QRV) junto com o texto:

> Estas são duas imagens de referência: a primeira é o banner hero do site da QRV Artigos Táticos, com um retângulo vermelho marcando exatamente onde a logo deve entrar. A segunda é a logo oficial da QRV (brasão circular com soldado, mira/crosshair, faixas "WAR STORE" e "ARTIGOS MILITARES", e o texto "EQUIPANDO VOCÊ PARA O COMBATE").
>
> Gere a imagem final do banner com a logo posicionada exatamente dentro da área marcada em vermelho, ocupando a largura total da faixa (da ponta esquerda até a ponta direita do retângulo) e centralizada verticalmente dentro dela. O retângulo vermelho é só uma referência de posição e tamanho — ele **não deve aparecer** na imagem final.
>
> **Regra mais importante: reproduza a logo exatamente como está na imagem enviada, sem alterar absolutamente nada nela** — nenhuma letra, cor, proporção, ícone ou elemento do brasão pode mudar. Não recrie a logo do zero: trate-a como um elemento fixo que apenas será redimensionado (mantendo a proporção original) e posicionado sobre o fundo do banner. Não adicione bordas, sombras fortes ou efeitos que distorçam a leitura da logo — no máximo uma sombra suave e sutil por trás dela, só para destacá-la levemente do fundo escuro camuflado.
>
> Mantenha o restante do banner (fundo camuflado tático, textos "EQUIPANDO VOCÊ PARA O COMBATE", "399 R$", botão "APROVEITAR AGORA" e os dots do carrossel) exatamente como estão na imagem original — a única mudança é a inserção da logo na área marcada.

---

## Depois de gerar
Antes de aprovar o resultado, compare lado a lado com o arquivo oficial (`assets/logo.png`) e confira:
- O texto "WAR STORE", "QRV", "ARTIGOS MILITARES" e "EQUIPANDO VOCÊ PARA O COMBATE" está com a grafia exatamente igual (sem letras erradas ou borradas)
- O ícone de mira/crosshair e a silhueta do soldado estão idênticos ao original
- As proporções do brasão circular não ficaram achatadas ou esticadas

Se qualquer um desses pontos vier diferente do original, é sinal de que o gerador "redesenhou" a logo — nesse caso o caminho seguro é eu aplicar o arquivo real da logo direto no código do banner, como comentei acima.
