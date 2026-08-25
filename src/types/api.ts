/**
 * Type definitions for the existing fxsim/v1 REST API.
 * Mirrors what the WordPress plugin actually returns — do not invent fields.
 *
 * Source of truth: includes/class-rest-api.php in PropFirm_System v8.3
 */

// ── Generic envelope ─────────────────────────────────────────────────────────
export type ApiOk<T>    = { ok: true;  data: T;  status: number }
export type ApiErr      = { ok: false; status: number; error: string; raw?: unknown }
export type ApiResult<T> = ApiOk<T> | ApiErr

// ── Prices (GET /prices, public) ─────────────────────────────────────────────
export interface PriceTick {
  bid: number
  ask: number
  mid: number
  ts:  number
}
export type PricesMap = Record<string, PriceTick>

// ── Symbol (GET /symbols) ────────────────────────────────────────────────────
export interface Symbol {
  id:           number
  symbol:       string
  display_name: string
  type:         'forex' | 'commodity' | 'index' | 'crypto' | string
  spread:       number
  contract_size: number
  min_lot:      number
  max_lot:      number
  digits:       number
  swap_long:    number
  swap_short:   number
  is_active:    0 | 1
  category: string
}

// ── Account (GET /account) ───────────────────────────────────────────────────
export interface Account {
  id:           number
  user_id:      number
  balance:      number | string  // wpdb may return DECIMAL as string
  equity:       number | string
  margin_used:  number | string
  leverage:     number
  status:       'active' | 'breached' | 'suspended' | string
  challenge_status?: 'active' | 'funded' | 'failed' | 'passed' | string | null
  read_only?:   boolean
  created_at:   string
}

export interface NoChallengeResp { error: string; no_challenge: true }

// ── Position (GET /positions) ────────────────────────────────────────────────
export interface Position {
  id:           number
  account_id:   number
  symbol:       string
  type:         'buy' | 'sell'
  lot_size:     number | string
  open_price:   number | string
  current_price: number | string
  sl:           number | string | null
  tp:           number | string | null
  pnl:          number | string
  swap:         number | string
  commission:   number | string
  margin:       number | string
  opened_at:    string
  opened_at_iso?: string | null
  isOptimistic?: boolean
}

// ── Trade (history) ──────────────────────────────────────────────────────────
export interface Trade {
  id:           number
  account_id:   number
  symbol:       string
  type:         'buy' | 'sell'
  lot_size:     number | string
  open_price:   number | string
  close_price:  number | string
  pnl:          number | string
  swap:         number | string
  commission:   number | string
  sl?:          number | string | null
  tp?:          number | string | null
  opened_at:    string
  closed_at:    string
  tags?:        string[]
  note?:        string | null
  /** Offset-aware ISO-8601 timestamps (preferred for display; backend-provided) */
  opened_at_iso?: string | null
  closed_at_iso?: string | null
}
export interface HistoryResp {
  trades:      Trade[]
  next_cursor: number | null
  has_more:    boolean
  stats?: {
    total:   number
    wins:    number
    losses:  number
    netPnL:  number
    winRate: number
  }
}

// ── KYC (identity verification) ──────────────────────────────────────────────
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'
export interface KycInfo {
  status:        KycStatus
  doc_type?:     string
  country?:      string
  admin_note?:   string | null
  submitted_at?: string | null
  reviewed_at?:  string | null
  docs?: { id_doc?: boolean; id_doc_back?: boolean; selfie?: boolean; address_doc?: boolean }
}

// ── Payouts (history + availability) ─────────────────────────────────────────
export type PayoutStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid'
export interface PayoutItem {
  id:               number
  challenge_id:     number
  name?:            string
  trader_name?:     string
  username?:        string
  plan_name?:       string
  amount_requested: number
  trader_amount:    number
  firm_amount:      number
  profit_split_pct: number
  status:           PayoutStatus
  payment_method?:  string | null
  tx_reference?:    string | null
  proof_url?:       string | null
  admin_note?:      string | null
  requested_at:     string | null
  processed_at:     string | null
}
export interface PayoutsResp {
  history:        PayoutItem[]
  available:      number
  kyc_approved:   boolean
  cycle_days:     number
  next_payout_at: string | null
}

