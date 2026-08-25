'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, User, Trophy, Medal, Award, TrendingUp } from 'lucide-react'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      api.profile(Number(params.id)).then(res => {
        if (res.ok) {
          setProfile(res.data)
        }
        setLoading(false)
      })
    }
  }, [params.id])

  return (
    <>
      <MarketingHeader />
      <main className="pt-32 pb-24 min-h-screen bg-bg">
        <div className="container max-w-4xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 -ml-4 text-text-muted hover:text-text">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          {loading ? (
            <div className="space-y-6">
              <Card className="p-8">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              </Card>
              <Card className="h-48" />
            </div>
          ) : !profile ? (
            <Card className="p-16 text-center">
              <User className="h-12 w-12 text-text-faint mx-auto mb-4" />
              <h2 className="text-xl font-medium">Profile Not Found</h2>
              <p className="text-text-muted mt-2">The trader you are looking for does not exist or has set their profile to private.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <Card className="p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-aurora opacity-10" />
                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <div className="h-24 w-24 rounded-full bg-accent/10 border-2 border-accent flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(var(--accent),0.3)]">
                    <User className="h-10 w-10 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{profile.name || 'Anonymous Trader'}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                      {profile.is_funded ? (
                        <Badge tone="success" className="text-xs">
                          Funded Trader
                        </Badge>
                      ) : profile.has_passed ? (
                        <Badge tone="info" className="text-xs">
                          Challenge Passed
                        </Badge>
                      ) : (
                        <Badge tone="neutral" className="text-xs">
                          Active Trader
                        </Badge>
                      )}
                      <span className="text-sm text-text-muted flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> {profile.total_payouts || 0} Payouts Received
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Badges / Trophies */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-warn" /> Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.badges && profile.badges.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {profile.badges.map((badge: string, i: number) => (
                        <div key={i} className="flex flex-col items-center text-center p-4 rounded-xl border border-border bg-surface-muted/30 hover:bg-surface-muted transition-colors">
                          <Medal className="h-8 w-8 text-warn mb-2 drop-shadow-md" />
                          <span className="text-sm font-medium">{badge}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-muted flex flex-col items-center">
                      <Award className="h-10 w-10 opacity-20 mb-3" />
                      <p>No achievements unlocked yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bio or Additional Info can go here in the future */}
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}
