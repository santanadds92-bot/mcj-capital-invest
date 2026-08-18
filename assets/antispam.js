// Proteções simples contra spam nos formulários públicos (Fale Conosco e
// Anunciar Seu Imóvel). Não substitui um CAPTCHA de verdade, mas barra a
// grande maioria de envios automatizados por bots sem exigir nenhuma lib
// externa nem fricção extra para uma pessoa real preenchendo o formulário.

// Honeypot: campo escondido via CSS (.hp-field) que só um bot preencheria —
// uma pessoa nunca vê nem interage com ele. Se vier preenchido no envio,
// tratamos como spam e ignoramos silenciosamente (sem alertar o bot de que
// foi bloqueado, pra não incentivá-lo a tentar contornar).
export function isHoneypotFilled(form, fieldName) {
  const field = form.elements[fieldName];
  return !!(field && field.value.trim());
}

// Trava por dispositivo: impede reenvios do mesmo formulário em menos de
// `minMs` milissegundos, usando localStorage. Não é à prova de burla (um bot
// pode limpar o localStorage ou usar aba anônima), mas barra o caso comum de
// script em loop batendo no formulário repetidamente do mesmo navegador.
const DEFAULT_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos

export function getCooldownRemaining(storageKey, minMs = DEFAULT_COOLDOWN_MS) {
  try {
    const last = Number(localStorage.getItem(storageKey) || 0);
    const remaining = minMs - (Date.now() - last);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export function markSubmitted(storageKey) {
  try {
    localStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // localStorage indisponível (modo privado restrito etc.) — sem trava,
    // mas não bloqueia o envio real do usuário.
  }
}
