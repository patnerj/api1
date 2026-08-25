"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { fmtUSD, toNum } from "@/lib/format";
import type { ChallengePlan } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

export function ChallengesPreview({ onSelectPlan, puckProps }: { onSelectPlan?: (planId: number) => void, puckProps?: any }) {
  const title = puckProps?.title || "Choose your next challenge";
  const [plans, setPlans] = useState<ChallengePlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>("2-Step");
  const [selectedSize, setSelectedSize] = useState<number>(0);

  useEffect(() => {
    api.challengePlans().then((res) => {
      if (res.ok) {
        const active = res.data.filter((p) => Number(p.is_active) !== 0);
        setPlans(active);
      } else {
        setError(res.error);
      }
    });
  }, []);

  const models = useMemo(() => {
    if (!plans) return [];
    const m = new Set<string>();
    plans.forEach((p) => {
      if (Number(p.is_instant_funding) === 1 || Number(p.phases) === 0)
        m.add("Instant Funding");
      else if (Number(p.phases) === 1) m.add("1-Step");
      else if (Number(p.phases) === 2) m.add("2-Step");
      else if (Number(p.phases) === 3) m.add("3-Step");
    });
    const order = ["1-Step", "2-Step", "3-Step", "Instant Funding"];
    return Array.from(m).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [plans]);

  useEffect(() => {
    if (models.length > 0 && !models.includes(selectedModel)) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  const currentModelPlans = useMemo(() => {
    if (!plans) return [];
    return plans
      .filter((p) => {
        if (selectedModel === "Instant Funding")
          return Number(p.is_instant_funding) === 1 || Number(p.phases) === 0;
        if (selectedModel === "1-Step")
          return Number(p.phases) === 1 && Number(p.is_instant_funding) !== 1;
        if (selectedModel === "2-Step")
          return Number(p.phases) === 2 && Number(p.is_instant_funding) !== 1;
        if (selectedModel === "3-Step")
          return Number(p.phases) === 3 && Number(p.is_instant_funding) !== 1;
        return false;
      })
      .sort((a, b) => toNum(a.account_size) - toNum(b.account_size));
  }, [plans, selectedModel]);

  const accountSizes = useMemo(() => {
    const sizes = new Set<number>();
    currentModelPlans.forEach((p) => sizes.add(toNum(p.account_size)));
    return Array.from(sizes).sort((a, b) => a - b);
  }, [currentModelPlans]);

  useEffect(() => {
    if (
      accountSizes.length > 0 &&
      (!selectedSize || !accountSizes.includes(selectedSize))
    ) {
      setSelectedSize(
        accountSizes[Math.floor(accountSizes.length / 2)] || accountSizes[0],
      );
    }
  }, [accountSizes, selectedSize]);

  const activePlan = useMemo(() => {
    return (
      currentModelPlans.find((p) => toNum(p.account_size) === selectedSize) ||
      currentModelPlans[0]
    );
  }, [currentModelPlans, selectedSize]);

  const getModelSubtext = (modelName: string) => {
    if (modelName === "1-Step")
      return "News Trading Allowed | Reward Every 5 Days";
    if (modelName === "2-Step")
      return "News Trading Allowed | Refund on 1st Reward";
    if (modelName === "3-Step") return "For Advanced Traders | Maximum Scaling";
    if (modelName === "Instant Funding")
      return "No Daily Loss Limit | No Consistency Rule";
    return "Trade with confidence";
  };

  return (
    <section className="relative py-20 bg-bg text-text" id="challenges">
      <div className="container max-w-6xl">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-xs font-medium text-accent mb-4">
            Account models
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="mt-4 text-text-muted text-lg">
            Pick a model, pick a size, see every rule up front — no fine print.
          </p>
        </div>

        {error && (
          <div className="text-center py-12 text-sm text-text-muted">
            Unable to load challenges right now.{" "}
            <Link href="/challenges" className="text-accent">
              View plans →
            </Link>
          </div>
        )}

        {plans === null && !error ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl bg-surface/50" />
            <Skeleton className="h-24 w-full rounded-2xl bg-surface/50" />
            <Skeleton className="h-96 w-full rounded-2xl bg-surface/50" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {models.map((m) => {
                const isActive = selectedModel === m;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`text-left p-5 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? "bg-accent/5 border-accent shadow-[0_0_15px_rgba(var(--accent),0.15)]"
                        : "bg-surface/30 border-border-subtle hover:border-border hover:bg-surface/50"
                    }`}
                  >
                    <h3
                      className={`text-lg font-bold ${
                        isActive ? "text-text" : "text-text-muted"
                      }`}
                    >
                      FXSIM {m}
                    </h3>
                    <p
                      className={`mt-2 text-xs leading-relaxed ${
                        isActive ? "text-accent/80" : "text-text-muted/60"
                      }`}
                    >
                      {getModelSubtext(m)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              {accountSizes.map((size) => {
                const isActive = selectedSize === size;
                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? "bg-accent/5 border-accent shadow-[0_0_15px_rgba(var(--accent),0.15)]"
                        : "bg-surface/30 border-border-subtle hover:border-border hover:bg-surface/50"
                    }`}
                  >
                    <div
                      className={`text-xs mb-1 ${
                        isActive ? "text-accent" : "text-text-muted"
                      }`}
                    >
                      Account
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        isActive ? "text-text" : "text-text-muted"
                      }`}
                    >
                      {fmtUSD(size, { decimals: 0 })}
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {activePlan && (
                <motion.div
                  key={activePlan.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 bg-surface/40 border border-border-subtle rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12 card-glow"
                >
                  <div className="flex-1 grid md:grid-cols-2 gap-8">
                    <div className="bg-bg/40 rounded-xl p-5 border border-border-subtle/50">
                      <h4 className="text-sm font-medium text-text-muted mb-5">
                        Challenge Rules
                      </h4>
                      <ul className="space-y-4">
                        {Number(activePlan.phases) >= 1 && (
                          <RuleRow
                            label="Phase 1 Profit Target"
                            value={`${toNum(activePlan.p1_profit_target)}%`}
                          />
                        )}
                        {Number(activePlan.phases) >= 2 && (
                          <RuleRow
                            label="Phase 2 Profit Target"
                            value={`${toNum(activePlan.p2_profit_target)}%`}
                          />
                        )}
                        {Number(activePlan.phases) >= 3 && (
                          <RuleRow
                            label="Phase 3 Profit Target"
                            value={`${toNum(
                              (activePlan as any).p3_profit_target ||
                                activePlan.p2_profit_target,
                            )}%`}
                          />
                        )}
                        <RuleRow
                          label="Daily Loss Limit"
                          value={`${toNum(activePlan.p1_daily_dd)}%`}
                        />
                        <RuleRow
                          label="Maximum Loss Limit"
                          value={`${toNum(activePlan.p1_max_dd)}%`}
                        />
                        <RuleRow
                          label="Drawdown Type"
                          value={
                            activePlan.drawdown_type === "trailing"
                              ? "Trailing"
                              : activePlan.drawdown_type === "eod_trailing"
                                ? "EOD Trailing"
                                : "Static"
                          }
                        />
                        <RuleRow
                          label="Minimum Trading Days"
                          value={
                            Number(activePlan.p1_min_days) > 0
                              ? `${activePlan.p1_min_days} Days`
                              : "0 Days"
                          }
                        />
                        <RuleRow
                          label="Trading Period"
                          value={
                            Number(activePlan.p1_max_days) > 0
                              ? `${activePlan.p1_max_days} Days`
                              : "Unlimited"
                          }
                        />
                      </ul>
                    </div>

                    <div className="bg-bg/40 rounded-xl p-5 border border-border-subtle/50">
                      <h4 className="text-sm font-medium text-text-muted mb-5">
                        Funded & Reward Rules
                      </h4>
                      <ul className="space-y-4">
                        <RuleRow
                          label="Funded Daily Loss"
                          value={`${toNum(activePlan.p1_daily_dd)}%`}
                        />
                        <RuleRow
                          label="Funded Maximum Loss"
                          value={`${toNum(activePlan.funded_max_dd)}%`}
                        />
                        <RuleRow
                          label="Reward Share"
                          value={`Up to ${toNum(activePlan.funded_profit_split)}%`}
                        />
                        <RuleRow label="First Withdrawal" value="21 Days" />
                        <RuleRow
                          label="Subsequent Withdrawal"
                          value="14 Days"
                        />
                        <RuleRow
                          label="Refundable Fee"
                          value="With 1st Reward"
                        />
                        <RuleRow
                          label="News Trading"
                          value={
                            Number(activePlan.news_trading) === 1
                              ? "Allowed"
                              : "Not Allowed"
                          }
                        />
                        <RuleRow
                          label="Weekend Holding"
                          value={
                            Number(activePlan.weekend_holding) === 1
                              ? "Allowed"
                              : "Not Allowed"
                          }
                        />
                      </ul>
                    </div>
                  </div>

                  <div className="lg:w-72 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-text mb-1">
                      FXSIM {selectedModel}{" "}
                      {fmtUSD(activePlan.account_size, { decimals: 0 })}
                    </h3>

                    <div className="flex items-baseline gap-2 mt-4 mb-6">
                      <span className="text-4xl font-extrabold text-success tracking-tight">
                        {fmtUSD(activePlan.price)}
                      </span>
                    </div>

                    <Button
                      asChild={!onSelectPlan}
                      onClick={() => onSelectPlan && onSelectPlan(activePlan.id)}
                      className="w-full bg-accent hover:bg-accent-hover text-bg font-bold py-6 rounded-xl shadow-[0_0_20px_rgba(var(--accent),0.3)] transition-all"
                    >
                      {onSelectPlan ? (
                        "Start Challenge"
                      ) : (
                        <Link href={`/challenges?plan=${activePlan.id}`}>
                          Start Challenge
                        </Link>
                      )}
                    </Button>

                    <div className="mt-8">
                      <p className="text-xs text-text-muted mb-3 font-medium">
                        Included Features:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 bg-surface/50 border border-border-subtle rounded text-text-muted">
                          High Leverage 1:{activePlan.max_leverage}
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 bg-surface/50 border border-border-subtle rounded text-text-muted">
                          Scaling Enabled
                        </span>
                        <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 bg-surface/50 border border-border-subtle rounded text-text-muted">
                          EAs Allowed
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between items-center text-sm">
      <div className="flex items-center gap-2 text-text-muted">
        <Info className="h-3.5 w-3.5 opacity-60" />
        <span>{label}</span>
      </div>
      <span className="font-semibold text-text text-right">{value}</span>
    </li>
  );
}
