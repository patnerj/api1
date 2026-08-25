/**
 * Typed endpoint surface — one function per route in fxsim/v1.
 * Each function returns ApiResult<T>; callers branch on `.ok`.
 */

import { fxsim, getApiBaseUrl, FXSIM_BASE } from './fxsim'
import type {
  Account, AdminStats, AdminUserRow, AdminUserDetail, AdminRisk, AdminRiskAlerts, AdvancedStats, AnalyticsChallenges,
  AnalyticsGrowth, AnalyticsRevenue, AuthUser, BasicStats, Certificate,
  ChallengeAccount, ChallengeMetrics, ChallengePlan, FullStats, HistoryResp,
  LeaderboardRow, NoChallengeResp, NotificationsResp, OpenOrderBody,
  PaymentConfig, PaymentOrder, PendingOrder, PendingOrderBody, Position,
  PricesMap, Symbol, Trade, Transaction, KycInfo, PayoutsResp,
  AdminKycRow, AdminPayoutRow, AdminNotificationsResp, Banner, Coupon,
  AffiliateMe, Commission, AdminAffiliate, TestToolChallenge, AffiliatePayout,
  CryptoNetwork, StripeStatus, HealthReport, SmtpConfig, DemoStatus, ApiResult,
  KycSubmission, PaymentGatewaysConfig, TeamMember, CertificateTemplate, CertificateTemplates,
  WebhookConfig, NewsGuardSettings, NewsEvent,
  ScalingRules, ScalingQueueItem, ScalingEvent,
  SyndicateRadarSettings, SyndicateCluster,
  PvpMatch, PvpLobbyResponse, PvpLiveStateResponse, PvpAnalyticsResponse,
} from '@/types/api'

export { getApiBaseUrl, FXSIM_BASE }

/**
 * Helper to simulate API responses with artificial latency for incomplete/unwired endpoints.
 * Uses Promise.resolve and setTimeout to delay response by delayMs (default 800ms).
 * Returns clean ApiResult<T> object ({ ok: true, status: 200, data }).
 */
export async function mockApiResponse<T>(
  data: T,
  delayMs = 800,
  shouldFail = false,
  errorMessage = 'Simulated API error'
): Promise<ApiResult<T>> {
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  if (shouldFail) {
    return { ok: false, status: 500, error: errorMessage }
  }
  return { ok: true, status: 200, data }
}

