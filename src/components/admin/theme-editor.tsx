"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { ThemeSettings } from "@/types/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

export function ThemeEditor() {
  const defaultSettings: ThemeSettings = {
    primaryColor: "#7c6ef5",
    primaryForeground: "#ffffff",
    radius: "0.5rem",
    fontFamily: "Inter, sans-serif",
    heroTitle: "Trade",
    heroHighlight: "our capital.",
    heroSubtitle: "Pass our two-phase evaluation, get funded with up to $200,000, and trade with zero personal financial risk. Withdraw profits in 24 hours.",
    heroBadge: "Now accepting traders worldwide"
  };

  const [settings, setSettings] = useState<ThemeSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'landing'>('theme');

  useEffect(() => {
    api.theme.get().then((res) => {
      if (res.ok && res.data) {
        setSettings({ ...defaultSettings, ...res.data });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const updateLocalThemeCache = (data: ThemeSettings) => {
    try {
      localStorage.setItem('fxsim-theme', JSON.stringify(data));
      document.cookie = "fxsim-theme-data=" + encodeURIComponent(JSON.stringify(data)) + "; path=/; max-age=31536000; SameSite=Lax";
    } catch (e) {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.admin.theme.save(settings);
      updateLocalThemeCache(settings);
      toast.success("Theme settings saved successfully.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    setResetting(true);
    try {
      await api.admin.theme.save(defaultSettings);
      updateLocalThemeCache(defaultSettings);
      setIsResetConfirmOpen(false);
      toast.success("Theme reset to defaults.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset settings.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div>Loading editor...</div>;

  return (
    <Card className="max-w-2xl">
      <div className="flex border-b border-border">
        <button 
          onClick={() => setActiveTab('theme')}
          className={`px-6 py-4 text-sm font-semibold transition-colors focus-ring outline-none ${activeTab === 'theme' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text hover:bg-surface-muted/50'}`}
        >
          Theme & Colors
        </button>
        <button 
          onClick={() => setActiveTab('landing')}
          className={`px-6 py-4 text-sm font-semibold transition-colors focus-ring outline-none ${activeTab === 'landing' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text hover:bg-surface-muted/50'}`}
        >
          Landing Page Content
        </button>
      </div>

      <CardContent className="p-6">
        {activeTab === 'theme' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-2">Primary Color</label>
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-14 rounded-md overflow-hidden shrink-0 border border-border shadow-sm p-0.5 bg-surface">
                    <input 
                      type="color" 
                      value={settings.primaryColor}
                      onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                      className="h-full w-full cursor-pointer rounded-sm border-0 bg-transparent p-0"
                    />
                  </div>
                  <Input 
                    type="text" 
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    className="font-mono text-sm uppercase"
                  />
                </div>
                <p className="text-2xs text-text-muted mt-2 leading-relaxed">Main brand color for buttons, links, and highlights.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-2">Primary Text Color</label>
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-14 rounded-md overflow-hidden shrink-0 border border-border shadow-sm p-0.5 bg-surface">
                    <input 
                      type="color" 
                      value={settings.primaryForeground}
                      onChange={e => setSettings({...settings, primaryForeground: e.target.value})}
                      className="h-full w-full cursor-pointer rounded-sm border-0 bg-transparent p-0"
                    />
                  </div>
                  <Input 
                    type="text" 
                    value={settings.primaryForeground}
                    onChange={e => setSettings({...settings, primaryForeground: e.target.value})}
                    className="font-mono text-sm uppercase"
                  />
                </div>
                <p className="text-2xs text-text-muted mt-2 leading-relaxed">Text color placed inside primary colored elements.</p>
              </div>
            </div>

            <hr className="border-border-subtle" />

            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-2">Border Radius</label>
              <select 
                value={settings.radius}
                onChange={e => setSettings({...settings, radius: e.target.value})}
                className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-ring text-text shadow-sm"
              >
                <option value="0rem">0rem (Square, sharp edges)</option>
                <option value="0.25rem">0.25rem (Slightly curved)</option>
                <option value="0.5rem">0.5rem (Default prop firm style)</option>
                <option value="0.75rem">0.75rem (Rounded)</option>
                <option value="1rem">1rem (Very Rounded)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-2">Font Family</label>
              <select 
                value={settings.fontFamily}
                onChange={e => setSettings({...settings, fontFamily: e.target.value})}
                className="w-full h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm focus-ring text-text shadow-sm"
              >
                <option value="Inter, sans-serif">Inter (Modern, Default)</option>
                <option value="Roboto, sans-serif">Roboto (Clean)</option>
                <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</option>
                <option value="system-ui, sans-serif">System UI (Native)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'landing' && (
          <div className="space-y-6 animate-in fade-in flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-accent/10 p-5 rounded-2xl mb-2 text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/><path d="M12 12h.01"/></svg>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-text">Visual Page Builder</h3>
            <p className="text-sm text-text-muted max-w-sm">
              Use our drag-and-drop editor to build and customize your landing page layout, text, and components visually.
            </p>
            <Button onClick={() => window.location.href = '/admin/builder'} className="mt-2">
              Launch Drag & Drop Editor
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-surface-muted/30 border-t border-border flex justify-between px-6 py-4">
        <Button onClick={() => setIsResetConfirmOpen(true)} disabled={resetting || saving} variant="outline" className="text-danger hover:text-danger hover:bg-danger/10 border-danger/20">
          {resetting ? "Resetting..." : "Reset to Default"}
        </Button>
        <Button onClick={handleSave} disabled={saving || resetting}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onCancel={() => setIsResetConfirmOpen(false)}
        onConfirm={confirmReset}
        title="Reset Theme Settings"
        description="Are you sure you want to reset all theme colors, fonts, and hero text settings to their original factory defaults?"
        confirmText="Reset to Defaults"
        isDestructive={true}
        loading={resetting}
      />
    </Card>
  );
}
