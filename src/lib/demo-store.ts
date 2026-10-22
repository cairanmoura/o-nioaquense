/**
 * demo-store.ts
 * -----------------------------------------------------------------------------
 * Armazenamento em memoria usado APENAS no modo demonstracao (sem Supabase
 * configurado). Permite revisar todo o painel /admin sem credenciais de
 * producao: as mutacoes (criar, publicar,aprovar, editar perfil) ficam
 * validas durante a sessao do servidor.
 *
 * Quando o Supabase esta configurado, este modulo nao e' usado.
 */

import {
  mockArticles,
  mockBusSchedules,
  mockLocalAds,
  mockProfiles,
  mockPublicUtilities,
  mockReaderSubmissions,
} from './mock-data';
import type {
  Article,
  BusSchedule,
  LocalAd,
  Profile,
  PublicUtility,
  ReaderSubmission,
} from './types';

interface DemoState {
  articles: Article[];
  profiles: Profile[];
  submissions: ReaderSubmission[];
  utilities: PublicUtility[];
  ads: LocalAd[];
  busSchedules: BusSchedule[];
  assets: Map<string, { mime: string; data: string }>;
}

const state: DemoState = {
  articles: structuredClone(mockArticles),
  profiles: structuredClone(mockProfiles),
  submissions: structuredClone(mockReaderSubmissions),
  utilities: structuredClone(mockPublicUtilities),
  ads: structuredClone(mockLocalAds),
  busSchedules: structuredClone(mockBusSchedules),
  assets: new Map(),
};

export const demoStore = {
  /* ------------------------------ artigos ------------------------------ */
  listArticles(): Article[] {
    return state.articles;
  },

  findArticle(id: string): Article | undefined {
    return state.articles.find((article) => article.id === id);
  },

  findArticleBySlug(slug: string): Article | undefined {
    return state.articles.find((article) => article.slug === slug);
  },

  createArticle(article: Article): Article {
    state.articles.push(article);
    return article;
  },

  updateArticle(id: string, patch: Partial<Article>): Article | undefined {
    const index = state.articles.findIndex((article) => article.id === id);
    if (index === -1) return undefined;

    const current = state.articles[index]!;
    const updated: Article = {
      ...current,
      ...patch,
      id: current.id,
      updated_at: new Date().toISOString(),
    };

    state.articles[index] = updated;
    return updated;
  },

  /* ------------------------------ perfis ------------------------------- */
  listProfiles(): Profile[] {
    return state.profiles;
  },

  findProfile(id: string): Profile | undefined {
    return state.profiles.find((profile) => profile.id === id);
  },

  createProfile(profile: Profile): Profile {
    state.profiles.push(profile);
    return profile;
  },

  updateProfile(id: string, patch: Partial<Profile>): Profile | undefined {
    const index = state.profiles.findIndex((profile) => profile.id === id);
    if (index === -1) return undefined;

    const updated: Profile = { ...state.profiles[index]!, ...patch, id };
    state.profiles[index] = updated;
    return updated;
  },

  /* ----------------------------- pistas -------------------------------- */
  listSubmissions(): ReaderSubmission[] {
    return state.submissions;
  },

  updateSubmission(id: string, patch: Partial<ReaderSubmission>): ReaderSubmission | undefined {
    const index = state.submissions.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    const updated: ReaderSubmission = { ...state.submissions[index]!, ...patch, id };
    state.submissions[index] = updated;
    return updated;
  },

  /* --------------------------- servicos ------------------------------- */
  listUtilities(): PublicUtility[] {
    return state.utilities;
  },

  createUtility(utility: PublicUtility): PublicUtility {
    state.utilities.push(utility);
    return utility;
  },

  updateUtility(id: string, patch: Partial<PublicUtility>): PublicUtility | undefined {
    const index = state.utilities.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    const updated: PublicUtility = { ...state.utilities[index]!, ...patch, id };
    state.utilities[index] = updated;
    return updated;
  },

  /* ------------------------------ anuncios ------------------------------ */
  listAds(): LocalAd[] {
    return state.ads;
  },

  createAd(ad: LocalAd): LocalAd {
    state.ads.push(ad);
    return ad;
  },

  updateAd(id: string, patch: Partial<LocalAd>): LocalAd | undefined {
    const index = state.ads.findIndex((ad) => ad.id === id);
    if (index === -1) return undefined;

    const updated: LocalAd = { ...state.ads[index]!, ...patch, id };
    state.ads[index] = updated;
    return updated;
  },

  incrementAdClicks(id: string): LocalAd | undefined {
    const ad = state.ads.find((item) => item.id === id);
    if (!ad) return undefined;

    ad.clicks_count += 1;
    return ad;
  },

  /* ------------------------------ imagens ------------------------------- */
  saveAsset(id: string, mime: string, data: string): void {
    state.assets.set(id, { mime, data });
  },

  getAsset(id: string): { mime: string; data: string } | undefined {
    return state.assets.get(id);
  },

  /* --------------------------- horarios de onibus ------------------------ */
  listBusSchedules(): BusSchedule[] {
    return state.busSchedules;
  },

  createBusSchedule(schedule: BusSchedule): BusSchedule {
    state.busSchedules.push(schedule);
    return schedule;
  },

  updateBusSchedule(id: string, patch: Partial<BusSchedule>): BusSchedule | undefined {
    const index = state.busSchedules.findIndex((item) => item.id === id);
    if (index === -1) return undefined;

    const updated: BusSchedule = { ...state.busSchedules[index]!, ...patch, id };
    state.busSchedules[index] = updated;
    return updated;
  },

  deleteBusSchedule(id: string): boolean {
    const before = state.busSchedules.length;
    state.busSchedules = state.busSchedules.filter((item) => item.id !== id);
    return state.busSchedules.length < before;
  },
};

/** Perfil de demonstracao do Editor-Chefe. */
export const DEMO_ADMIN_ID = '10000000-0000-4000-8000-000000000001';

/** Perfil de demonstracao de Colunista (sem permissao de publicar direto). */
export const DEMO_COLUMNIST_ID = '10000000-0000-4000-8000-000000000002';
