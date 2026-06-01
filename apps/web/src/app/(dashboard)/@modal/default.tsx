// Slot @modal vazio por padrão: só renderiza algo quando uma rota
// interceptadora (.)... casa com a navegação. Necessário pra que o slot não
// quebre o restante das rotas do dashboard.
export default function ModalDefault() {
  return null;
}