// ── Admin queues ─────────────────────────────────────────────────────────────
export interface AdminKycRow {
  id:           number
  user_id:      number
  username:     string
  email:        string
  name:         string
  status:       'pending' | 'approved' | 'rejected'
  admin_note:   string | null
  submitted_at: string | null
  reviewed_at:  string | null
  country?:     string
  doc_type?:    string
  id_doc?:      string | null
  id_doc_back?: string | null
  selfie?:      string | null
  address_doc?: string | null
  created_at?:  string
  docs:         { id_doc: string | null; id_doc_back?: string | null; selfie: string | null; address_doc: string | null }
}
export type KycSubmission = AdminKycRow
export interface AdminPayoutRow {
  id:               number
  challenge_id:     number
  user_id:          number
  username:         string
  email:            string
  name:             string
  amount_requested: number
  trader_amount:    number
  firm_amount:      number
  profit_split_pct: number
  status:           PayoutStatus
  payment_method:   string | null
  payment_address:  string | null
  tx_reference:     string | null
  proof_url:        string | null
  admin_note:       string | null
  requested_at:     string | null
  processed_at:     string | null
}

// ── Pending order ────────────────────────────────────────────────────────────
export interface PendingOrder {
  id:           number
  account_id:   number
  symbol:       string
  order_type:   'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop'
  type:         'buy' | 'sell'
  lot_size:     number | string
  target_price: number | string
  sl:           number | string | null
  tp:           number | string | null
  margin:       number | string
  status:       'pending' | 'filled' | 'cancelled' | 'rejected' | 'expired'
  expires_at:   string | null
  reject_reason: string | null
  created_at:   string
  created_at_iso?: string | null
  isOptimistic?: boolean
}

// ── Transaction ──────────────────────────────────────────────────────────────
export interface Transaction {
  id:         number
  account_id: number
  type:       'commission' | 'swap' | 'pnl' | 'adjustment' | 'deposit' | 'withdrawal'
  amount:     number | string
  balance_after: number | string
  note:       string | null
  created_at: string
}

// ── Stats ────────────────────────────────────────────────────────────────────
export interface BasicStats {
  total_trades:  number
  wins:          number
  losses:        number
  win_rate:      number
  profit_factor: number
  net_pnl:       number
  gross_profit:  number
  gross_loss:    number
}

export interface FullStats extends BasicStats {
  account:           Account
  challenge:         ChallengeAccount | null
  avg_win:           number
  avg_loss:          number
  best_trade:        number
  worst_trade:       number
  max_consec_wins:   number
  max_consec_losses: number
  max_drawdown_pct:  number
  equity_curve:      { date: string; balance: number }[]
  by_symbol:         Record<string, { trades: number; pnl: number; wins: number }>
  trades:            Trade[]
}

export interface AdvancedStats {
  avg_rr:   number
  rr_list:  number[]
  hours:    { hour: number; trades: number; pnl: number; win_rate: number }[]
  best_hour: number
  days:     { dow: number; name: string; trades: number; pnl: number; win_rate: number }[]
  drawdown_curve: { date: string; drawdown_pct: number; balance: number }[]
  total_trades: number
}

// ── Challenge ────────────────────────────────────────────────────────────────
export interface ChallengePlan {
  id:                  number
  name:                string
  slug:                string
  account_size:        number | string
  price:               number | string
  currency:            string
  phases:              number
  plan_type?:          '1-step' | '2-step' | '3-step' | 'instant'
  is_instant_funding?: number | 0 | 1
  drawdown_type:       'static' | 'trailing' | 'eod_trailing' | 'static_balance' | 'trailing_equity' | 'trailing_balance'
  p1_profit_target:    number | string
  p1_daily_dd:         number | string
  p1_max_dd:           number | string
  p1_min_days:         number
  p1_max_days:         number
  p2_profit_target:    number | string
  p2_daily_dd:         number | string
  p2_max_dd:           number | string
  p2_min_days:         number
  p2_max_days:         number
  p3_profit_target:    number | string
  p3_daily_dd:         number | string
  p3_max_dd:           number | string
  p3_min_days:         number
  p3_max_days:         number
  funded_profit_split: number | string
  funded_max_dd:       number | string
  max_leverage:        number
  max_lot_size:        number | string
  news_trading:        number | 0 | 1
  weekend_holding:     number | 0 | 1
  consistency_rule:    number | 0 | 1
  consistency_pct:     number | string
  ea_allowed:          number | 0 | 1
  hedging_allowed:     number | 0 | 1
  copy_trading_allowed: number | 0 | 1
  stop_loss_required:  number | 0 | 1
  max_inactivity_days: number
  ip_matching_required: number | 0 | 1
  martingale_allowed:  number | 0 | 1
  refundable_fee:      number | 0 | 1
  news_window_minutes: number
  evaluation_profit_share: number | string
  min_trade_seconds:   number
  min_hold_action?:    'flag' | 'reject' | 'void_pnl' | string
  margin_call_level:   number | string
  scaling_enabled:     number | 0 | 1
  scaling_growth_pct:  number | string
  scaling_max_balance: number | string
  scaling_interval_months: number
  scaling_required_profit_pct: number | string
  reset_discount_pct?: number | string
  is_active:           number | 0 | 1
  sort_order:          number
}

