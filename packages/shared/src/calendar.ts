// "Adicionar à agenda" para os e-mails de confirmação: link do Google Agenda (botão de
// 1 toque) + conteúdo .ics (anexo, add-to-calendar nativo em Apple/Gmail/Outlook).
// Funções puras (só Date), sem deps. `startIso` é um instante em UTC e a saída sai
// sempre em UTC "Z", então o convite cai no horário certo qualquer que seja o fuso de
// quem recebe. Espelhado (de propósito) em apps/bot/src/lib/calendarInvite.ts.

export type CalendarEvent = {
  title: string;
  startIso: string;
  minutes: number;
  location?: string;
  description?: string;
};

const enc = encodeURIComponent;

// 20260705T183000Z - UTC compacto que Google/ICS esperam.
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function range(e: CalendarEvent) {
  const start = new Date(e.startIso);
  const end = new Date(start.getTime() + e.minutes * 60000);
  return { start, end };
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const { start, end } = range(e);
  const parts = ['action=TEMPLATE', `text=${enc(e.title)}`, `dates=${utc(start)}/${utc(end)}`];
  if (e.location) parts.push(`location=${enc(e.location)}`);
  if (e.description) parts.push(`details=${enc(e.description)}`);
  return `https://calendar.google.com/calendar/render?${parts.join('&')}`;
}

// Escapa vírgula/;/\ e quebra de linha em campos de texto do ICS (RFC 5545).
const escIcs = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

// Dobra linha > 75 (RFC 5545): continua com CRLF + espaço. ponytail: dobra por
// caractere, não octeto - dobro em 72 pra sobrar margem pros multibyte (ê, ç, ·).
function fold(line: string): string {
  if (line.length <= 72) return line;
  const chunks = [line.slice(0, 72)];
  let rest = line.slice(72);
  while (rest.length > 71) {
    chunks.push(' ' + rest.slice(0, 71));
    rest = rest.slice(71);
  }
  chunks.push(' ' + rest);
  return chunks.join('\r\n');
}

// Conteúdo .ics (VCALENDAR/VEVENT, METHOD:PUBLISH) pra anexar no e-mail. `uid` estável
// por agendamento faz o mesmo convite atualizar em vez de duplicar na agenda.
export function buildIcs(e: CalendarEvent & { uid: string }): string {
  const { start, end } = range(e);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Demandae//agenda//PT-BR',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${utc(start)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escIcs(e.title)}`,
  ];
  if (e.location) lines.push(`LOCATION:${escIcs(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${escIcs(e.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}
