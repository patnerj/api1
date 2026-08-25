"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Ticket, TicketMessage } from "@/types/api";
import { MessageSquare, Clock, CheckCircle2, XCircle, ChevronRight, User, Hash, Tag, Send, ArrowLeft } from "lucide-react";

const STATUS_CFG = {
  open:     { icon: MessageSquare, cls: "bg-info/10 text-info border border-info/20" },
  pending:  { icon: Clock,         cls: "bg-warn/10 text-warn border border-warn/20" },
  resolved: { icon: CheckCircle2,  cls: "bg-success/10 text-success border border-success/20" },
  closed:   { icon: XCircle,       cls: "bg-surface-strong text-text-muted border border-border" },
} as const;

export function AdminSupportTickets() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: ticketsData, refetch: refetchTickets } = useQuery({
    queryKey: ['admin.tickets.list'],
    queryFn: async () => {
      const res = await api.admin.tickets.list();
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.data;
    },
    refetchInterval: selectedTicket ? false : 10000,
  });
  const tickets = ticketsData ?? [];

  const { data: activeTicketData, refetch: refetchMessages } = useQuery({
    queryKey: ['admin.tickets.get', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const res = await api.admin.tickets.get(selectedTicket.id);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      return res.data;
    },
    enabled: !!selectedTicket,
    refetchInterval: 5000,
  });
  const messages = activeTicketData?.messages ?? [];

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setLoading(true);
    try {
      await api.admin.tickets.reply(selectedTicket.id, replyText);
      setReplyText("");
      await refetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await api.admin.tickets.updateStatus(selectedTicket.id, status);
      setSelectedTicket({ ...selectedTicket, status: status as any });
    } catch (err) {
      console.error(err);
    }
  };

  if (selectedTicket) {
    const Cfg = STATUS_CFG[selectedTicket.status as keyof typeof STATUS_CFG] || STATUS_CFG.open;
    const StatusIcon = Cfg.icon;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tickets
          </Button>
          <div className="flex gap-2 p-1 bg-surface-muted rounded-lg border border-border-subtle">
            {Object.keys(STATUS_CFG).map((s) => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  selectedTicket.status === s ? 'bg-surface shadow text-text' : 'text-text-muted hover:text-text hover:bg-surface/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Card className="flex flex-col h-[70vh] border-border-strong overflow-hidden bg-surface">
          <div className="border-b border-border-subtle p-5 bg-surface-muted/50 shrink-0">
            <h2 className="text-xl font-bold tracking-tight text-text flex items-center gap-2">
              <Hash className="h-5 w-5 text-text-muted" />
              {selectedTicket.subject}
            </h2>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5 text-text-muted">
                <User className="h-4 w-4" />
                {selectedTicket.user_email || "Unknown"}
              </span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <Tag className="h-4 w-4" />
                <span className="capitalize">{selectedTicket.category}</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${Cfg.cls}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {selectedTicket.status}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[url('/noise.png')] bg-[size:100px_100px] bg-repeat opacity-[0.98]">
            {messages.map((msg: TicketMessage) => {
              const isAdmin = msg.sender_type === 'admin';
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                    isAdmin 
                      ? 'bg-accent text-accent-foreground rounded-tr-sm' 
                      : 'bg-surface-strong text-text border border-border-subtle rounded-tl-sm'
                  }`}>
                    <div className="text-[10px] font-medium opacity-70 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      {isAdmin ? 'Support Team' : 'Trader'}
                      <span className="opacity-50">•</span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</div>
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-3">
                <MessageSquare className="h-10 w-10 opacity-20" />
                <p>No messages yet in this conversation.</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-subtle bg-surface shrink-0">
            <div className="relative">
              <textarea
                className="w-full rounded-xl border border-border-strong bg-surface-muted p-4 pr-14 text-sm focus-ring min-h-[100px] resize-none"
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Button
                size="icon"
                onClick={handleSendReply}
                disabled={!replyText.trim() || loading}
                className="absolute bottom-3 right-3 h-10 w-10 rounded-lg shadow-sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className="overflow-hidden border-border-strong">
      <div className="overflow-x-auto">
        <Table className="w-full text-left text-sm whitespace-nowrap">
          <TableHeader className="bg-surface-muted/50 text-text-muted border-b border-border-subtle">
            <TableRow>
              <TableHead className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Subject</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">User</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Status</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-xs tracking-wider uppercase">Last Updated</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-xs tracking-wider uppercase text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border-subtle">
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-6 py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-surface-muted flex items-center justify-center border border-border-subtle">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                    </div>
                    <p>All caught up! No active support tickets.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t: Ticket) => {
                const Cfg = STATUS_CFG[t.status as keyof typeof STATUS_CFG] || STATUS_CFG.open;
                const StatusIcon = Cfg.icon;
                return (
                  <TableRow
                    key={t.id}
                    className="hover:bg-surface-muted/30 transition-colors group"
                  >
                    <TableCell className="px-6 py-4 font-medium text-text max-w-[250px] truncate">
                      {t.subject}
                      <div className="text-xs text-text-muted mt-0.5 font-normal flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span className="capitalize">{t.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-text-muted">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-info/20 to-accent/20 flex items-center justify-center text-xs font-semibold text-text">
                          {(t.user_email?.[0] || '?').toUpperCase()}
                        </div>
                        {t.user_email || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${Cfg.cls}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {t.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-text-muted num">
                      {new Date(t.updated_at).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectTicket(t)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
