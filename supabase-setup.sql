-- ============================================================
-- MCJ Capital Invest — Setup do banco de dados no Supabase
-- Cole este script inteiro em: Supabase > SQL Editor > New Query
-- e clique em "Run". Pode rodar tudo de uma vez.
-- ============================================================

-- 1) Tabela de imóveis
create table if not exists public.imoveis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  codigo text unique not null,
  titulo text not null,
  finalidade text not null default 'comprar', -- 'comprar' ou 'alugar'
  tipo text,                                  -- Casa, Apartamento, Comercial, Cobertura...
  bairro text,
  cidade text,
  endereco text,                              -- endereço completo, usado no mapa
  quartos int default 0,
  banheiros int default 0,
  suites int default 0,
  vagas int default 0,
  area numeric,
  descricao text,
  valor numeric,
  valor_condominio numeric,
  iptu numeric,                                -- valor do IPTU
  video_url text,                             -- link do YouTube ou Vimeo
  fotos jsonb not null default '[]'::jsonb,   -- lista de URLs das fotos
  destaque boolean not null default false,
  status text not null default 'ativo',       -- 'ativo', 'inativo' ou 'pendente' (anúncio público aguardando aprovação)
  proprietario_nome text,                     -- preenchido quando o imóvel vem do formulário público "Anunciar"
  proprietario_telefone text,
  proprietario_email text
);

-- 1b) Se a tabela "imoveis" já existia antes (criada em uma execução anterior deste
--     script), rode as linhas abaixo para adicionar as colunas novas sem perder nada:
-- alter table public.imoveis add column if not exists iptu numeric;
-- alter table public.imoveis add column if not exists proprietario_nome text;
-- alter table public.imoveis add column if not exists proprietario_telefone text;
-- alter table public.imoveis add column if not exists proprietario_email text;

-- 2) Segurança: habilita RLS (controle de acesso por linha)
alter table public.imoveis enable row level security;

-- 3) Qualquer visitante do site pode LER imóveis ativos
drop policy if exists "Leitura pública de imóveis ativos" on public.imoveis;
create policy "Leitura pública de imóveis ativos"
  on public.imoveis for select
  using (status = 'ativo');

-- 4) Só usuário logado (você, admin) pode inserir/editar/excluir
drop policy if exists "Admin insere imóveis" on public.imoveis;
create policy "Admin insere imóveis"
  on public.imoveis for insert
  to authenticated
  with check (true);

drop policy if exists "Admin edita imóveis" on public.imoveis;
create policy "Admin edita imóveis"
  on public.imoveis for update
  to authenticated
  using (true);

drop policy if exists "Admin exclui imóveis" on public.imoveis;
create policy "Admin exclui imóveis"
  on public.imoveis for delete
  to authenticated
  using (true);

-- também deixa você (admin) ler os inativos no painel
drop policy if exists "Admin lê todos os imóveis" on public.imoveis;
create policy "Admin lê todos os imóveis"
  on public.imoveis for select
  to authenticated
  using (true);

-- 5) Bucket de Storage para as fotos dos imóveis
insert into storage.buckets (id, name, public)
values ('imoveis-fotos', 'imoveis-fotos', true)
on conflict (id) do nothing;

-- 6) Qualquer visitante pode VER as fotos (bucket público)
drop policy if exists "Leitura pública das fotos" on storage.objects;
create policy "Leitura pública das fotos"
  on storage.objects for select
  using (bucket_id = 'imoveis-fotos');

-- 7) Só usuário logado pode enviar/excluir fotos
drop policy if exists "Admin envia fotos" on storage.objects;
create policy "Admin envia fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'imoveis-fotos');

drop policy if exists "Admin exclui fotos" on storage.objects;
create policy "Admin exclui fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'imoveis-fotos');

-- ============================================================
-- PARTE 2 — Anúncios públicos ("Anunciar Seu Imóvel") + Fale Conosco
-- Se você já rodou a Parte 1 antes, pode colar e rodar só o bloco
-- abaixo (não precisa repetir o que já rodou).
-- ============================================================

-- 8) Permite que QUALQUER visitante (não logado) envie um imóvel pela página
--    "Anunciar Seu Imóvel", mas SOMENTE com status 'pendente' — ele fica
--    invisível na busca pública (que só mostra status = 'ativo') até você
--    aprovar manualmente no painel admin.
drop policy if exists "Público envia imóvel para aprovação" on public.imoveis;
create policy "Público envia imóvel para aprovação"
  on public.imoveis for insert
  to anon
  with check (status = 'pendente');

-- 9) Permite que o visitante envie as fotos do imóvel anunciado (mesmo bucket
--    já usado pelo admin). O bucket é público para leitura, então as fotos
--    aparecem no site normalmente depois que o anúncio é aprovado.
drop policy if exists "Público envia fotos (anúncio)" on storage.objects;
create policy "Público envia fotos (anúncio)"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'imoveis-fotos');

-- 10) Tabela de mensagens recebidas pelo formulário "Fale Conosco"
create table if not exists public.mensagens_contato (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nome text not null,
  email text,
  telefone text,
  mensagem text not null,
  lida boolean not null default false
);

alter table public.mensagens_contato enable row level security;

-- Qualquer visitante pode ENVIAR uma mensagem de contato
drop policy if exists "Público envia mensagem de contato" on public.mensagens_contato;
create policy "Público envia mensagem de contato"
  on public.mensagens_contato for insert
  to anon
  with check (true);

-- Só o admin (logado) pode LER, marcar como lida ou excluir mensagens
drop policy if exists "Admin lê mensagens de contato" on public.mensagens_contato;
create policy "Admin lê mensagens de contato"
  on public.mensagens_contato for select
  to authenticated
  using (true);

drop policy if exists "Admin atualiza mensagens de contato" on public.mensagens_contato;
create policy "Admin atualiza mensagens de contato"
  on public.mensagens_contato for update
  to authenticated
  using (true);

drop policy if exists "Admin exclui mensagens de contato" on public.mensagens_contato;
create policy "Admin exclui mensagens de contato"
  on public.mensagens_contato for delete
  to authenticated
  using (true);

-- ============================================================
-- Depois de rodar este script:
-- 1. Vá em Authentication > Providers > Email e DESLIGUE
--    "Allow new users to sign up" (assim ninguém além de você
--    consegue criar conta).
-- 2. Vá em Authentication > Users > Add User e crie o SEU
--    usuário admin (e-mail + senha). É esse login que você vai
--    usar no admin.html.
-- ============================================================
