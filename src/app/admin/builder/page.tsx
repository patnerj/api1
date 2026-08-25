"use client";

import "@measured/puck/puck.css";
import { Puck } from "@measured/puck";
import { config } from "@/lib/puck.config";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSession } from "@/lib/fxsim";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink, ArrowLeft, RotateCcw, Save } from "lucide-react";

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

export default function AdminPageBuilder() {
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
        console.error("Failed to load page schema", err);
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
        toast.success("Homepage layout published live to the web!");
      } else {
        toast.error("Error publishing layout: " + (result.message || result.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Network error while publishing landing page.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0F19] text-gray-400 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span>Loading Visual Page Builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full fixed inset-0 z-[100] bg-[#0B0F19] flex flex-col">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-[#1F2937] shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-white gap-1.5 p-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </Link>

          <div className="h-4 w-[1px] bg-[#1F2937]" />

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">Homepage Visual Builder</h1>
              <p className="text-[10px] text-gray-400 font-mono">Puck Drag &amp; Drop Component Engine</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs border-[#1F2937] hover:border-slate-700 text-gray-300 gap-1.5 h-8"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset Template</span>
          </Button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs border-[#1F2937] hover:border-slate-700 text-gray-300 gap-1.5 h-8"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preview Live</span>
            </Button>
          </a>
        </div>
      </header>

      {/* Puck Visual Canvas Container */}
      <div className="flex-1 w-full overflow-hidden bg-[#0B0F19]">
        <Puck
          key={key}
          config={config}
          data={initialData}
          onPublish={handlePublish}
          iframe={{ enabled: false }}
        />
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          setInitialData(DEFAULT_LAYOUT);
          setKey(k => k + 1);
          setIsResetConfirmOpen(false);
          toast.success("Page layout reset to the institutional default template.");
        }}
        title="Reset Landing Page Layout?"
        description="Are you sure you want to revert all landing page sections and content back to the default institutional template? Any unsaved modifications will be discarded."
        confirmText="Yes, Reset Template"
        isDestructive={true}
      />
    </div>
  );
}
