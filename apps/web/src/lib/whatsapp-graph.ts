// Versão e base da Meta Graph API, centralizadas pra não repetir o `v21.0`
// hardcoded em cada arquivo (whatsapp-profile, whatsapp-invite, whatsapp-templates,
// embedded-signup). Trocar a versão num lugar só.

export const GRAPH_VERSION = 'v21.0';

export const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
