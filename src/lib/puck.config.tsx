import { Config } from "@measured/puck";
import { Hero } from "@/components/marketing/hero";
import { CTASection } from "@/components/marketing/cta-section";
import { LiveStatsStrip } from "@/components/marketing/live-stats-strip";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ChallengesPreview } from "@/components/marketing/challenges-preview";
import { PlatformFeatures } from "@/components/marketing/platform-features";
import { PayoutsSection } from "@/components/marketing/payouts-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { HeadingBlock, TextBlock, ButtonBlock, SectionBlock, ColumnsBlock } from "@/components/puck/basic-blocks";

type Props = {
  Hero: { title: string; highlight: string; subtitle: string; badge: string };
  CTASection: { title: string; highlight: string; description: string };
  LiveStatsStrip: {};
  HowItWorks: { 
    badge: string; 
    titleText1: string; 
    titleAccent: string; 
    description: string;
    steps: Array<{ n: string; title: string; body: string; items: Array<{ itemText: string }> }>;
  };
  ChallengesPreview: { title: string };
  PlatformFeatures: { 
    titleText1: string; 
    titleAccent: string; 
    description: string; 
    features: Array<{ title: string; body: string }> 
  };
  PayoutsSection: {
    badge: string;
    titleText1: string;
    titleAccent: string;
    description: string;
    items: Array<{ itemText: string }>;
  };
  Testimonials: {
    badge: string;
    titleText1: string;
    titleAccent: string;
    stories: Array<{ name: string; role: string; quote: string; pnl: string; account: string }>;
  };
  Heading: { text: string; size: "sm" | "md" | "lg" | "xl"; align: "left" | "center" | "right" };
  Text: { text: string; size: "sm" | "md" | "lg"; align: "left" | "center" | "right" };
  Button: { text: string; url: string; variant: "primary" | "secondary" | "outline" };
  Section: { padding: "10" | "20" | "28"; bg: "transparent" | "bg" | "bg-subtle" | "surface" };
  Columns: { cols: 2 | 3 | 4 };
};