export interface ChallengeAccount {
  id:                 number
  user_id:            number
  plan_id:            number
  fxsim_account_id:   number
  phase:              number
  status:             'active' | 'passed' | 'failed' | 'funded' | 'suspended'
  starting_balance:   number | string
  current_balance:    number | string
  peak_balance:       number | string
  daily_start_balance: number | string
  trading_days:       number
  last_trade_date:    string | null
  breach_reason:      string | null
  breach_at:          string | null
  phase_started_at:   string
  phase_ends_at:      string | null
  passed_at:          string | null
  failed_at:          string | null
  funded_at:          string | null
  scaling_level:      number
  last_scaled_at:     string | null
  created_at:         string
  ip_mismatched?:     boolean
  // Joined from plan in /challenge/my
  plan_name?:           string
  account_size?:        number | string
  funded_profit_split?: number | string
  custom_profit_split?: number | string | null
  drawdown_type?:       'static' | 'trailing' | 'eod_trailing'
  p1_profit_target?:  number | string
  p1_daily_dd?:       number | string
  p1_max_dd?:         number | string
  p1_min_days?:       number
  p1_max_days?:       number
  p2_profit_target?:  number | string
  p2_daily_dd?:       number | string
  p2_max_dd?:         number | string
  p2_min_days?:       number
  p2_max_days?:       number
}

export interface ChallengeMetrics {
  challenge:           ChallengeAccount
  plan:                ChallengePlan
  account:             Account
  phase:               number
  status:              ChallengeAccount['status']
  breach_reason:       string | null
  balance:             number
  equity:              number
  starting_balance:    number
  profit_target_pct:   number
  profit_target_val:   number
  current_profit:      number
  current_profit_pct:  number
  profit_progress:     number
  max_dd_pct:          number
  max_dd_val:          number
  current_dd:          number
  current_dd_pct:      number
  dd_remaining:        number
  max_dd_progress:     number
  daily_dd_pct:        number
  daily_dd_val:        number
  current_daily_loss:  number
  daily_dd_used_pct:   number
  daily_dd_progress:   number
  min_trading_days:    number
  max_trading_days:    number
  trading_days_done:   number
  days_remaining:      number
  days_progress:       number
  win_rate:            number
  profit_factor:       number
  total_trades:        number
  net_pnl:             number
  equity_chart:        { date: string; balance: number }[]
}

// ── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  id:         number
  type:       'info' | 'success' | 'warning' | 'error'
  title:      string
  message:    string
  link:       string | null
  is_read:    0 | 1
  created_at: string
  created_at_iso?: string | null
}
export interface NotificationsResp {
  notifications: Notification[]
  unread_count:  number
  total?:        number
  has_more?:     boolean
  page?:         number
  per_page?:     number
}

export interface AdminNotification {
  id:             number
  type:           'info' | 'success' | 'warning' | 'error'
  title:          string
  message:        string
  link:           string | null
  is_read:        0 | 1
  ref_user_id:    number | null
  ref_user_label: string | null
  created_at:     string
  created_at_iso?: string | null
}
export interface AdminNotificationsResp {
  notifications: AdminNotification[]
  unread_count:  number
}

