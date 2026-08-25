import { PuckRenderer } from "@/components/puck/puck-renderer";
import { MarketingHeader } from "@/components/marketing/header";
import { PayoutTicker } from "@/components/payout-ticker";
import { MarketingFooter } from "@/components/marketing/footer";
import { getApiBaseUrl } from "@/lib/fxsim";

export const dynamic = 'force-dynamic';

// Default fallback layout if database has no schema saved yet
const defaultData = {
  content: [
    { type: "Hero", props: { id: "hero-1" } },
    { type: "LiveStatsStrip", props: { id: "stats-1" } },
    { type: "HowItWorks", props: { id: "how-1" } },
    { type: "ChallengesPreview", props: { id: "chal-1" } },
    { type: "PlatformFeatures", props: { id: "feat-1" } },
    { type: "PayoutsSection", props: { id: "payout-1" } },
    { type: "Testimonials", props: { id: "test-1" } },
    { type: "CTASection", props: { id: "cta-1" } }
  ],
  root: {}
};

async function getPageSchema() {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/page-schema`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (data.schema) return data.schema;
        if (data.content) return data;
      }
    }
  } catch (err) {
    console.error("Error fetching page schema:", err);
  }
  return defaultData;
}

export default async function HomePage() {
  const data = await getPageSchema();

  return (
    <>
      <MarketingHeader />
      <PayoutTicker />
      <main className="relative">
        <PuckRenderer data={data} />
      </main>
      <MarketingFooter />
    </>
  );
}
