/**
 * Tipos de dominio do portal O Nioaquense.
 * Espelham 1:1 os enums e colunas definidos em `supabase/migrations/001_initial_schema.sql`.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export type UserRole = 'admin' | 'columnist';

export type ArticleScope = 'nioaque' | 'ms' | 'brasil' | 'coluna' | 'radar_oficial';

export type ArticleStatus = 'draft' | 'pending_review' | 'published';

export type AlertLevel = 'info' | 'warning' | 'urgent';

export type AdSlotPosition =
  | 'header_billboard'
  | 'home_middle'
  | 'article_inline'
  | 'sidebar'
  | 'daily_deal';

export type SubmissionStatus = 'pending' | 'reviewed' | 'converted_to_article' | 'archived';

export type AdOfferType = 'banner' | 'daily_deal';

/* -------------------------------------------------------------------------- */
/* Tabelas                                                                    */
/* -------------------------------------------------------------------------- */

export interface Profile {
  id: string;
  full_name: string;
  slug: string;
  role: UserRole;
  column_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string>;
  can_publish_directly: boolean;
  active: boolean;
}

export interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  /** "Direto ao Ponto" - lista de destaques da materia. */
  summary_bullets: string[];
  content: string;
  cover_image_url: string | null;
  cover_image_caption: string | null;
  scope: ArticleScope;
  category_label: string | null;
  is_breaking: boolean;
  is_featured: boolean;
  author_id: string;
  status: ArticleStatus;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** Veiculo de origem, quando a materia vem de agencia (ex.: Agencia Brasil). */
  source_name?: string | null;
  /** Link para a materia original no veiculo de origem. */
  source_url?: string | null;
}

export interface PublicUtility {
  id: string;
  duty_date: string;
  pharmacy_name: string;
  pharmacy_phone: string | null;
  pharmacy_address: string | null;
  alert_active: boolean;
  alert_message: string | null;
  alert_level: AlertLevel;
  bus_schedule_html: string | null;
  updated_at: string;
}

export interface LocalAd {
  id: string;
  client_name: string;
  title: string;
  image_url: string | null;
  target_url: string | null;
  whatsapp_number: string | null;
  slot_position: AdSlotPosition;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  clicks_count: number;
  /** Etapa 5: banner fixo ou "Oferta do Dia em Nioaque". */
  offer_type: AdOfferType;
  /** Preco/condicao exibida no card de oferta. */
  price_label: string | null;
  notes: string | null;
}

/** Horarios de onibus intermunicipais (tabela estruturada). */
export interface BusSchedule {
  id: string;
  route_name: string;
  destination: string;
  departure_times: string[];
  frequency: string | null;
  notes: string | null;
  position: number;
  active: boolean;
  updated_at: string;
}

/** Resultado de uma modalidade de loteria. */
export interface LotteryResult {
  id: string;
  modality: string;
  contest_number: string;
  contest_date: string;
  numbers: string[];
  prize_value: string | null;
  created_at: string;
}

/** Cotacao exibida na faixa economica do portal. */
export interface MarketQuote {
  id: string;
  symbol: string;
  label: string;
  value: number;
  change_percent: number;
  unit: string | null;
  updated_at: string;
}

export interface ReaderSubmission {
  id: string;
  sender_name: string;
  sender_whatsapp: string;
  neighborhood: string | null;
  message: string;
  media_urls: string[];
  status: SubmissionStatus;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/* Rotulos                                                                   */
/* -------------------------------------------------------------------------- */

export const SCOPE_LABEL: Record<ArticleScope, string> = {
  nioaque: 'Nioaque',
  ms: 'Mato Grosso do Sul',
  brasil: 'Brasil',
  coluna: 'Coluna',
  radar_oficial: 'Radar Oficial',
};

export const SCOPE_BADGE_CLASS: Record<ArticleScope, string> = {
  nioaque: 'bg-nioaque-green text-nioaque-white',
  ms: 'bg-nioaque-green-50 text-nioaque-green-dark ring-1 ring-nioaque-green-100',
  brasil: 'bg-ink text-nioaque-white',
  coluna: 'bg-nioaque-red text-nioaque-white',
  radar_oficial: 'bg-nioaque-red-50 text-nioaque-red-dark ring-1 ring-red-100',
};

export const ALERT_STYLE: Record<AlertLevel, { label: string; className: string }> = {
  info: { label: 'Informacao', className: 'bg-nioaque-green-50 text-nioaque-green-dark' },
  warning: { label: 'Atencao', className: 'bg-amber-50 text-amber-800' },
  urgent: { label: 'Urgente', className: 'bg-nioaque-red text-nioaque-white' },
};
