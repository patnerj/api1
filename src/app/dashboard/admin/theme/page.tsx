import { ThemeEditor } from "@/components/admin/theme-editor";

export default function ThemePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Theme & Branding</h1>
        <p className="text-muted-foreground mt-2">
          Customize the visual appearance of your trading platform without touching code.
        </p>
      </div>

      <ThemeEditor />
    </div>
  );
}