export interface AffiliateMe {
  enrolled:      boolean
  code?:         string
  rate_percent?: number
  status?:       'active' | 'suspended'
  payout_method?:      'usdt_trc20' | 'usdt_bep20' | 'wise' | null
  payout_destination?: string | null
  available_balance?:  number
  stats?:        { referrals: number; conversions: number; total: number; unpaid: number; paid: number }
}
export interface AffiliatePayout {
  id:            number
  amount:        number | string
  method:        string
  destination:   string
  status:        'pending' | 'approved' | 'rejected' | 'paid'
  tx_reference:  string | null
  proof_url:     string | null
  admin_note:    string | null
  created_at:    string
  processed_at:  string | null
  created_at_iso?: string | null
  affiliate_code?: string
  user_login?:     string
  display_name?:   string
  user_email?:     string
}
export interface Commission {
  id:            number
  order_id:      number
  base_amount:   number
  rate_percent:  number
  amount:        number
  status:        'pending' | 'approved' | 'paid' | 'reversed'
  created_at:    string
  paid_at:       string | null
  created_at_iso?: string | null
  affiliate_login?: string
  referred_login?:  string | null
}
export interface AdminAffiliate {
  id:           number
  user_id:      number
  code:         string
  rate_percent: number
  status:       'active' | 'suspended'
  user_login:   string
  user_email:   string
  display_name: string
  conversions:  number
  total:        number
  paid:         number
  unpaid:       number
  referrals:    number
  payment_destination?: string
  payout_destination?:  string
  payment_method?: string
}

export interface Coupon {
  id:             number
  code:           string
  type:           'percent' | 'fixed'
  value:          number
  currency:       string
  expires_at:     string | null
  usage_limit:    number
  per_user_limit: number
  plan_ids:       string | null
  active:         0 | 1
  used_count:     number
  // analytics (from /admin/coupons)
  uses?:          number
  discount_total?: number
  revenue?:       number
  expires_at_iso?: string | null
  created_at?:    string
}

