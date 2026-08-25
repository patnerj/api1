import { AdminSupportTickets } from "@/components/admin/support-tickets";
import { LifeBuoy } from 'lucide-react';

export default function AdminSupportPage() {
  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="relative isolate overflow-hidden bg-surface rounded-2xl border border-border p-6 sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 -z-10 h-64 w-64 rounded-full bg-warn/30 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[150%] w-[150%] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-warn to-warn-foreground drop-shadow-sm flex items-center gap-3">
              <LifeBuoy className="h-8 w-8 text-warn" />
              Helpdesk & CRM
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Manage user tickets and support requests. Ensure traders receive timely assistance.
            </p>
          </div>
        </div>
      </div>

      <AdminSupportTickets />
    </div>
  );
}
