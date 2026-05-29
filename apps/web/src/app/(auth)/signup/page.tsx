import { redirect } from 'next/navigation';

// Cadastro público desativado: a captação acontece pelo formulário de interesse.
// SignupForm/signUp seguem disponíveis para criação manual de contas.
export default function SignupPage() {
  redirect('/interesse');
}