export interface Banner {
  id:            number
  title:         string
  message:       string
  placement:     'top' | 'dashboard' | 'both'
  scope_type:    'global' | 'page'
  scope_path:    string | null
  bg_color:      string | null
  text_color:    string | null
  cta_label:     string | null
  cta_url:       string | null
  coupon_code:   string | null
  starts_at:     string | null
  ends_at:       string | null
  countdown_to:  string | null
  active:        0 | 1
  priority:      number
  ends_at_iso?:      string | null
  countdown_to_iso?: string | null
  starts_at_iso?:    string | null
  // admin-only (present on /admin/banners)
  impressions?:  number
  clicks?:       number
  created_at?:   string
  updated_at?:   string | null
  ver?: string
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardRow {
  user_id?:          number
  trader_name:       string
  phase:             number
  status:            string
  plan_name:         string
  account_size:      number | string
  current_balance:   number | string
  starting_balance:  number | string
  profit_pct:        number | string
  trading_days:      number
  funded_at:         string | null
  total_trades:      number
}

// ── Payment ──────────────────────────────────────────────────────────────────
export interface CryptoNetwork {
  network:      string
  address:      string
  label:        string
  instructions: string
  enabled?:     boolean
}

export interface DemoStatus {
  active:   boolean
  generating?: boolean
  users:    number
  accounts: number
  orders:   number
  payouts:  number
  banners:  number
  created?: number | null
}

export interface SmtpConfig {
  host:       string
  port:       number
  auth:       boolean
  user:       string
  pass_set:   boolean
  secure:     'tls' | 'ssl' | ''
  from_email: string
  from_name:  string
  reply_to:   string
}

export interface HealthItem {
  label:   string
  state:   'ok' | 'warn' | 'error'
  detail:  string
  explain?: string
  ts?:     number | null
}

export interface HealthReport {
  score:        number
  generated_at: number
  deep:         boolean
  items:        Record<string, HealthItem>
  status?:      string
  uptime?:      string
  latencyMs?:   number
}

export interface StripeStatus {
  has_public_key:     boolean
  has_secret_key:     boolean
  has_webhook_secret: boolean
  mode:               string
  connected:          boolean
  account:            string
  message:            string
  webhook_url?:       string
}

export interface PaymentConfig {
  instructions:      string
  crypto_address:    string
  crypto_networks:   CryptoNetwork[]
  has_coinpayments:  boolean
  has_confirmo?:     boolean
  has_stripe:        boolean
  has_manual_crypto: boolean
}

export interface PaymentOrder {
  id:           number
  user_id:      number
  plan_id:      number
  amount:       string
  gateway:      string
  status:       'pending' | 'submitted' | 'approved' | 'rejected'
  proof_url:    string | null
  proof_view_url?: string | null
  txn_id?:      string | null
  admin_note:   string | null
  created_at:   string
  reviewed_at:  string | null
  currency?:    string
  user_email?:  string
}

// ── Certificate ──────────────────────────────────────────────────────────────
export interface Certificate {
  trader_name:  string
  plan_name:    string
  account_size: number | string
  profit_split: number | string
  challenge_id: number
  issued_date:  string
  brand:        string
  status?:      string
  share_code?:  string
}

// ── Auth (new endpoints we add to backend) ───────────────────────────────────
export interface AuthUser {
  id:         number
  username:   string
  email:      string
  display_name: string
  is_admin:   boolean
  email_verified: boolean
  two_factor: boolean
}

// ── Trade ticket payloads ────────────────────────────────────────────────────
export interface OpenOrderBody {
  symbol:         string
  type:           'buy' | 'sell'
  lot_size:       number
  sl?:            number | null
  tp?:            number | null
  account_id?:    number
  tournament_id?: number
}

export interface PendingOrderBody {
  symbol:         string
  order_type:     PendingOrder['order_type']
  type:           'buy' | 'sell'
  lot_size:       number
  target_price:   number
  sl?:            number | null
  tp?:            number | null
  expires_at?:    string | null
  account_id?:    number
  tournament_id?: number
}

// ── Admin ────────────────────────────────────────────────────────────────────
export interface AdminStats {
  users:             number
  open_positions:    number
  total_trades:      number
  total_pnl:         number
  total_revenue?:    number
  active_challenges: number
  funded_accounts:   number
  pending_payments:  number
}

export interface AdminUserRow {
  user_id:           number
  user_login:        string
  user_email:        string
  user_registered:   string
  balance:           number | string
  equity:            number | string
  margin_used:       number | string
  status:            string
  account_id:        number | null
  active_challenges: number
  funded_challenges: number
  kyc_status?:       string
  plan_name?:        string
  starting_balance?: number | string
}

export interface AdminRisk {
  funded_count:          number
  funded_capital:        number
  active_challenges:     number
  pending_payout_value:  number
  pending_payout_count:  number
  approved_payout_value: number
  frozen_count:          number
  banned_count:          number
  near_breach:           number
}

export interface AdminUserDetail {
  user:    { id: number; username: string; email: string; display_name: string; registered: string }
  account: { id?: number; account_id?: number; status: string; balance: number | string; equity: number | string; margin_used?: number | string; leverage?: number } | null
  note:    string
  challenges: { id: number; plan_id: number; phase: number; status: string; starting_balance: number | string; current_balance: number | string; trading_days: number; created_at: string; phase_started_at: string }[]
  payments:   { id: number; plan_id: number; amount: string; gateway: string; status: string; created_at: string; reviewed_at: string | null }[]
  payouts:    { id: number; challenge_id: number; amount_requested: string; trader_amount: string; status: string; admin_note: string | null; requested_at: string; reviewed_at: string | null }[]
  kyc:        { id: number; status: string; admin_note: string | null; reviewed_at: string | null } | null
  timeline:   { type: string; label: string; at: string | null }[]
}

export interface AnalyticsRevenue {
  monthly: { month: string; count: number; total: number | string }[]
  by_plan: { plan_name: string; sales: number; revenue: number | string }[]
  total:   number
}

export interface AnalyticsGrowth {
  new_users:       { month: string; count: number }[]
  new_challenges:  { month: string; count: number }[]
  funded_monthly:  { month: string; count: number }[]
  total_users:     number
  total_challenges: number
  total_funded:    number
}

export interface AnalyticsChallenges {
  status_counts:  { status: string; count: number }[]
  pass_rates:     {
    plan_name: string
    total:     number
    passed:    number
    failed:    number
    avg_trading_days: number | string
    avg_pnl:   number | string
  }[]
  breach_reasons: { breach_type: string; count: number }[]
  avg_days:       { phase: number; avg_days: number | string; count: number }[]
}

export interface TestToolChallenge {
  id:               number
  user_id:          number
  phase:            number
  status:           'active' | 'passed' | 'failed' | 'funded' | 'suspended' | string
  current_balance:  number | string
  starting_balance: number | string
  user_login:       string
  display_name:     string
  plan_name:        string | null
}

export interface RiskAlertUser {
  user_id:    number
  user_email: string
  count:      number
}

export interface AdminRiskAlerts {
  hft_risks:      RiskAlertUser[]
  gambling_risks: RiskAlertUser[]
  open_flags:     number
  breaches?:      any[]
  toxic_trades?:  any[]
  alerts?:        any[]
}

export interface RiskExposureItem {
  symbol:      string
  cmd:         number | string
  total_lots:  number | string
  trade_count: number | string
}


export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_type: 'trader' | 'admin' | 'user';
  sender_id: number;
  sender_name?: string;
  sender_email?: string;
  message: string;
  attachments?: string | null;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_number: string;
  trader_id: number;
  user_id?: number;
  account_id?: number | null;
  subject: string;
  category: 'billing' | 'rules' | 'tech_mt5' | 'kyc' | 'general' | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  assigned_admin_id?: number | null;
  user_login?: string;
  user_email?: string;
  display_name?: string;
  message_count?: number;
  latest_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ThemeSettings {
  primaryColor: string;
  primaryForeground: string;
  radius: string;
  fontFamily: string;
  heroTitle?: string;
  heroHighlight?: string;
  heroSubtitle?: string;
  heroBadge?: string;
}

// ── Competitions / Tournaments ──────────────────────────────────────────────
export interface TournamentRules {
  daily_dd?: number;
  max_dd?: number;
  leverage?: number;
  min_days?: number;
}

export interface Tournament {
  id: number;
  title: string;
  name?: string;
  slug?: string;
  description?: string;
  starting_balance: number | string;
  initial_balance?: number | string;
  entry_fee: number | string;
  max_participants: number;
  current_participants: number;
  prize_pool: string;
  prizes_breakdown?: string | Record<string, string> | null;
  rules_json?: string | TournamentRules | null;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  created_at?: string;
  participants_count?: number;
  joined?: boolean;
}

export type Competition = Tournament;

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  user_id: number;
  account_id: number;
  starting_equity: number;
  current_equity: number;
  roi_pct: number;
  max_dd_reached: number;
  rank: number;
  status: 'active' | 'disqualified' | 'winner';
  user_login?: string;
  user_email?: string;
  display_name?: string;
  created_at?: string;
}

