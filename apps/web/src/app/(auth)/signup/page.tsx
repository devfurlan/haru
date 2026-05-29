import { redirect } from 'next/navigation';

// Cadastro público desativado: a captação acontece pelo modal de interesse na landing.
// SignupForm/signUp seguem disponíveis para criação manual de contas.
export default function SignupPage() {
  redirect('/');
}
