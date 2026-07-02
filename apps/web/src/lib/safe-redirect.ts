// Guarda contra open redirect nos fluxos de auth (callback OAuth / confirmação de e-mail).
// O `?next=` é caminho interno do app; um valor absoluto ou protocol-relative
// (`//host`, `/\host`, que o navegador resolve como host EXTERNO) viraria um redirect
// para fora do domínio - trampolim de phishing após o login legítimo.

/**
 * Retorna `param` se for um caminho interno seguro; senão `fallback`.
 * Seguro = começa com '/' e NÃO com '//' nem '/\' (protocol-relative).
 * Ex.: '/conta' → ok · '//evil.com' → fallback · '/\\evil.com' → fallback · null → fallback.
 */
export function safeInternalPath(param: string | null | undefined, fallback: string): string {
  if (param && param.startsWith('/') && !param.startsWith('//') && !param.startsWith('/\\')) {
    return param;
  }
  return fallback;
}