export const config: Config<Props> = {
  categories: {
    marketing: {
      components: ["Hero", "CTASection", "LiveStatsStrip", "HowItWorks", "ChallengesPreview", "PlatformFeatures", "PayoutsSection", "Testimonials"],
    },
    layout: {
      components: ["Section", "Columns"],
    },
    content: {
      components: ["Heading", "Text", "Button"],
    },
  },
  root: {
    render: ({ children }) => {
      return (
        <div className="bg-background text-foreground min-h-screen">
          {children}
        </div>
      );
    }
  },
  components: {
    Hero: {
      fields: {
        badge: { type: "text" },
        title: { type: "text" },
        highlight: { type: "text" },
        subtitle: { type: "textarea" },
      },
      defaultProps: {
        badge: "Now accepting traders worldwide",
        title: "Trade",
        highlight: "our capital.",
        subtitle: "Pass our two-phase evaluation, get funded with up to $200,000, and trade with zero personal financial risk. Withdraw profits in 24 hours.",
      },
      render: ({ title, highlight, subtitle, badge }) => (
        <Hero puckProps={{ title, highlight, subtitle, badge }} />
      ),
    },
    CTASection: {
      fields: {
        title: { type: "text" },
        highlight: { type: "text" },
        description: { type: "textarea" },
      },
      defaultProps: {
        title: "Ready to trade",
        highlight: "our capital?",
        description: "Free account in 30 seconds. Start the challenge today. Get funded within weeks, not months.",
      },
      render: ({ title, highlight, description }) => (
        <CTASection puckProps={{ title, highlight, description }} />
      ),
    },
    LiveStatsStrip: {
      render: () => <LiveStatsStrip />,
    },
    HowItWorks: {
      fields: {
        badge: { type: "text" },
        titleText1: { type: "text" },
        titleAccent: { type: "text" },
        description: { type: "textarea" },
        steps: {
          type: "array",
          arrayFields: {
            n: { type: "text" },
            title: { type: "text" },
            body: { type: "textarea" },
            items: {
              type: "array",
              arrayFields: {
                itemText: { type: "text" }
              }
            }
          }
        }
      },
      defaultProps: {
        badge: "The process",
        titleText1: "Three steps to",
        titleAccent: "funded",
        description: "A clear, transparent evaluation. No hidden rules, no surprise breaches. Just real trading on real terms.",
        steps: [
          {
            n: '01',
            title: 'Take the challenge',
            body: 'Pick an account size from $10K to $200K. Hit the profit target while respecting drawdown limits across two phases.',
            items: [{itemText: 'Phase 1: 8% profit target'}, {itemText: 'Phase 2: 5% profit target'}, {itemText: 'Max 10% total drawdown'}],
          },
          {
            n: '02',
            title: 'Get funded',
            body: 'Pass both phases and receive a funded account. Trade real markets with our capital — no personal risk.',
            items: [{itemText: 'Real-time MT5 access'}, {itemText: 'Same risk parameters'}, {itemText: 'Trade what you want'}],
          },
          {
            n: '03',
            title: 'Get paid',
            body: 'Withdraw your share of profits every 14 days. Up to 90% profit split on consistent performance.',
            items: [{itemText: '80% baseline split'}, {itemText: 'Up to 90% scaling'}, {itemText: 'Paid in 24 hours'}],
          }
        ]
      },
      render: ({ badge, titleText1, titleAccent, description, steps }) => (
        <HowItWorks puckProps={{ badge, titleText1, titleAccent, description, steps }} />
      ),
    },
    ChallengesPreview: {
      fields: {
        title: { type: "text" }
      },
      defaultProps: {
        title: "Choose your next challenge"
      },
      render: ({ title }) => <ChallengesPreview puckProps={{ title }} />,
    },
    PlatformFeatures: {
      fields: {
        titleText1: { type: "text" },
        titleAccent: { type: "text" },
        description: { type: "textarea" },
        features: {
          type: "array",
          arrayFields: {
            title: { type: "text" },
            body: { type: "textarea" }
          }
        }
      },
      defaultProps: {
        titleText1: "Everything in",
        titleAccent: "one platform",
        description: "A trading terminal, evaluation engine, and payout system — all built for serious capital.",
        features: [
          { title: 'Real-time execution',  body: 'Live TradingView charts and tick-by-tick price feeds across 19 instruments.' },
          { title: 'Deep analytics',       body: 'R:R tracker, hourly heatmap, drawdown curve, win streaks, and 30+ KPIs.' },
          { title: 'Auto-managed risk',    body: 'SL/TP, partial closes, daily DD enforcement, news-event lockouts.' },
          { title: 'Trade anywhere',       body: 'PWA-installable. Trade and monitor from desktop, tablet, or phone.' },
          { title: 'Real-time alerts',     body: 'Notifications for fills, breaches, payout approvals — instant.' },
          { title: 'API access',           body: 'Generate scoped API keys. Run your own algos against our infrastructure.' },
          { title: 'Global markets',       body: 'Forex majors, indices, metals, crypto. Trade what you know.' },
          { title: 'Institutional-grade',  body: '2FA, scoped API keys, full audit log, SOC 2 controls.' },
        ]
      },
      render: ({ titleText1, titleAccent, description, features }) => (
        <PlatformFeatures puckProps={{ titleText1, titleAccent, description, features }} />
      ),
    },
    PayoutsSection: {
      fields: {
        badge: { type: "text" },
        titleText1: { type: "text" },
        titleAccent: { type: "text" },
        description: { type: "textarea" },
        items: {
          type: "array",
          arrayFields: {
            itemText: { type: "text" }
          }
        }
      },
      defaultProps: {
        badge: "Payouts",
        titleText1: "Get paid in",
        titleAccent: "24 hours",
        description: "First payout 14 days after funding. Then bi-weekly. No minimums, no fees, and a scaling profit split that rewards consistency.",
        items: [
          { itemText: 'Bi-weekly payout cycle — withdraw on your schedule' },
          { itemText: 'Crypto (USDT) or Wise — your choice' },
          { itemText: 'Profit split scales 80% → 85% → 90% with milestones' },
          { itemText: 'Account scaling: hit 10% profit, get a bigger account' },
          { itemText: 'No hidden fees, no surprises, fully transparent' },
        ]
      },
      render: ({ badge, titleText1, titleAccent, description, items }) => (
        <PayoutsSection puckProps={{ badge, titleText1, titleAccent, description, items }} />
      ),
    },
    Testimonials: {
      fields: {
        badge: { type: "text" },
        titleText1: { type: "text" },
        titleAccent: { type: "text" },
        stories: {
          type: "array",
          arrayFields: {
            name: { type: "text" },
            role: { type: "text" },
            quote: { type: "textarea" },
            pnl: { type: "text" },
            account: { type: "text" },
          }
        }
      },
      defaultProps: {
        badge: "Trader stories",
        titleText1: "From challenge to",
        titleAccent: "first payout",
        stories: [
          { name: 'Sebastian Müller', role: 'Forex trader · Berlin', quote: 'Passed the $100K challenge in 18 days. First payout hit my wallet 22 hours after request. The drawdown UI is the cleanest I have used.', pnl: '+$8,420', account: '$100K funded' },
          { name: 'Maya Patel', role: 'Day trader · London', quote: 'I have tried four prop firms. The rule transparency here, the live R:R tracker, and the certificate — this is the only one I will recommend.', pnl: '+$12,180', account: '$200K funded' },
          { name: 'Hiro Tanaka', role: 'Swing trader · Tokyo', quote: 'The hourly heatmap showed me that 78% of my losses came in the first hour of London open. I changed my routine and tripled my win rate.', pnl: '+$4,930', account: '$50K funded' },
        ]
      },
      render: ({ badge, titleText1, titleAccent, stories }) => (
        <Testimonials puckProps={{ badge, titleText1, titleAccent, stories }} />
      ),
    },
    Heading: {
      fields: {
        text: { type: "text" },
        size: {
          type: "select",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra Large", value: "xl" },
          ],
        },
        align: {
          type: "select",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: { text: "Heading Text", size: "md", align: "left" },
      render: (props) => <HeadingBlock {...props} />,
    },
    Text: {
      fields: {
        text: { type: "textarea" },
        size: {
          type: "select",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
          ],
        },
        align: {
          type: "select",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      defaultProps: { text: "Paragraph text goes here.", size: "md", align: "left" },
      render: (props) => <TextBlock {...props} />,
    },
    Button: {
      fields: {
        text: { type: "text" },
        url: { type: "text" },
        variant: {
          type: "select",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Outline", value: "outline" },
          ],
        },
      },
      defaultProps: { text: "Click Here", url: "#", variant: "primary" },
      render: (props) => <ButtonBlock {...props} />,
    },
    Section: {
      fields: {
        padding: {
          type: "select",
          options: [
            { label: "Small (10)", value: "10" },
            { label: "Medium (20)", value: "20" },
            { label: "Large (28)", value: "28" },
          ],
        },
        bg: {
          type: "select",
          options: [
            { label: "Transparent", value: "transparent" },
            { label: "Background", value: "bg" },
            { label: "Subtle", value: "bg-subtle" },
            { label: "Surface", value: "surface" },
          ],
        },
      },
      defaultProps: { padding: "20", bg: "transparent" },
      render: (props) => <SectionBlock {...props} />,
    },
    Columns: {
      fields: {
        cols: {
          type: "select",
          options: [
            { label: "2 Columns", value: 2 as any },
            { label: "3 Columns", value: 3 as any },
            { label: "4 Columns", value: 4 as any },
          ],
        },
      },
      defaultProps: { cols: 2 },
      render: (props) => <ColumnsBlock {...props} />,
    },
  },
};
