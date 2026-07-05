// Links "adicionar à agenda" por provedor - só templates de URL, sem dependência
// nativa de calendário. Google/Yahoo/Outlook abrem no app/navegador; Apple usa um
// data URI .ics. Funções puras (sem imports de RN) pra ficarem testáveis por fora.
// ponytail: Apple via data:text/calendar pode não abrir o Calendar em todo iOS - se
// virar requisito, hospedar o .ics num endpoint (Content-Type text/calendar) ou usar
// expo-calendar.

export type CalendarEvent = {
  title: string;
  startIso: string;
  minutes: number;
  location: string;
};

const enc = encodeURIComponent;

// 20260705T183000Z - UTC compacto que Google/Yahoo/ICS esperam.
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function range(e: CalendarEvent) {
  const start = new Date(e.startIso);
  const end = new Date(start.getTime() + e.minutes * 60000);
  return { start, end };
}

export function googleUrl(e: CalendarEvent) {
  const { start, end } = range(e);
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${enc(e.title)}&dates=${utc(start)}/${utc(end)}&location=${enc(e.location)}`
  );
}

export function yahooUrl(e: CalendarEvent) {
  const { start, end } = range(e);
  return (
    'https://calendar.yahoo.com/?v=60' +
    `&title=${enc(e.title)}&st=${utc(start)}&et=${utc(end)}&in_loc=${enc(e.location)}`
  );
}

export function outlookUrl(e: CalendarEvent) {
  const { start, end } = range(e);
  return (
    'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent' +
    `&subject=${enc(e.title)}&startdt=${enc(start.toISOString())}&enddt=${enc(end.toISOString())}&location=${enc(e.location)}`
  );
}

// Texto de campo ICS: escapar vírgula/ponto-e-vírgula/barra e quebra de linha.
const escIcs = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');

export function appleIcsUri(e: CalendarEvent) {
  const { start, end } = range(e);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Demandae//app//PT',
    'BEGIN:VEVENT',
    `UID:${utc(start)}-demandae`,
    `DTSTAMP:${utc(start)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escIcs(e.title)}`,
    `LOCATION:${escIcs(e.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${enc(ics)}`;
}
