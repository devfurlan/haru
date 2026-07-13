import * as Haptics from 'expo-haptics';

// Feedback tátil leve no toque de botões (micro-interação "toque" do design).
// Fire-and-forget e à prova de ambiente sem módulo nativo (ex.: web) - nunca lança.
export function tapLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Feedback de sucesso (confirmar vaga da fila, "deu certo"). Mesmo contrato à prova
// de ambiente sem módulo nativo.
export function notifySuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
