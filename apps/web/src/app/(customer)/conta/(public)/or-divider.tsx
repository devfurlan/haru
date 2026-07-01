/** Divisória "ou" entre o botão do Google e o form de e-mail/senha. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs">ou</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
