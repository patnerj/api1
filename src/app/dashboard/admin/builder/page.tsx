"use client";

import "@measured/puck/puck.css";
import { Puck } from "@measured/puck";
import { config } from "@/lib/puck.config";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/fxsim";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const DEFAULT_LAYOUT = {
  content: [
    { type: "Hero", props: { id: "hero-1" } },
    { type: "LiveStatsStrip", props: { id: "stats-1" } },
    { type: "HowItWorks", props: { id: "how-1" } },
    { type: "ChallengesPreview", props: { id: "chal-1" } },
    { type: "PlatformFeatures", props: { id: "feat-1" } },
    { type: "PayoutsSection", props: { id: "payout-1" } },
    { type: "Testimonials", props: { id: "test-1" } },
    { type: "CTASection", props: { id: "cta-1" } },
    {
      type: "Section",
      props: { id: "custom-sec-1", padding: "20", bg: "surface" }
    }
  ],
  zones: {
    "custom-sec-1:content": [
      { type: "Heading", props: { id: "custom-heading-1", text: "Ready to get started?", size: "md", align: "center" } },
      { type: "Text", props: { id: "custom-text-1", text: "Join thousands of traders who trust us.", size: "lg", align: "center" } },
      { type: "Button", props: { id: "custom-btn-1", text: "Start Challenge", url: "/pricing", variant: "primary" } }
    ]
  },
  root: {},
};

export default function BuilderPage() {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_FXSIM_API + "/admin/page-schema")
      .then(res => res.json())
      .then(data => {
        if (data && data.content) {
          setInitialData(data);
        } else {
          setInitialData(DEFAULT_LAYOUT);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load schema", err);
        setInitialData(DEFAULT_LAYOUT);
        setLoading(false);
      });
  }, []);

  const handlePublish = async (data: any) => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_FXSIM_API + "/admin/page-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": getSession().nonce || "",
          "Authorization": getSession().bearer ? "Bearer " + getSession().bearer : ""
        },
        body: JSON.stringify({ schema: data })
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Page layout published successfully!");
      } else {
        toast.error("Error publishing layout: " + (result.message || result.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Network error while publishing.");
    }
  };

  if (loading) return <div>Loading Builder...</div>;

  return (
    <div className="h-screen w-full fixed inset-0 z-[100] bg-background">
      {/* 
        We use fixed inset-0 to take over the whole screen for the builder. 
        Puck has its own header and sidebar. 
      */}
      <div className="flex justify-between items-center p-4 bg-card border-b">
        <h1 className="font-bold text-lg">Landing Page Builder</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsResetConfirmOpen(true)} 
            className="text-sm px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover font-medium"
          >
            Reset to Default
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard/admin/theme'} 
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
      <div className="h-[calc(100vh-65px)]">
        <Puck 
          key={key}
          config={config} 
          data={initialData} 
          onPublish={handlePublish}
          iframe={{ enabled: false }}
        />
      </div>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          setInitialData(DEFAULT_LAYOUT);
          setKey(k => k + 1);
          setIsResetConfirmOpen(false);
          toast.success("Layout reset to default template.");
        }}
        title="Reset Page Layout"
        description="Are you sure you want to reset the layout to the default template? You will lose any unsaved changes."
        confirmText="Reset to Default"
        isDestructive={true}
      />
    </div>
  );
}
