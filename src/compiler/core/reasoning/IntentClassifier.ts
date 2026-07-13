// ─── Intent Classifier ────────────────────────────────────────────────────────
// Lightweight regex/heuristic classifier — runs synchronously.
// Replace the body of classify() with an LLM call in production.

export type Intent =
  | 'automation'
  | 'data-pipeline'
  | 'notification'
  | 'integration'
  | 'analysis'
  | 'generation'
  | 'monitoring'
  | 'scheduling';

export interface ClassificationResult {
  primaryIntent:   Intent;
  secondaryIntents: Intent[];
  triggerType:     'event' | 'schedule' | 'webhook' | 'form' | 'manual';
  services:        string[];
  actionVerbs:     string[];
  dataTypes:       string[];
  hasAI:           boolean;
  confidence:      number;   // 0–100
}

// ─── Service catalogue (kept in sync with blueprintMocks for consistency) ─────

const SERVICE_KEYWORDS: Array<{ name: string; keywords: string[] }> = [
  { name: 'Gmail',       keywords: ['email','gmail','correo','mail'] },
  { name: 'Outlook',     keywords: ['outlook','office365','microsoft mail'] },
  { name: 'Slack',       keywords: ['slack'] },
  { name: 'HubSpot',     keywords: ['hubspot','crm','customer','cliente'] },
  { name: 'Salesforce',  keywords: ['salesforce'] },
  { name: 'Shopify',     keywords: ['shopify','tienda','pedido','order'] },
  { name: 'Stripe',      keywords: ['stripe','pago','payment','cobro'] },
  { name: 'Notion',      keywords: ['notion'] },
  { name: 'Jira',        keywords: ['jira','ticket','incidencia'] },
  { name: 'GitHub',      keywords: ['github','git','repositorio'] },
  { name: 'Zendesk',     keywords: ['zendesk','soporte','support'] },
  { name: 'Twilio',      keywords: ['twilio','sms','whatsapp'] },
  { name: 'Google Sheets',keywords: ['sheets','spreadsheet','hoja'] },
  { name: 'Airtable',    keywords: ['airtable'] },
  { name: 'SendGrid',    keywords: ['sendgrid','newsletter'] },
  { name: 'Twitter/X',   keywords: ['twitter','tweet','x.com'] },
  { name: 'LinkedIn',    keywords: ['linkedin'] },
  { name: 'PostgreSQL',  keywords: ['postgres','sql','database','base de datos'] },
  { name: 'AWS S3',      keywords: ['s3','aws','bucket'] },
  { name: 'PDF Engine',  keywords: ['pdf','factura','invoice','documento'] },
  { name: 'ERP',         keywords: ['erp','sap','navision'] },
  { name: 'Telegram',    keywords: ['telegram'] },
];

const INTENT_PATTERNS: Array<{ intent: Intent; patterns: RegExp[] }> = [
  { intent: 'automation',    patterns: [/automat|pipeline|flujo|workflow|proceso/i] },
  { intent: 'data-pipeline', patterns: [/etl|extract|transform|load|sync|sincroniza|datos|data/i] },
  { intent: 'notification',  patterns: [/notif|avisa|alerta|alert|envía|send|mensaj/i] },
  { intent: 'integration',   patterns: [/integra|connect|enlaza|api|webhook/i] },
  { intent: 'analysis',      patterns: [/analiza|analy|insights|métricas|metrics|report/i] },
  { intent: 'generation',    patterns: [/genera|genera|crea|create|write|redact/i] },
  { intent: 'monitoring',    patterns: [/monitor|observ|watch|supervisa|track/i] },
  { intent: 'scheduling',    patterns: [/schedule|cada|every|cron|diario|semanal|mensual/i] },
];

export class IntentClassifier {
  classify(prompt: string): ClassificationResult {
    const lower = prompt.toLowerCase();

    // Detected services
    const services = SERVICE_KEYWORDS
      .filter(s => s.keywords.some(kw => lower.includes(kw)))
      .map(s => s.name);

    // Intents — sorted by match count descending
    const intentScores = INTENT_PATTERNS.map(({ intent, patterns }) => ({
      intent,
      score: patterns.filter(p => p.test(prompt)).length,
    })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    const primaryIntent: Intent = intentScores[0]?.intent ?? 'automation';
    const secondaryIntents = intentScores.slice(1, 3).map(x => x.intent);

    // Trigger
    let triggerType: ClassificationResult['triggerType'] = 'manual';
    if (/cuando|when|al recibir|on receive|llegue|arrives?/i.test(prompt)) triggerType = 'event';
    else if (/cada|every|cron|diario|daily|semanal|schedule/i.test(prompt)) triggerType = 'schedule';
    else if (/webhook|http request/i.test(prompt)) triggerType = 'webhook';
    else if (/formulario|form submit/i.test(prompt)) triggerType = 'form';

    // Action verbs
    const actionVerbs: string[] = [];
    const verbMap: [RegExp, string][] = [
      [/clasifica|classify|categoriza/i, 'classify'],
      [/crea|create|añade|add|insert/i,  'create'],
      [/genera|generate|construye/i,      'generate'],
      [/envía|send|notifica|notify/i,     'notify'],
      [/sincroniza|sync|actualiza|update/i,'sync'],
      [/analiza|analyze|monitor/i,        'analyze'],
      [/extrae|extract|parsea|parse/i,    'extract'],
      [/valida|validate|verifica/i,       'validate'],
      [/transforma|transform|convierte/i, 'transform'],
    ];
    for (const [re, verb] of verbMap) {
      if (re.test(prompt)) actionVerbs.push(verb);
    }

    // Data types
    const dataTypes: string[] = [];
    const dataMap: [RegExp, string][] = [
      [/pedido|order/i, 'order'], [/lead|prospecto/i, 'lead'],
      [/factura|invoice/i, 'invoice'], [/ticket|soporte/i, 'ticket'],
      [/email|correo/i, 'email'], [/cliente|customer/i, 'customer'],
      [/datos|data|report/i, 'data'], [/producto|product/i, 'product'],
    ];
    for (const [re, type] of dataMap) {
      if (re.test(prompt)) dataTypes.push(type);
    }

    const hasAI = /\bai\b|ia\b|gpt|claude|gemini|openai|anthropic|llm|modelo|model/i.test(prompt);

    // Confidence heuristic
    const confidence = Math.min(
      95,
      50
      + (services.length > 0 ? 20 : 0)
      + (actionVerbs.length > 0 ? 10 : 0)
      + (dataTypes.length > 0 ? 10 : 0)
      + (intentScores.length > 0 ? 5 : 0),
    );

    return {
      primaryIntent, secondaryIntents, triggerType,
      services, actionVerbs,
      dataTypes: dataTypes.length ? dataTypes : ['data'],
      hasAI, confidence,
    };
  }
}
