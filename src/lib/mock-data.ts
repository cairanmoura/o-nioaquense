/**
 * mock-data.ts
 * -----------------------------------------------------------------------------
 * REGRA INVIOLAVEL: ZERO DADOS FICTICIOS. Este arquivo ja teve dados de exemplo
 * (materias, farmacias, onibus, anuncios, loterias, cotacoes, autoridades); todos
 * foram removidos. As listas ficam VAZIAS de proposito: sem dado real, a interface
 * mostra estado vazio honesto, nunca um numero ou nome inventado.
 * Nao reintroduza conteudo de exemplo aqui.
 */

import type {
  Article,
  BusSchedule,
  LocalAd,
  LotteryResult,
  MarketQuote,
  Profile,
  PublicUtility,
  ReaderSubmission,
} from './types';

export const mockProfiles: Profile[] = [];
export const mockArticles: Article[] = [];
export const mockPublicUtilities: PublicUtility[] = [];
export const mockLocalAds: LocalAd[] = [];
export const mockBusSchedules: BusSchedule[] = [];
export const mockLotteryResults: LotteryResult[] = [];
export const mockMarketQuotes: MarketQuote[] = [];
export const mockReaderSubmissions: ReaderSubmission[] = [];