// ── Payment Gateways Config ────────────────────────────────────────────────
export interface PaymentGatewaysConfig {
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  cryptomus_enabled: boolean;
  cryptomus_merchant_id: string;
  cryptomus_api_key: string;
  nowpayments_enabled: boolean;
  nowpayments_api_key: string;
  paypal_enabled: boolean;
  paypal_client_id: string;
  paypal_secret: string;
  manual_crypto_enabled: boolean;
  manual_bank_enabled: boolean;
}

// ── Team Member & RBAC ──────────────────────────────────────────────────────
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'risk_officer' | 'support_agent' | 'accountant';
  status: 'active' | 'suspended';
  last_login?: string;
  created_at: string;
}

// ── Certificate Studio Templates ───────────────────────────────────────────
export interface CertificateTemplate {
  title: string;
  subtitle: string;
  body: string;
  signatory_name: string;
  signatory_role: string;
  show_qr: number;
  theme_badge: string;
  accent_color: string;
}

export interface CertificateTemplates {
  phase1: CertificateTemplate;
  phase2: CertificateTemplate;
  payout: CertificateTemplate;
}

// ── Webhook Integrations (Discord & Telegram) ───────────────────────────────
export interface WebhookConfig {
  discord_enabled: boolean;
  discord_webhook_url: string;
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  notify_on_purchase: boolean;
  notify_on_payout: boolean;
  notify_on_breach: boolean;
  notify_on_kyc: boolean;
}

// ── Macro-Economic News Guard ───────────────────────────────────────────────
export interface NewsGuardSettings {
  enabled: boolean;
  mode: 'hard_gate' | 'soft_breach';
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  currencies: string[];
}

export interface NewsEvent {
  id: number;
  event_time_utc: string;
  currency: string;
  impact: 'low' | 'medium' | 'high';
  title: string;
  source?: string;
  created_at?: string;
}

