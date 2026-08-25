"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { applyThemeAccent, applyFontFamily, applyRadius, initThemeAccent } from "@/lib/theme-accent";

export function ThemeLoader() {
  useEffect(() => {
    // 1. Initialize immediately from local storage on mount
    initThemeAccent();

    // 2. Fetch saved branding/whitelabel theme tokens from backend safely
    const loadThemeFromBackend = async () => {
      try {
        if (api.theme?.get) {
          const res = await api.theme.get();
          if (res.ok && res.data) {
            const color = (res.data as any).primary_color || (res.data as any).primaryColor;
            const font = (res.data as any).font_family || (res.data as any).fontFamily;
            const radius = (res.data as any).radius;
            if (color) applyThemeAccent(color);
            if (font) applyFontFamily(font);
            if (radius) applyRadius(radius);
            return;
          }
        }
      } catch (e) {}

      try {
        if (api.admin?.whitelabelGet) {
          const res = await api.admin.whitelabelGet();
          if (res.ok && res.data) {
            const data = res.data as any
            if (data.primary_color) applyThemeAccent(data.primary_color);
            if (data.font_family) applyFontFamily(data.font_family);
            if (data.radius) applyRadius(data.radius);
            return;
          }
        }
      } catch (e) {}

      try {
        if (api.branding) {
          const res = await api.branding();
          if (res.ok && res.data) {
            const data = res.data as any
            if (data.primary_color) applyThemeAccent(data.primary_color);
            if (data.font_family) applyFontFamily(data.font_family);
            if (data.radius) applyRadius(data.radius);
          }
        }
      } catch (e) {}
    };

    loadThemeFromBackend();
  }, []);

  return null;
}
