"use client";

import { useQuery } from "@tanstack/react-query";
import { fmtUSD } from "@/lib/format";
import { Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getApiBaseUrl } from "@/lib/fxsim";

interface AffiliateLeader {
  name: string;
  earned: number;
}

export function AffiliateLeaderboard() {
  const { data: leaders, isLoading } = useQuery<AffiliateLeader[]>({
    queryKey: ["public-affiliate-leaderboard"],
    queryFn: async () => {
      try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/stats/affiliate-leaderboard`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : (data?.leaderboard || []);
      } catch {
        return [];
      }
    },
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Card className="border-border bg-surface/50 backdrop-blur-sm overflow-hidden relative shadow-sm rounded-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-50"></div>
      <CardHeader className="relative pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Top Affiliates
        </CardTitle>
        <CardDescription>Highest earners this month</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !leaders || leaders.length === 0 ? (
          <p className="text-text-muted text-sm">No data available yet.</p>
        ) : (
          <div className="space-y-4">
            {leaders.map((leader, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                    index === 0 ? 'bg-amber-500/20 text-amber-500' :
                    index === 1 ? 'bg-surface-hover text-text-muted' :
                    index === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-bg text-text-muted'
                  }`}>
                    {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className="font-medium text-text">{leader.name}</span>
                </div>
                <span className="font-bold text-emerald-400">
                  {fmtUSD(leader.earned)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
