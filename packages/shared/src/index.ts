// Lógica pura (só Date/Intl, zero Prisma/Next/React) compartilhada entre os apps:
// web (Next) e mobile (Expo). Cálculo de horários livres, geração dos dias de
// agendamento no fuso do tenant e formatação BR (moeda, telefone, CPF/CNPJ, datas).
export * from './availability';
export * from './booking-days';
export * from './format';
export * from './search';