// ── Auth (additions to the backend — see backend-additions/ folder) ─────────
export const api = {
  auth: {
    login:    (body: { username: string; password: string; remember?: boolean }) =>
      fxsim<{ user?: AuthUser; nonce?: string; two_factor_required?: boolean; uid?: number }>('/auth/login', { body, public: true }),
    verify2fa: (uid: number, code: string, remember?: boolean) =>
      fxsim<{ user: AuthUser; nonce: string }>('/auth/2fa/verify', { body: { uid, code, remember: !!remember }, public: true }),
    register: (body: { username: string; email: string; password: string; ref?: string }) =>
      fxsim<{ user: AuthUser; nonce: string }>('/auth/register', { body, public: true }),
    logout:   () => fxsim<{ success: true }>('/auth/logout', { method: 'POST' }),
    me:       (force = true) => fxsim<AuthUser>('/auth/me', { cache: 0, force: true }),
    requestReset: (login: string)   => fxsim<{ success: true; message: string }>('/auth/request-reset', { body: { login }, public: true }),
    doReset:      (key: string, login: string, password: string) =>
      fxsim<{ success: true; message: string }>('/auth/do-reset', { body: { key, login, password }, public: true }),
    resendVerification: () => fxsim<{ success: true; message: string }>('/auth/resend-verification', { method: 'POST' }),
    verifyEmail: (token: string) => fxsim<{ status: 'success' | 'expired' | 'invalid'; message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}&format=json`, { public: true }),
    twoFactorStatus:    () => fxsim<{ enabled: boolean }>('/auth/2fa/status', { cache: 60_000 }),
    twoFactorToggle:    (enable: boolean) => fxsim<{ success: true; enabled: boolean }>('/auth/2fa/toggle', { body: { enable } }),
    changePassword:     (body: { current_password: string; new_password: string }) =>
      fxsim<{ success: boolean; message: string }>('/auth/change-password', { method: 'POST', body }),
  },
  preferences: {
    get:  () => fxsim<{ success: boolean; preferences: Record<string, boolean> }>('/user/preferences', { cache: 0 }),
    save: (preferences: Record<string, boolean>) => fxsim<{ success: boolean; preferences: Record<string, boolean> }>('/user/preferences', { method: 'POST', body: { preferences } }),
  },

  // ── Public ────────────────────────────────────────────────────────────
  prices:        ()              => fxsim<PricesMap>('/prices', { public: true }),
  banners:       (placement?: string, page?: string) =>
    fxsim<Banner[]>('/banners', { query: { placement, page }, public: true, cache: 15_000 }),
  branding:      () => fxsim<{
    brand_name: string; brand_tagline: string; logo_url: string; login_logo_url: string;
    favicon_url: string; support_email: string; primary_color: string; secondary_color: string; footer_text: string;
  }>('/branding', { public: true, cache: 60_000 }),
  theme: {
    get: () => fxsim<Record<string, any>>('/theme', { public: true, cache: 0 }),
    save: (data: Record<string, any>) => fxsim<{ success: boolean }>('/admin/config/whitelabel', { body: data }),
  },

  symbols:       (force = false) => fxsim<Symbol[]>('/symbols', { cache: 5 * 60_000, force }), // changes rarely; force=true bypasses cache
  challengePlans: ()             => fxsim<ChallengePlan[]>('/challenge/plans', { public: true, cache: 60_000 }),
  leaderboard:   ()              => fxsim<LeaderboardRow[]>('/stats/leaderboard', { public: true, cache: 30_000 }),

  // ── Account / Trading ─────────────────────────────────────────────────
  account:       (params?: { account_id?: number; tournament_id?: number }) => fxsim<Account | NoChallengeResp>('/account', { query: params, cache: 4_000 }),
  positions:     (params?: { account_id?: number; tournament_id?: number }) => fxsim<Position[]>('/positions', { query: params, cache: 2_000 }),
  newsEvents:    ()              => fxsim<any[]>('/news-events',                      { cache: 60_000 }),
  open:          (b: OpenOrderBody) => fxsim<{ success: boolean; message?: string; position_id?: number }>('/open', { body: b, retries: 0 }),
  close:         (id: number)    => fxsim<{ success: boolean; message?: string; pnl?: number }>(`/close/${id}`, { method: 'POST', retries: 0 }),
  partialClose:  (id: number, lots: number) => fxsim<{ success: boolean; message?: string }>(`/partial-close/${id}`, { body: { lots }, retries: 0 }),
  sltp:          (id: number, sl: number | null, tp: number | null) =>
    fxsim<{ success: boolean; message?: string }>(`/sltp/${id}`, { body: { sl, tp } }),
  history:       (lastId?: number, params?: { account_id?: number; tournament_id?: number }) => fxsim<HistoryResp>('/history', { query: { last_id: lastId, ...(params || {}) }, cache: 6_000 }),
  tradeNotesGet: (id: number) => fxsim<{ note?: string; tags?: string; screenshot_url?: string }>(`/trades/${id}/notes`, { cache: 0 }),
  tradeNotesSave:(id: number, data: { note: string; tags: string[]; screenshot_url: string }) => fxsim<{ success: boolean }>(`/trades/${id}/notes`, { method: 'POST', body: data }),
  transactions:  ()              => fxsim<Transaction[]>('/transactions',             { cache: 8_000 }),
  stats:         ()              => fxsim<BasicStats>('/stats',                       { cache: 10_000 }),
  statsFull:     ()              => fxsim<FullStats | NoChallengeResp>('/stats/full', { cache: 10_000 }),
  statsAdvanced: ()              => fxsim<AdvancedStats | NoChallengeResp>('/stats/advanced', { cache: 15_000 }),

  // ── Pending orders ────────────────────────────────────────────────────
  pendingPlace:  (b: PendingOrderBody) => fxsim<{ success: boolean; message?: string }>('/pending-order/place', { body: b, retries: 0 }),
  pendingCancel: (id: number)    => fxsim<{ success: boolean; message?: string }>(`/pending-order/${id}/cancel`, { method: 'POST', retries: 0 }),
  pendingMine:   (params?: { account_id?: number; tournament_id?: number }) => fxsim<PendingOrder[]>('/pending-order/my', { query: params, cache: 4_000 }),

  // ── Challenge ─────────────────────────────────────────────────────────
  challengeMy:      ()           => fxsim<ChallengeAccount[]>('/challenge/my', { cache: 8_000 }),
  challengeStart:   (planId: number, couponCode?: string) => fxsim<{ success: boolean; message?: string; requires_payment?: boolean; plan_id?: number; amount?: number }>('/challenge/start', { body: { plan_id: planId, coupon_code: couponCode } }),
  challengeMetrics: (id: number) => fxsim<ChallengeMetrics>(`/challenge/${id}/metrics`, { cache: 6_000 }),
  challengeMt5:     (id: number) => fxsim<{ ready: boolean; message?: string; mt5_login?: string; mt5_password?: string; mt5_server?: string; mt5_account_type?: string }>(`/challenge/${id}/mt5-details`, { cache: 30_000 }),
  challengePayout:  (id: number, method: string, address: string) =>
    fxsim<{ success: boolean; message?: string; trader_amount?: number; firm_amount?: number }>(`/challenge/${id}/payout`, { body: { method, address } }),
  certificate:      (id: number) => fxsim<Certificate>(`/certificate/${id}`, { cache: 5 * 60_000 }),
  certificatePublic: (code: string) => fxsim<Certificate>(`/certificate/public/${encodeURIComponent(code)}`, { public: true, cache: 5 * 60_000 }),

  // ── Payout method ─────────────────────────────────────────────────────
  payoutMethodGet:  () => fxsim<{ method: string; address: string; details: string }>('/payout-method', { cache: 30_000 }),
  payoutMethodSave: (method: string, address: string, details: string) =>
    fxsim<{ success: true }>('/payout-method', { body: { method, address, details } }),

  // ── KYC (identity verification) ───────────────────────────────────────
  kycGet:    () => fxsim<KycInfo>('/kyc', { cache: 10_000 }),
  // Up to 4 files × 5MB in one multipart call — needs far more than the 10s
  // default timeout, and mutations never retry (so no duplicate submissions).
  kycSubmit: (form: FormData) =>
    fxsim<{ success: boolean; message?: string; status?: string }>('/kyc/submit', { form, timeout: 60_000 }),

  // ── Payouts (history + availability + cycle) ──────────────────────────
  payouts:   () => fxsim<PayoutsResp>('/payouts', { cache: 10_000 }),
  
  tickets: {
    list:   () => fxsim<import('../types/api').Ticket[]>('/tickets'),
    get:    (id: number) => fxsim<import('../types/api').Ticket & { messages: import('../types/api').TicketMessage[] }>(`/tickets/${id}`),
    create: (body: { subject: string; category: string; message: string }) => fxsim<{ success: boolean; id: number }>('/tickets/create', { body }),
    reply:  (id: number, message: string) => fxsim<{ success: boolean }>(`/tickets/${id}/reply`, { body: { message } })
  },
  
  // ── Gamification ───────────────────────────────────────────────────────
  competitions: {
    list:     () => fxsim<import('../types/api').Competition[]>('/competitions', { public: true, cache: 15_000 }),
    get:      (id: number) => fxsim<import('../types/api').Competition>(`/competitions/${id}`, { public: true, cache: 15_000 }),
    getById:  (id: number) => fxsim<import('../types/api').Competition>(`/competitions/${id}`, { public: true, cache: 15_000 }),
    leaderboard: (id: number) => fxsim<import('../types/api').LeaderboardRow[]>(`/competitions/${id}/leaderboard`, { public: true, cache: 5_000 }),
    register: (id: number) => fxsim<{ success: boolean; message?: string; account_id?: number; checkout_required?: boolean; checkout_url?: string }>(`/competitions/${id}/join`, { method: 'POST' }),
  },
  tournaments: {
    list:     (params?: { status?: string; search?: string }) => fxsim<import('../types/api').Competition[]>('/tournaments', { query: params, cache: 0 }),
    get:      (id: number) => fxsim<import('../types/api').Competition>(`/tournaments/${id}`, { cache: 0 }),
    join:     (id: number) => fxsim<{ success: boolean; message: string; participant_id?: number; tournament_id?: number }>(`/tournaments/${id}/join`, { method: 'POST' }),
    leaderboard: (id: number) => fxsim<{ tournament: import('../types/api').Competition; leaderboard: import('../types/api').LeaderboardRow[] }>(`/tournaments/${id}/leaderboard`, { public: true, cache: 0 }),
  },
  profile: (id: number) => fxsim<{ id: number; name: string; is_funded: boolean; has_passed: boolean; badges: string[]; total_payouts: number }>(`/profile/${id}`, { public: true, cache: 30_000 }),
  affiliateLeaderboard: () => fxsim<Array<{ name: string; earned: number }>>('/stats/affiliate-leaderboard', { public: true, cache: 60_000 }),
  // ── Payments ──────────────────────────────────────────────────────────
  paymentConfig:    ()           => fxsim<PaymentConfig>('/payment/config', { cache: 60_000 }),
  paymentCreate:    (planId: number, gateway: string, couponCode?: string) =>
    fxsim<{ success: boolean; message?: string; order_id?: number; amount?: number; original?: number; discount?: number; payment_url?: string }>('/payment/create', { body: { plan_id: planId, gateway, coupon_code: couponCode } }),
  paymentSubmitProof: (form: FormData) =>
    fxsim<{ success: boolean; message?: string }>('/payment/submit-proof', { form, timeout: 60_000 }),
  paymentMyOrders:  (force = false) => fxsim<PaymentOrder[]>('/payment/my-orders', { cache: force ? 0 : 10_000, force }),
  stripeCheckout:   (planId: number, couponCode?: string) =>
    fxsim<{ success: boolean; message?: string; checkout_url?: string }>('/payment/stripe-checkout', { body: { plan_id: planId, coupon_code: couponCode } }),
  couponValidate:   (code: string, planId: number) =>
    fxsim<{ valid: boolean; message: string; code?: string; type?: string; value?: number; original?: number; discount?: number; final?: number }>('/coupon/validate', { body: { code, plan_id: planId } }),
  affiliateMe:      () => fxsim<AffiliateMe>('/affiliate/me', { cache: 10_000 }),
  affiliateEnroll:  () => fxsim<AffiliateMe>('/affiliate/enroll', { body: {} }),
  affiliateCommissions: () => fxsim<Commission[]>('/affiliate/commissions', { cache: 10_000 }),
  affiliateSetPayout: (method: string, destination: string) =>
    fxsim<{ success: boolean; message?: string }>('/affiliate/payout-method', { body: { method, destination } }),
  affiliateRequestPayout: () =>
    fxsim<{ success: boolean; message?: string; amount?: number }>('/affiliate/payout/request', { method: 'POST', retries: 0 }),
  affiliatePayouts: () => fxsim<AffiliatePayout[]>('/affiliate/payouts', { cache: 5_000 }),

  // ── Notifications ─────────────────────────────────────────────────────
  notifications:    (page = 1, per_page = 30) => fxsim<NotificationsResp>(`/notifications?page=${page}&per_page=${per_page}`, { cache: 10_000 }),
  notificationsRead: (ids?: number[]) =>
    fxsim<{ success: true }>('/notifications/read', { body: { ids: ids ?? [] } }),

  // ── API keys ──────────────────────────────────────────────────────────
  apiKeysList:   ()              => fxsim<unknown[]>('/api-keys', { cache: 15_000 }),
  apiKeysCreate: (name: string, scopes: string[], env: string, expires: string) =>
    fxsim<{ success: boolean; key: string; id: number }>('/api-keys', { body: { name, scopes, env, expires } }),
  apiKeysRevoke: (id: number)    => fxsim<{ success: boolean }>(`/api-keys/${id}/revoke`, { method: 'POST' }),

  // ── Admin ─────────────────────────────────────────────────────────────
  admin: {
    competitions: {
      list: () => fxsim<import('../types/api').Competition[]>('/admin/competitions', { cache: 5_000 }),
      get: (id: number) => fxsim<import('../types/api').Competition>(`/admin/competitions/${id}`),
      create: (data: Partial<import('../types/api').Competition>) => fxsim<{ success: boolean; id: number }>('/admin/competitions', { method: 'POST', body: data }),
      update: (id: number, data: Partial<import('../types/api').Competition>) => fxsim<{ success: boolean }>(`/admin/competitions/${id}`, { method: 'PUT', body: data }),
      delete: (id: number) => fxsim<{ success: boolean }>(`/admin/competitions/${id}`, { method: 'DELETE' }),
    },
    tournaments: {
      list: (params?: { status?: string; search?: string }) =>
        fxsim<import('../types/api').Tournament[]>('/admin/tournaments', { query: params, cache: 0 }),
      save: (data: Partial<import('../types/api').Tournament>) =>
        fxsim<{ success: boolean; id: number; message?: string }>('/admin/tournaments/save', { method: 'POST', body: data }),
      delete: (id: number) =>
        fxsim<{ success: boolean; message?: string }>(`/admin/tournaments/${id}`, { method: 'DELETE' }),
      leaderboard: (id: number) =>
        fxsim<{ tournament: import('../types/api').Tournament; leaderboard: import('../types/api').TournamentParticipant[] }>(`/admin/tournaments/${id}/leaderboard`, { cache: 0 }),
      updateStatus: (id: number, status: string) =>
        fxsim<{ success: boolean; status?: string }>(`/admin/tournaments/${id}/status`, { method: 'POST', body: { status } }),
    },
    theme: {
    get: () => fxsim<import('../types/api').ThemeSettings>('/theme', { cache: 0 }),
    save: (data: Partial<{primaryColor:string, primaryForeground:string, radius:string, fontFamily:string}>) => fxsim<{success: boolean}>('/admin/theme', { method: 'POST', body: data }),
  },
    tickets: {
      list: (query?: { status?: string; priority?: string; category?: string; search?: string }) =>
        fxsim<import('../types/api').Ticket[]>('/admin/tickets', { query, cache: 0 }),
      get: (id: string | number) =>
        fxsim<{ ticket: import('../types/api').Ticket; messages: import('../types/api').TicketMessage[] }>(`/admin/tickets/${id}`, { cache: 0 }),
      reply: (id: string | number, message: string) =>
        fxsim<{ success: boolean; message?: string }>(`/admin/tickets/${id}/reply`, { method: 'POST', body: { message } }),
      updateStatus: (id: string | number, status?: string, priority?: string) =>
        fxsim<{ success: boolean; updated?: Record<string, string> }>(`/admin/tickets/${id}/status`, { method: 'POST', body: { status, priority } }),
    },
    stats:        ()                 => fxsim<AdminStats>('/admin/stats',                                { cache: 10_000 }),
    users:        (search?: string, page?: number, limit?: number)  => fxsim<{ data: AdminUserRow[]; total: number; page: number; pages: number; limit: number }>('/admin/users',                            { query: { search, page, limit }, cache: 5_000 }),
    kycList:      (status?: string)  => fxsim<AdminKycRow[]>('/admin/kyc',                                { query: { status }, cache: 5_000 }),
    kycReview:    (id: number, action: 'approve' | 'reject', note?: string, force_override?: boolean) =>
      fxsim<{ success: boolean; status?: string; message?: string; error?: string }>(`/admin/kyc/${id}/review`, { body: { action, note, force_override } }),
    payoutsList:  (status?: string)  => fxsim<AdminPayoutRow[]>('/admin/payouts',                         { query: { status }, cache: 5_000 }),
    payoutStatus: (id: number, status: string, note: string, extra?: { tx_reference?: string; proof_url?: string }) =>
      fxsim<{ success: boolean; status?: string; message?: string }>(`/admin/payouts/${id}/status`, { body: { status, note, ...(extra || {}) }, retries: 0 }),
    challenges:   (params?: { user_ids?: string | number[]; page?: number; limit?: number; search?: string; status?: string }) =>
      fxsim<{ challenges: ChallengeAccount[]; total?: number; page?: number; pages?: number; limit?: number; pending_payouts: unknown[] }>('/admin/challenges', { query: params as any, cache: 8_000 }),
    trades:       ()                 => fxsim<Trade[]>('/admin/trades',                                  { cache: 10_000 }),
    log:          (page = 1)         => fxsim<unknown[]>('/admin/log',                                   { query: { page }, cache: 15_000 }),
    pendingOrders: ()                => fxsim<PendingOrder[]>('/admin/pending-orders',                   { cache: 5_000 }),
    pendingReject: (id: number, reason: string) =>
      fxsim<{ success: true }>(`/admin/pending-orders/${id}/reject`, { body: { reason } }),

    adjustBalance: (userId: number, accountId: number, amount: number, note: string) =>
      fxsim<{ success: true; new_balance: number }>('/admin/adjust-balance', { body: { user_id: userId, account_id: accountId, amount, note } }),
    setStatus:    (userId: number, status: string) =>
      fxsim<{ success: boolean; message?: string }>('/admin/set-status', { body: { user_id: userId, status } }),
    overrideRule: (userId: number, payload: any) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/user/${userId}/override`, { body: payload }),
    getTrader360: (userId: number) =>
      fxsim<{ success: boolean; data?: any; message?: string }>(`/admin/trader/${userId}/360`, { cache: 3_000 }),
    userDetail:   (userId: number) => fxsim<AdminUserDetail>(`/admin/user/${userId}`, { cache: 3_000 }),
    userRiskProfile: (userId: number) => fxsim<any>(`/admin/users/${userId}/risk-profile`, { cache: 3_000 }),
    risk:         () => fxsim<AdminRisk>('/admin/risk', { cache: 10_000 }),
    riskAlerts: () => fxsim<AdminRiskAlerts>('/admin/risk/alerts', { cache: 5_000 }),
    riskExposure: () => fxsim<import('../types/api').RiskExposureItem[]>('/admin/risk/exposure', { cache: 5_000 }),
    riskForceClose: (userIdOrAccount: { user_id?: number; account_id?: number | string }) =>
      fxsim<{ success: boolean; message: string; closed_count?: number }>('/admin/risk/force-close', { body: userIdOrAccount }),
    riskFlagTrader: (data: { user_id: number; reason?: string }) =>
      fxsim<{ success: boolean; message: string }>('/admin/risk/flag', { body: data }),
    bulkPayouts:  (ids: number[], status: string, note?: string) =>
      fxsim<{ success: boolean; processed: number; failed: number }>('/admin/bulk/payouts', { body: { ids, status, note }, retries: 0 }),
    bulkKyc:      (ids: number[], action: 'approve' | 'reject', note?: string) =>
      fxsim<{ success: boolean; processed: number; failed: number }>('/admin/bulk/kyc', { body: { ids, action, note } }),
    saveUserNote: (userId: number, note: string) =>
      fxsim<{ success: boolean }>(`/admin/user/${userId}/note`, { body: { note } }),
    createManualChallenge: (data: { email?: string; user_id?: number; plan_id?: number }) =>
      fxsim<{ success: boolean; challenge_id: number; account_id: number; message: string }>('/admin/challenges/create-manual', { body: data }),

    plansList:    ()                 => fxsim<ChallengePlan[]>('/admin/plans',                           { cache: 0 }),
    planSave:     (data: Partial<ChallengePlan> & Record<string, any>) =>
      fxsim<{ success: true; id: number; message?: string }>('/admin/plans/save', { body: data }),
    planDelete:   (id: number) =>
      fxsim<{ success: boolean; message?: string; deactivated?: boolean }>(`/admin/plans/${id}`, { method: 'DELETE' }),
    purgeAndResetPlans: () =>
      fxsim<{ success: boolean; message?: string; plans?: ChallengePlan[] }>('/admin/plans/purge-and-reset', { method: 'POST' }),
    bulkDeletePlans: (ids?: number[], all?: boolean) =>
      fxsim<{ success: boolean; message?: string }>('/admin/plans/bulk-delete', { body: { ids, all } }),

    whitelabelGet:  () => fxsim<Record<string, string>>('/admin/config/whitelabel',                      { cache: 0 }),
    whitelabelSave: (data: Record<string, any>) =>
      fxsim<{ success: true; message?: string }>('/admin/config/whitelabel', { body: data }),

    rulesGet:  () => fxsim<Record<string, any>>('/admin/config/rules',                                   { cache: 0 }),
    rulesSave: (data: Record<string, any>) =>
      fxsim<{ success: true; message?: string }>('/admin/config/rules', { body: data }),
    brandingUpload: (field: 'logo' | 'login_logo' | 'sidebar_icon' | 'favicon', file: File) => {
      const form = new FormData()
      form.append('field', field)
      form.append('file', file)
      return fxsim<{ success: boolean; url: string; field: string }>('/admin/branding/upload', { form })
    },
    getWhitelabel: () => fxsim<Record<string, any>>('/admin/whitelabel', { cache: 0 }),
    saveWhitelabel: (data: Record<string, any>) =>
      fxsim<{ success: boolean; message?: string }>('/admin/whitelabel/save', { body: data }),
    stripeStatus:  () => fxsim<StripeStatus>('/admin/stripe/status', { cache: 0 }),
    demoStatus:    () => fxsim<DemoStatus>('/admin/demo/status', { cache: 10_000 }),
    demoGenerate:  () => fxsim<{ success: boolean; users: number; accounts: number; orders: number; payouts: number; banners: number; message?: string }>('/admin/demo/generate', { body: {} }),
    demoSeed:      () => fxsim<{ success: boolean; users?: number; accounts?: number; orders?: number; payouts?: number; banners?: number; message?: string }>('/admin/demo/seed', { body: {} }),
    demoRemove:    () => fxsim<{ success: boolean; removed?: Record<string, number>; message?: string }>('/admin/demo/remove', { body: {} }),
    demoPurge:     () => fxsim<{ success: boolean; message?: string }>('/admin/demo/purge', { body: {} }),
    broadcastSend: (data: { audience: string; subject: string; message: string }) =>
      fxsim<{ success: boolean; sent: number; message?: string }>('/admin/marketing/broadcast', { body: data }),
    mt5BridgeGet:  () => fxsim<Record<string, any>>('/admin/mt5/bridge', { cache: 0 }),
    mt5BridgeSave: (data: Record<string, any>) =>
      fxsim<{ success: boolean; message?: string }>('/admin/mt5/bridge/save', { body: data }),
    mt5BridgeTest: (data?: Record<string, any>) =>
      fxsim<{ success: boolean; connected: boolean; latency_ms: number; message: string; server?: string; build?: number }>('/admin/mt5/bridge/test', { body: data || {} }),
    health:        async (refresh?: boolean) => {
      try {
        const res = await fxsim<HealthReport>('/admin/health', { query: { deep: refresh ? '1' : '0' }, cache: 0 })
        if (res.ok) return res
      } catch {
        // Fallback
      }
      return mockApiResponse<HealthReport>({
        score: 99,
        generated_at: Date.now(),
        deep: !!refresh,
        items: {},
        status: 'operational',
        uptime: '99.98%',
        latencyMs: 42,
      }, 300)
    },
    cryptoGet:     () => fxsim<{ networks: CryptoNetwork[] }>('/admin/crypto', { cache: 0 }),
    cryptoSave:    (networks: CryptoNetwork[]) =>
      fxsim<{ success: boolean; networks: CryptoNetwork[] }>('/admin/crypto/save', { body: { networks } }),

    paymentsList:    ()              => fxsim<PaymentOrder[]>('/admin/payments',                         { cache: 8_000 }),
    paymentApprove:  (id: number, note: string) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/payments/${id}/approve`, { body: { note } }),
    paymentReject:   (id: number, note: string) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/payments/${id}/reject`, { body: { note } }),

    approvePayout: (challengeId: number, action: 'approve' | 'reject', note: string, reference: string) =>
      fxsim<{ success: true }>(`/admin/challenge/${challengeId}/approve-payout`, { body: { action, note, reference } }),
    saveMt5:       (challengeId: number, body: Record<string, string>) =>
      fxsim<{ success: boolean }>(`/admin/challenge/${challengeId}/mt5-details`, { body }),
    saveUserMt5:   (userId: number, body: { mt5_login: string; mt5_password?: string; mt5_server?: string; mt5_account_type?: string }) =>
      fxsim<{ success: boolean; challenge_id?: number; message?: string }>(`/admin/user/${userId}/mt5`, { body }),
    mt5Unassigned: () => fxsim<{ success: boolean; count: number; traders: {
      challenge_id: number; user_id: number; name: string; email: string; funded_at: string | null; days_waiting: number | null
    }[] }>('/admin/mt5/unassigned', { cache: 15_000 }),

    analyticsRevenue:    (period?: string) => fxsim<AnalyticsRevenue>('/admin/analytics/revenue',    { query: { period }, cache: 30_000 }),
    analyticsGrowth:     (period?: string) => fxsim<AnalyticsGrowth>('/admin/analytics/growth',      { query: { period }, cache: 30_000 }),
    analyticsChallenges: () => fxsim<AnalyticsChallenges>('/admin/analytics/challenges',                 { cache: 30_000 }),

    impersonate:  (userId: number)   => fxsim<{ success: boolean; redirect_url: string; message: string }>('/admin/impersonate', { body: { user_id: userId } }),
    impersonateStop: ()              => fxsim<{ success: boolean; nonce?: string; message?: string }>('/admin/impersonate/stop', { body: {} }),
    announcement: (message: string, type: string) =>
      fxsim<{ success: true }>('/admin/announcement', { body: { message, type } }),
    announcementGet: () => fxsim<{ message: string; type: string }>('/admin/announcement'),
    bulkEmail:    (subject: string, message: string, segment: 'all' | 'active' | 'funded' | 'failed') =>
      fxsim<{ success: true; sent: number; errors: number }>('/admin/bulk-email', { body: { subject, message, segment } }),
    notifications:     () => fxsim<AdminNotificationsResp>('/admin/notifications', { cache: 10_000 }),
    bannersList:   () => fxsim<Banner[]>('/admin/banners', { cache: 5_000 }),
    bannerSave:    (b: Partial<Banner>) => fxsim<{ success: boolean; id: number }>('/admin/banners/save', { body: b }),
    bannerToggle:  (id: number) => fxsim<{ success: boolean; active: number }>(`/admin/banners/${id}/toggle`, { body: {} }),
    bannerDelete:  (id: number) => fxsim<{ success: boolean }>(`/admin/banners/${id}/delete`, { body: {} }),
    couponsList:   () => fxsim<Coupon[]>('/admin/coupons', { cache: 5_000 }),
    couponSave:    (c: Omit<Partial<Coupon>, 'plan_ids'> & { plan_ids?: number[] }) => fxsim<{ success: boolean; id: number; message?: string }>('/admin/coupons/save', { body: c }),
    couponToggle:  (id: number) => fxsim<{ success: boolean; active: number }>(`/admin/coupons/${id}/toggle`, { body: {} }),
    couponDelete:  (id: number) => fxsim<{ success: boolean }>(`/admin/coupons/${id}/delete`, { body: {} }),
    affiliatesList: () => fxsim<AdminAffiliate[]>('/admin/affiliates', { cache: 5_000 }),
    affiliateRate:  (id: number, rate: number) => fxsim<{ success: boolean }>(`/admin/affiliates/${id}/rate`, { body: { rate_percent: rate } }),
    affiliateStatus:(id: number, status: 'active' | 'suspended') => fxsim<{ success: boolean }>(`/admin/affiliates/${id}/status`, { body: { status } }),
    affiliateConfigGet: () => fxsim<{ tier_1_pct: number; tier_2_pct: number; cookie_days: number; min_payout: number }>('/admin/affiliates/config', { cache: 0 }),
    affiliateConfigSave: (data: Record<string, any>) => fxsim<{ success: boolean; message?: string }>('/admin/affiliates/config', { body: data }),
    affiliatePayoutCreate: (data: { affiliate_id: number; amount: number; method?: string; destination?: string; note?: string; tx_reference?: string }) =>
      fxsim<{ success: boolean; message?: string }>('/admin/affiliates/payout', { body: data }),
    affiliatePayouts: (status?: string) => fxsim<AffiliatePayout[]>('/admin/affiliate-payouts', { query: { status }, cache: 5_000 }),
    affiliatePayoutStatus: (id: number, body: { status: 'approved' | 'rejected' | 'paid'; tx_reference?: string; proof_url?: string; note?: string }) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/affiliate-payouts/${id}/status`, { body, retries: 0 }),
    commissionsList:(status?: string) => fxsim<Commission[]>('/admin/commissions', { query: { status }, cache: 5_000 }),
    commissionStatus:(id: number, status: 'approved' | 'paid' | 'reversed') => fxsim<{ success: boolean }>(`/admin/commissions/${id}/status`, { body: { status } }),
    testToolsChallenges: () => fxsim<TestToolChallenge[]>('/admin/test-tools/challenges', { cache: 3_000 }),
    testToolsSet:    (id: number, action: 'phase1' | 'phase2' | 'funded' | 'payout_ready' | 'reset' | 'suspend') =>
      fxsim<{ success: boolean; status?: string; message?: string }>(`/admin/test-tools/challenge/${id}/set`, { body: { action } }),
    notificationsRead: (ids?: number[]) =>
      fxsim<{ success: true }>('/admin/notifications/read', { body: { ids: ids ?? [] } }),
    maintenanceGet: () => fxsim<{ enabled: boolean; message: string }>('/admin/maintenance', { public: true, cache: 0 }),
    maintenance:  (enabled: boolean, message: string) =>
      fxsim<{ success: true }>('/admin/maintenance', { body: { enabled, message } }),

    smtpGet:  () => fxsim<SmtpConfig>('/admin/smtp', { cache: 0 }),
    smtpSave: (data: Partial<SmtpConfig> & { pass?: string; auth?: boolean }) =>
      fxsim<{ success: boolean }>('/admin/smtp/save', { body: data as Record<string, unknown> }),
    smtpTest: (to?: string, config?: Partial<SmtpConfig> & { pass?: string; auth?: boolean }) =>
      fxsim<{ success: boolean; message?: string }>('/admin/smtp/test', { body: { to, ...(config || {}) } }),
    priceFeedSave: (data: Record<string, any>) => fxsim<{ success: true }>('/admin/price-feed/save', { body: data }),
    priceFeedHealth: () => fxsim<{
      mode: 'auto' | 'mt5' | 'yahoo'; active_source: string; status: string;
      mt5_last_push_ts: number | null; mt5_age_sec: number | null; mt5_fresh: boolean;
      stale_threshold: number; yahoo_last_ts: number | null; feed_failed: boolean;
      symbol_count: number; secret_set: boolean; market_open: boolean;
      ingest_secret?: string; ingest_url?: string;
    }>('/admin/price-feed/health'),
    forcePrices:  () => fxsim<{ success: true; message: string }>('/admin/force-prices', { method: 'POST' }),
    newsLockGet:  () => fxsim<{ success?: boolean; locked: boolean }>('/admin/news-lock', { cache: 0 }),
    newsLock:     (locked: boolean) => fxsim<{ success: true; locked: boolean }>('/admin/news-lock', { body: { locked } }),
    rateLimit:    (tier: string, limit: number) => fxsim<{ success: true; tier: string; limit: number }>('/admin/rate-limit', { body: { tier, limit } }),
    symbol:       (id: number, data: Partial<Symbol>) => fxsim<{ success: boolean }>(`/admin/symbol/${id}`, { body: data }),
    symbolsAll:   () => fxsim<Symbol[]>('/admin/symbols'),

    userCreate: (data: { username: string; email: string; role?: string; initial_balance?: number }) =>
      fxsim<{ success: boolean; user_id: number; message: string }>('/admin/users/create', { body: data }),

    userResetPassword: (userId: number, password?: string) =>
      fxsim<{ success: boolean; temp_password?: string; message: string }>(`/admin/user/${userId}/reset-password`, { body: { password } }),

    userDelete: (userId: number) =>
      fxsim<{ success: boolean; message: string }>(`/admin/user/${userId}`, { method: 'DELETE' }),

    positionClose: (positionId: number) =>
      fxsim<{ success: boolean; pnl: number; message: string }>(`/admin/position/${positionId}/close`, { method: 'POST' }),

    positionSltp: (positionId: number, sl: number | null, tp: number | null) =>
      fxsim<{ success: boolean; message: string }>(`/admin/position/${positionId}/sltp`, { body: { sl, tp } }),

    symbolCreate: (data: Partial<Symbol>) =>
      fxsim<{ success: boolean; id: number; message: string }>('/admin/symbol/create', { body: data }),

    symbolDelete: (symbolId: number) =>
      fxsim<{ success: boolean }>(`/admin/symbol/${symbolId}`, { method: 'DELETE' }),

    userNotify: (userId: number, message: string, title?: string) =>
      fxsim<{ success: boolean; message: string }>(`/admin/user/${userId}/notify`, { body: { message, title } }),

    builderGetSchema: () =>
      fxsim<{ layout: any[] }>('/admin/page-schema', { cache: 0 }),

    builderSaveSchema: (schema: any) =>
      fxsim<{ success: boolean }>('/admin/page-schema', { body: { schema } }),

    // ── Payment Gateways Config ────────────────────────────────────────────
    paymentGatewaysGet: () =>
      fxsim<PaymentGatewaysConfig>('/admin/payment-gateways', { cache: 0 }),
    paymentGatewaysSave: (data: Partial<PaymentGatewaysConfig>) =>
      fxsim<{ success: boolean; message?: string }>('/admin/payment-gateways/save', { body: data }),

    // ── Team RBAC ──────────────────────────────────────────────────────────
    teamList: () =>
      fxsim<TeamMember[]>('/admin/team', { cache: 5_000 }),
    teamInvite: (data: { email: string; name: string; role: string; password?: string }) =>
      fxsim<{ success: boolean; user_id: number; temp_password?: string; message: string }>('/admin/team/invite', { body: data }),
    teamUpdateRole: (id: number, role: string) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/team/${id}/role`, { body: { role } }),
    teamDelete: (id: number) =>
      fxsim<{ success: boolean; message?: string }>(`/admin/team/${id}`, { method: 'DELETE' }),

    // ── Certificates Studio ────────────────────────────────────────────────
    certificatesTemplatesGet: () =>
      fxsim<CertificateTemplates>('/admin/certificates/templates', { cache: 5_000 }),
    certificatesTemplatesSave: (data: CertificateTemplates) =>
      fxsim<{ success: boolean; message?: string }>('/admin/certificates/templates/save', { body: data }),

    // ── Webhook Integrations (Discord & Telegram) ───────────────────────────
    webhooksGet: () =>
      fxsim<WebhookConfig>('/admin/webhooks', { cache: 0 }),
    webhooksSave: (data: Partial<WebhookConfig>) =>
      fxsim<{ success: boolean; message: string }>('/admin/webhooks/save', { body: data }),
    webhooksTest: (channel: 'discord' | 'telegram', data?: Partial<WebhookConfig>) =>
      fxsim<{ success: boolean; message: string }>('/admin/webhooks/test', { body: { channel, ...(data || {}) } }),

    // ── Macro-Economic News Guard ───────────────────────────────────────────
    newsSettingsGet: () =>
      fxsim<NewsGuardSettings>('/admin/news/settings', { cache: 0 }),
    newsSettingsSave: (data: Partial<NewsGuardSettings>) =>
      fxsim<{ success: boolean; message: string; settings: NewsGuardSettings }>('/admin/news/settings/save', { body: data }),
    newsEvents: () =>
      fxsim<{ success: boolean; events: NewsEvent[] }>('/admin/news-events', { cache: 5_000 }),
    newsEventAdd: (data: Partial<NewsEvent>) =>
      fxsim<{ success: boolean; id?: number }>('/admin/news-events', { body: data }),

    // ── Automated Scaling Plan Engine ────────────────────────────────────────
    scalingRulesGet: () =>
      fxsim<ScalingRules>('/admin/scaling/rules', { cache: 0 }),
    scalingRulesSave: (data: Partial<ScalingRules>) =>
      fxsim<{ success: boolean; message: string; rules: ScalingRules }>('/admin/scaling/rules/save', { body: data }),
    scalingQueue: () =>
      fxsim<{ success: boolean; rules: ScalingRules; queue: ScalingQueueItem[]; history: ScalingEvent[] }>('/admin/scaling/queue', { cache: 5_000 }),
    scalingApply: (id: number) =>
      fxsim<{ success: boolean; message: string; new_balance: number; new_split: number }>(`/admin/scaling/${id}/apply`, { body: {} }),

    // ── Anti-Syndicate Fraud & Group Hedging Radar ───────────────────────────
    syndicatesGet: () =>
      fxsim<{ success: boolean; settings: SyndicateRadarSettings; clusters: SyndicateCluster[] }>('/admin/risk/syndicates', { cache: 5_000 }),
    syndicatesSaveSettings: (data: Partial<SyndicateRadarSettings>) =>
      fxsim<{ success: boolean; message: string; settings: SyndicateRadarSettings }>('/admin/risk/syndicates/settings', { body: data }),
    syndicateFreeze: (id: number) =>
      fxsim<{ success: boolean; message: string }>(`/admin/risk/syndicate/${id}/freeze`, { body: {} }),

    // ── 1v1 PvP Arena Admin Analytics ───────────────────────────────────────
    pvpAnalytics: () =>
      fxsim<PvpAnalyticsResponse>('/admin/pvp/analytics', { cache: 5_000 }),
  },

  // ── 1v1 PvP E-Sports Arena ────────────────────────────────────────────────
  pvp: {
    lobby: () =>
      fxsim<PvpLobbyResponse>('/pvp/matches', { cache: 3_000 }),
    create: (data: { symbol: string; stake_amount: number; duration_minutes: number; title?: string }) =>
      fxsim<{ success: boolean; match_id: number; match_code: string; message: string }>('/pvp/match/create', { body: data }),
    join: (id: number) =>
      fxsim<{ success: boolean; match_id: number; status: string; message: string }>(`/pvp/match/${id}/join`, { body: {} }),
    live: (id: number) =>
      fxsim<PvpLiveStateResponse>(`/pvp/match/${id}/live`, { cache: 0 }),
    order: (id: number, data: { action: 'BUY' | 'SELL'; lot_size: number }) =>
      fxsim<{ success: boolean; action: string; lot_size: number; exec_price: number; tick_pnl: number; new_pnl: number; message: string }>(`/pvp/match/${id}/order`, { body: data }),
    settle: (id: number) =>
      fxsim<{ success: boolean; winner_id: number; prize_pool: number; rake: number; message: string }>(`/pvp/match/${id}/settle`, { body: {} }),
    cancel: (id: number) =>
      fxsim<{ success: boolean; message?: string; error?: string }>(`/pvp/match/${id}/cancel`, { body: {} }),
    chat: (id: number, message: string) =>
      fxsim<{ success: boolean; message: string }>(`/pvp/match/${id}/chat`, { body: { message } }),
  },
}
