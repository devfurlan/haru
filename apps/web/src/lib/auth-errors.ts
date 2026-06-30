// Tradução dos códigos de erro de signup do Supabase Auth para PT-BR. Compartilhado
// entre o cadastro do DONO ((auth)/actions.ts) e o do CLIENTE ((customer)/actions.ts)
// para não divergirem as mensagens.

export function traduzErroSignUp(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return 'Este email já está cadastrado.';
    case 'weak_password':
      return 'Senha muito fraca. Use ao menos 8 caracteres.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas. Tente novamente em alguns minutos.';
    case 'signup_disabled':
      return 'O cadastro está temporariamente desativado.';
    default:
      if (error.message && /already registered|already exists/i.test(error.message)) {
        return 'Este email já está cadastrado.';
      }
      return 'Falha ao criar conta';
  }
}
