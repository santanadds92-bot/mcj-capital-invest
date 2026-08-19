# MCJ Capital Invest

Site institucional e vitrine de imoveis de alto padrao para compra e locacao, com captacao de leads (compradores, locatarios e proprietarios) e atendimento automatizado via chatbot com IA.

**Demo:** https://mcj-capital-invest-omega.vercel.app

## Stack

HTML5 + CSS3 + JavaScript ES6 (modulos nativos, sem framework nem bundler). Backend-as-a-Service via Supabase (Postgres + Auth + Storage, protegido por Row Level Security). Duas funcoes serverless proprias (Vercel/Node.js) atuam como proxy seguro para a API do Google Gemini - nenhuma chave de IA e exposta ao navegador do visitante.

## Funcionalidades

- Catalogo de imoveis com busca/filtro por finalidade (Comprar/Alugar) e pagina de detalhe com galeria, video, mapa e imoveis similares
- - Formulario publico "Anunciar Seu Imovel", com preenchimento automatico por IA via proxy serverless
  - - Painel administrativo com CRUD completo de imoveis, aprovacao de anuncios pendentes e importacao em massa via CSV
    - - Chatbot publico de atendimento com IA generativa, com acesso ao catalogo ativo do site
      - - Rate limiting distribuido via Supabase para os dois recursos de IA
        - - Conformidade tecnica com LGPD (politica de privacidade, termos de uso, banner de cookies)
         
          - ## Seguranca
         
          - Arquitetura de proxy serverless protege 100% das chaves de API de IA do acesso pelo navegador. Row Level Security habilitado e coerente em todas as tabelas. Projeto passou por auditoria propria: correcao verificada de XSS armazenado em tres pontos originalmente identificados, e nenhuma chave sensivel exposta no client (secret scanning do GitHub sem alertas).
         
          - ## Estrutura
         
          - - index.html, comprar.html, alugar.html, imovel.html - vitrine e detalhe de imoveis
            - - anunciar.html, contato.html - captacao de leads
              - - admin.html - painel administrativo (protegido por login)
                - - api/ - funcoes serverless (proxy de IA: gerar-imovel-ia.js, chat-gemini.js)
                  - - assets/ - CSS, JavaScript e imagens
