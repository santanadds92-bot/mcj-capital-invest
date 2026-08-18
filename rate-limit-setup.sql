-- ============================================================================
-- Rate limit distribuído (Supabase) — MCJ Capital Invest
-- ============================================================================
-- Rode este script UMA VEZ no SQL Editor do Supabase (Project → SQL Editor).
--
-- Por que isso é necessário: as funções serverless da Vercel (api/gerar-
-- imovel-ia.js e api/chat-gemini.js) rodavam com um contador de requisições
-- em MEMÓRIA do processo (uma variável Map em JS). Isso funciona bem contra
-- um script simples repetindo chamadas rapidamente, mas tem uma limitação
-- conhecida: a Vercel pode rodar cada requisição em uma instância/cold start
-- diferente, e cada instância tem sua própria memória — então o contador não
-- é realmente compartilhado entre todas as chamadas. Um atacante mais
-- insistente (ou só o tráfego normal distribuído entre instâncias) consegue
-- passar do limite pretendido.
--
-- Esta tabela + função abaixo resolve isso: o contador fica no banco de
-- dados (compartilhado de verdade por qualquer instância que chamar), e a
-- função check_rate_limit() faz a checagem e o incremento em uma única
-- operação atômica (com "for update", trava a linha durante a transação),
-- evitando condição de corrida quando duas requisições do mesmo IP chegam
-- ao mesmo tempo em instâncias diferentes.
--
-- Segurança: a tabela NÃO tem nenhuma policy de RLS liberando acesso a
-- "anon" ou "authenticated" — ou seja, é 100% inacessível para o navegador
-- do visitante e para a chave anon pública já usada no restante do site.
-- Só a service_role key consegue lê-la/escrevê-la (a service_role ignora
-- RLS por padrão no Supabase). Essa service_role key é nova neste projeto:
-- ela deve ser configurada SOMENTE como variável de ambiente no servidor da
-- Vercel (SUPABASE_SERVICE_ROLE_KEY), nunca no código-fonte, nunca em
-- nenhum arquivo dentro de /assets (que roda no navegador).
-- ============================================================================

create table if not exists public.rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- Propositalmente NENHUMA policy é criada aqui. Com RLS ativado e zero
-- policies, a tabela fica bloqueada para "anon" e "authenticated" — só
-- service_role (que ignora RLS) consegue acessá-la.

-- Função atômica de "verificar e incrementar". SECURITY DEFINER para rodar
-- com os privilégios do dono da função (não do chamador), e ainda assim só
-- é executável por quem tiver permissão explícita (revogada de "public" e
-- concedida só a service_role logo abaixo).
create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_window_ms bigint,
  p_max_requests integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits;
begin
  -- Limpeza oportunista de linhas antigas (mantém a tabela pequena sem
  -- precisar de um cron/job separado).
  delete from public.rate_limits
  where updated_at < v_now - interval '1 day';

  select * into v_row from public.rate_limits where bucket_key = p_bucket_key for update;

  if v_row is null then
    insert into public.rate_limits (bucket_key, window_start, request_count, updated_at)
    values (p_bucket_key, v_now, 1, v_now);
    return false; -- primeira requisição da janela: não excedeu o limite
  end if;

  if extract(epoch from (v_now - v_row.window_start)) * 1000 > p_window_ms then
    -- janela anterior expirou: reinicia a contagem
    update public.rate_limits
    set window_start = v_now, request_count = 1, updated_at = v_now
    where bucket_key = p_bucket_key;
    return false;
  end if;

  update public.rate_limits
  set request_count = request_count + 1, updated_at = v_now
  where bucket_key = p_bucket_key;

  return (v_row.request_count + 1) > p_max_requests;
end;
$$;

revoke all on function public.check_rate_limit(text, bigint, integer) from public;
grant execute on function public.check_rate_limit(text, bigint, integer) to service_role;

-- ============================================================================
-- Depois de rodar este script:
-- 1. No painel do Supabase: Project Settings → API → copie a "service_role"
--    key (é diferente da "anon"/"publishable" key já usada no site).
-- 2. No painel da Vercel: Project Settings → Environment Variables →
--    adicione SUPABASE_SERVICE_ROLE_KEY com esse valor.
-- 3. Redeploy do projeto na Vercel para a variável entrar em vigor.
-- ============================================================================
