// Meta Cloud API webhook payload types

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: Array<{
      profile: { name: string };
      wa_id: string;
    }>;
    messages?: WebhookMessage[];
    // Coexistence: mensagens que o próprio dono enviou pelo WhatsApp Business App
    // depois do número entrar em coexistence chegam aqui (campo `smb_message_echoes`),
    // não em `messages`. No echo, `from` = número do negócio e `to` = cliente.
    message_echoes?: WebhookMessage[];
    statuses?: Array<{
      id: string;
      status: string;
      timestamp: string;
      recipient_id: string;
    }>;
  };
  field: string;
}

export interface MediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
  filename?: string;
  voice?: boolean;
}

export interface WebhookMessage {
  from: string;
  /// Presente nos echos de coexistence (`smb_message_echoes`): o cliente destino.
  to?: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'interactive' | 'button';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  button?: { text: string; payload: string };
  audio?: MediaObject;
  image?: MediaObject;
  video?: MediaObject;
  document?: MediaObject;
  sticker?: MediaObject;
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}
