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
  status text not null default 'ativo'        -- 'ativo' ou 'inativo'
);

-- 1b) Se a tabela "imoveis" já existia antes (criada em uma execução anterior deste
--     script) e você só quer adicionar a coluna nova de IPTU, rode apenas esta linha:
-- alter table public.imoveis add column if not exists iptu numeric;

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
-- Depois de rodar este script:
-- 1. Vá em Authentication > Providers > Email e DESLIGUE
--    "Allow new users to sign up" (assim ninguém além de você
--    consegue criar conta).
-- 2. Vá em Authentication > Users > Add User e crie o SEU
--    usuário admin (e-mail + senha). É esse login que você vai
--    usar no admin.html.
-- ============================================================
