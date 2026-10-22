/**
 * ads.ts
 * -----------------------------------------------------------------------------
 * Regras de monetizacao do portal: rotas de clique, links de WhatsApp e as
 * alturas minimas reservadas para cada slot (zero CLS - AGENTS.md, regra #1).
 */

import type { AdSlotPosition, LocalAd } from './types';

/* -------------------------------------------------------------------------- */
/* Alturas reservadas (zero CLS)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Altura minima de cada slot. O anuncio (ou o placeholder) ocupa sempre o
 * mesmo espaco reservado, evitando que o layout "pule" quando o criativo
 * carrega.
 */
export const AD_MIN_HEIGHT: Record<AdSlotPosition, string> = {
  header_billboard: '160px',
  home_middle: '220px',
  article_inline: '280px',
  sidebar: '260px',
  daily_deal: '340px',
};

/** Alturas dos slots do Google AdSense. */
export const ADSENSE_MIN_HEIGHT = {
  leaderboard: '120px',
  rectangle: '280px',
  horizontal: '140px',
  mobileBanner: '100px',
} as const;

export type AdsenseFormat = keyof typeof ADSENSE_MIN_HEIGHT;

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

/** Somente digitos do numero (WhatsApp exige DDI + DDD + numero). */
export function phoneDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Rota de contagem de clique. O navegador nunca vai direto ao anunciante. */
export function adClickPath(id: string): string {
  return `/api/ads/click/${encodeURIComponent(id)}`;
}

/** Mensagem padrao enviada pelo anunciante ao cliente. */
export function adWhatsappMessage(ad: Pick<LocalAd, 'client_name' | 'title'>): string {
  return `Ola! Vi o anuncio "${ad.title}" (${ad.client_name}) no O Nioaquense e gostaria de mais informacoes.`;
}

/** Link direto de WhatsApp (usado em botoes "Chamar no WhatsApp"). */
export function adWhatsappLink(ad: LocalAd): string | null {
  const digits = phoneDigits(ad.whatsapp_number);
  if (!digits) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(adWhatsappMessage(ad))}`;
}

/**
 * O anuncio esta no ar?
 *
 * Um anuncio so aparece no portal quando esta **ativo** E dentro do periodo
 * de veiculacao. Sem esta checagem, um anuncio que ja venceu continuaria
 * no ar enquanto o painel mostraria a situacao "Encerrado".
 */
export function isAdLive(
  ad: Pick<LocalAd, 'active' | 'starts_at' | 'ends_at'>,
  now: number = Date.now(),
): boolean {
  if (!ad.active) return false;

  if (ad.starts_at) {
    const start = new Date(ad.starts_at).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }

  if (ad.ends_at) {
    const end = new Date(ad.ends_at).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }

  return true;
}

/**
 * Escolhe o anuncio que fica no ar em um slot.
 *
 * Regra: o **mais recem-cadastrado** dentro do periodo de veiculacao. A lista
 * chega em ordem de cadastro (o mais antigo primeiro), entao o ultimo da
 * lista e o vencedor. Assim, o anuncio que o Editor-Chefe acabou de
 * cadastrar entra no ar em vez de ficar escondido atras de um cadastro
 * antigo que ocupa o mesmo slot.
 */
export function pickLiveAd<
  T extends Pick<LocalAd, 'slot_position' | 'active' | 'starts_at' | 'ends_at'>,
>(ads: T[], slot: AdSlotPosition): T | null {
  const live = ads.filter((ad) => ad.slot_position === slot && isAdLive(ad));

  return live.length > 0 ? live[live.length - 1]! : null;
}

/**
 * Destino final do clique: WhatsApp quando houver numero, senao o target_url.
 * O clique passa sempre por `/api/ads/click/[id]` para contabilizar.
 */
export function adDestination(ad: LocalAd | null | undefined): string {
  if (!ad) return '/';

  const whatsapp = adWhatsappLink(ad);
  if (whatsapp) return whatsapp;

  if (ad.target_url && ad.target_url !== '#') return ad.target_url;

  return '/';
}

/** Link "Chamar no WhatsApp" que passa pela rota de contagem. */
export function adContactPath(ad: LocalAd): string {
  return adClickPath(ad.id);
}