// ── Automated Scaling Plan Engine ───────────────────────────────────────────
export interface ScalingRules {
  profit_target_pct: number;
  evaluation_period_days: number;
  min_payouts: number;
  balance_multiplier_pct: number;
  new_profit_split: number;
  max_capital_cap: number;
  auto_scale: boolean;
}

export interface ScalingQueueItem {
  id: number;
  user_id: number;
  trader_name: string;
  trader_email: string;
  current_balance: number;
  scaled_balance: number;
  current_profit_pct: number;
  payouts_count: number;
  scaling_level: number;
  current_split: number;
  new_split: number;
  is_eligible: boolean;
  status: 'eligible' | 'in_progress' | 'applied' | 'pending_approval';
}

export interface ScalingEvent {
  id: number;
  challenge_account_id: number;
  user_id: number;
  old_balance: number;
  new_balance: number;
  old_split: number;
  new_split: number;
  roi_achieved: number;
  payouts_completed: number;
  status: string;
  reviewed_by?: number;
  applied_at?: string;
  created_at: string;
}

// ── Anti-Syndicate Fraud & Group Hedging Radar ──────────────────────────────
export interface SyndicateRadarSettings {
  time_delta_ms: number;
  lot_match_pct: number;
  ip_mode: 'exact' | 'subnet_24';
}

export interface SyndicateCluster {
  id: number;
  cluster_code: string;
  account_a_id: number;
  account_b_id: number;
  user_a_id: number;
  user_b_id: number;
  trader_a_name?: string;
  trader_a_email?: string;
  trader_b_name?: string;
  trader_b_email?: string;
  symbol: string;
  action_a: 'BUY' | 'SELL';
  action_b: 'BUY' | 'SELL';
  lot_a: number | string;
  lot_b: number | string;
  ip_a: string;
  ip_b: string;
  ip_match_type: 'exact' | 'subnet_24' | 'device_fingerprint';
  time_delta_ms: number;
  risk_score: number;
  status: 'flagged' | 'frozen' | 'investigating' | 'dismissed';
  frozen_at?: string | null;
  created_at: string;
}

// ── 1v1 PvP E-Sports Arena ──────────────────────────────────────────────────
export interface PvpMatch {
  id: number;
  match_code: string;
  title: string;
  symbol: string;
  stake_amount: number | string;
  prize_pool: number | string;
  platform_rake: number | string;
  starting_balance: number | string;
  duration_minutes: number;
  creator_user_id: number;
  challenger_user_id?: number | null;
  creator_name?: string;
  creator_email?: string;
  creator_login?: string;
  challenger_name?: string;
  challenger_email?: string;
  challenger_login?: string;
  winner_name?: string;
  winner_email?: string;
  creator_pnl: number | string;
  challenger_pnl: number | string;
  creator_trades_count: number;
  challenger_trades_count: number;
  winner_user_id?: number | null;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  started_at?: string | null;
  expires_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface PvpGladiator {
  user_id: number;
  name: string;
  equity: number;
  pnl: number;
  trades_count: number;
}

export interface PvpEvent {
  id: number;
  match_id: number;
  user_id?: number | null;
  author_name?: string;
  event_type: string;
  message: string;
  created_at: string;
}

export interface PvpLeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  wins: number;
  win_rate: number;
  earnings: number;
  streak: number;
}

export interface PvpLobbyResponse {
  success: boolean;
  stats: {
    total_staked: number;
    total_rake: number;
    total_matches: number;
    active_count: number;
    waiting_count: number;
  };
  waiting: PvpMatch[];
  active: PvpMatch[];
  completed: PvpMatch[];
  leaderboard: PvpLeaderboardEntry[];
}

export interface PvpLiveStateResponse {
  success: boolean;
  match: PvpMatch;
  seconds_remaining: number;
  prices: { bid: number; ask: number };
  events: PvpEvent[];
  creator: PvpGladiator;
  challenger: PvpGladiator;
  lead_delta: number;
  leader: 'creator' | 'challenger' | 'tied';
}

export interface PvpAnalyticsResponse {
  success: boolean;
  analytics: {
    total_staked: number;
    total_rake: number;
    total_matches: number;
    active_matches: number;
    completed_matches: number;
  };
  matches: PvpMatch[];
}



