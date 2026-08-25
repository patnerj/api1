import { useQuery, type QueryKey } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HistoryResp, type ApiResult } from '@/types/api';

// Live data that must stay fresh (account, open positions, risk desk) polls at
// 10s. Everything else is fetched on demand with a staleTime so it isn't
// re-hammered on every mount/refocus.
const LIVE_INTERVAL = 10_000;
const DEFAULT_STALE = 30_000;
const SLOW_STALE = 60_000;

interface QueryOpts {
  /** refetchInterval in ms, or false to disable polling (default false). */
  interval?: number | false;
  /** staleTime in ms. */
  staleTime?: number;
  enabled?: boolean;
}

/** Shared factory: unwraps ApiResult (throws on !ok) and applies query options. */
function useApiQuery<T>(
  key: QueryKey,
  fn: () => Promise<ApiResult<T>>,
  opts: QueryOpts = {},
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = await fn();
      if (!res.ok) throw new Error(res.error || 'Request failed');
      return res.data;
    },
    refetchInterval: opts.interval ?? false,
    staleTime: opts.staleTime ?? DEFAULT_STALE,
    enabled: opts.enabled,
  });
}

export function useAccountQuery() {
  return useApiQuery(['account'], () => api.account(), { interval: LIVE_INTERVAL });
}

export function useChallengeMyQuery() {
  return useApiQuery(['challengeMy'], () => api.challengeMy(), { interval: DEFAULT_STALE });
}

// Drawdown/profit metrics poll every 15s (like the terminal) so the rule
// gauges never freeze at a stale snapshot while a session stays open.
export function useChallengeMetricsQuery(challengeId?: number) {
  return useApiQuery(
    ['challengeMetrics', challengeId],
    () => api.challengeMetrics(challengeId!),
    { enabled: !!challengeId, interval: 15_000 },
  );
}

export function usePositionsQuery() {
  return useApiQuery(['positions'], () => api.positions(), { interval: LIVE_INTERVAL });
}

// Disambiguated query key to avoid collision with infinite scroll history page
export function useHistoryQuery() {
  return useApiQuery(
    ['history', 'latest'],
    async () => {
      const res = await api.history();
      if (!res.ok) return res;
      return { ok: true as const, status: res.status, data: (res.data as HistoryResp)?.trades || [] };
    },
    { staleTime: DEFAULT_STALE },
  );
}

export function useKycQuery() {
  return useApiQuery(['kyc'], () => api.kycGet(), { staleTime: SLOW_STALE });
}

export function useTraderTicketsQuery() {
  return useApiQuery(['trader', 'tickets'], () => api.tickets.list(), { staleTime: SLOW_STALE });
}

// ── Admin Query Hooks ──────────────────────────────────────────────────

export function useAdminPaymentsQuery() {
  return useApiQuery(['admin', 'payments'], () => api.admin.paymentsList(), { staleTime: DEFAULT_STALE });
}

export function useAdminChallengesQuery() {
  return useApiQuery(['admin', 'challenges'], () => api.admin.challenges(), { staleTime: DEFAULT_STALE });
}

export function useAdminTrendsQuery() {
  return useApiQuery(['admin', 'trends'], () => api.admin.analyticsRevenue(), { staleTime: SLOW_STALE });
}

export function useAdminUsersQuery(search = '', filter = '', page = 1) {
  return useApiQuery(['admin', 'users', search, filter, page], () => api.admin.users(search, page), { staleTime: DEFAULT_STALE });
}

export function useAdminKycListQuery(statusFilter = 'all') {
  return useApiQuery(['admin', 'kycList', statusFilter], () => api.admin.kycList(statusFilter), { staleTime: DEFAULT_STALE });
}

export function useAdminPayoutsListQuery(statusFilter = 'all') {
  return useApiQuery(['admin', 'payoutsList', statusFilter], () => api.admin.payoutsList(statusFilter), { staleTime: DEFAULT_STALE });
}

export function useAdminTicketsQuery() {
  return useApiQuery(['admin', 'tickets'], () => api.admin.tickets.list(), { staleTime: DEFAULT_STALE });
}

export function useAdminRiskQuery() {
  return useApiQuery(['adminRisk'], () => api.admin.risk(), { interval: LIVE_INTERVAL });
}

export function useAdminRiskAlertsQuery() {
  return useApiQuery(['adminRiskAlerts'], () => api.admin.riskAlerts(), { interval: LIVE_INTERVAL });
}

export function useAdminRiskExposureQuery() {
  return useApiQuery(['adminRiskExposure'], () => api.admin.riskExposure(), { interval: LIVE_INTERVAL });
}

export function useAdminWhitelabelQuery() {
  return useApiQuery(['adminWhitelabel'], () => api.admin.whitelabelGet(), { staleTime: SLOW_STALE });
}
