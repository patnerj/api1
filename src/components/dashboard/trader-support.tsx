"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Ticket, TicketMessage } from "@/types/api";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

export function TraderSupport() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New ticket state
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");

  const { data: ticketsData, refetch: refetchTickets } = useQuery({
    queryKey: ['trader.tickets.list'],
    queryFn: async () => {
      const res = await api.tickets.list();
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.data;
    },
    refetchInterval: (selectedTicket || isCreating) ? false : 10000,
  });
  const tickets = ticketsData ?? [];

  const { data: activeTicketData, refetch: refetchMessages } = useQuery({
    queryKey: ['trader.tickets.get', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return null;
      const res = await api.tickets.get(Number(selectedTicket.id));
      if (!res.ok) throw new Error('Failed to fetch ticket');
      return res.data;
    },
    enabled: !!selectedTicket,
    refetchInterval: 5000,
  });
  const messages = activeTicketData?.messages ?? [];
  const currentTicket = (activeTicketData as any)?.ticket || selectedTicket;

  const handleSelectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    setLoading(true);
    try {
      const res = await api.tickets.create({
        subject: newSubject,
        category: newCategory,
        message: newMessage,
      });
      if (res.ok && (res.data as any)?.success !== false) {
        toast.success("Support ticket opened successfully!");
        setIsCreating(false);
        setNewSubject("");
        setNewMessage("");
        await refetchTickets();
      } else {
        toast.error(res.ok ? ((res.data as any)?.message || "Failed to create ticket") : (res.error || "Failed to create ticket"));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create support ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setLoading(true);
    try {
      const res = await api.tickets.reply(Number(selectedTicket.id), replyText);
      if (res.ok && (res.data as any)?.success !== false) {
        toast.success("Reply sent.");
        setReplyText("");
        await refetchMessages();
        await refetchTickets();
      } else {
        toast.error(res.ok ? ((res.data as any)?.message || "Failed to send reply") : (res.error || "Failed to send reply"));
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reply.");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    open: "bg-info/20 text-info",
    in_progress: "bg-amber-500/20 text-amber-400",
    pending: "bg-warn/20 text-warn",
    resolved: "bg-success/20 text-success",
    closed: "bg-surface-hover text-text-muted",
  };

  if (isCreating) {
    return (
      <Card className="p-6 max-w-3xl mx-auto bg-surface border-border">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setIsCreating(false)}>
            ← Back
          </Button>
          <h2 className="text-xl font-bold text-text-strong">Open a New Ticket</h2>
        </div>
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text">Subject</label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full rounded-md border p-2 bg-bg border-border text-text placeholder:text-text-muted"
              placeholder="E.g., Issue with my account"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-md border p-2 bg-bg border-border text-text"
            >
              <option value="general">General Inquiry</option>
              <option value="billing">Billing & Payouts</option>
              <option value="rules">Rules & Evaluation Dispute</option>
              <option value="tech_mt5">Technical & Platform Issue</option>
              <option value="kyc">KYC & Verification</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text">Message</label>
            <textarea
              required
              rows={5}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full rounded-md border p-2 bg-bg border-border text-text placeholder:text-text-muted"
              placeholder="Describe your issue in detail..."
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </Card>
    );
  }

  if (selectedTicket) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
          ← Back to Tickets
        </Button>

        <Card className="p-6 bg-surface border-border shadow-sm rounded-xl">
          <div className="border-b border-border pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-text-strong">{selectedTicket.subject}</h2>
                <div className="text-sm text-text-muted mt-1 flex gap-4">
                  <span className="capitalize text-text-muted">Category: {selectedTicket.category}</span>
                  <span className="text-text-muted">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[currentTicket?.status || selectedTicket.status] || 'bg-surface-hover text-text-muted'}`}>
                {currentTicket?.status || selectedTicket.status}
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4 p-2">
            {messages.map((msg) => {
              const isMe = msg.sender_type === 'trader' || msg.sender_type === 'user'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-surface border border-border text-text'}`}>
                    <div className="text-xs opacity-70 mb-1">{isMe ? 'You' : 'Support Agent'} - {new Date(msg.created_at).toLocaleString()}</div>
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {(currentTicket?.status || selectedTicket.status) !== 'closed' ? (
            <div className="border-t border-border pt-4 flex gap-3">
              <textarea
                className="flex-1 rounded-md border p-3 bg-bg border-border text-text placeholder:text-text-muted min-h-[80px]"
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Button onClick={handleSendReply} disabled={!replyText.trim() || loading} className="self-end">
                Reply
              </Button>
            </div>
          ) : (
            <div className="border-t border-border pt-4 text-center text-text-muted">
              This ticket has been closed. If you need further assistance, please open a new ticket.
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-6 bg-surface border-border shadow-sm rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-strong">My Support Tickets</h2>
        <Button onClick={() => setIsCreating(true)}>Open New Ticket</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-text-muted">
            <tr>
              <th className="pb-3 font-medium">Ticket</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Last Update</th>
              <th className="pb-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tickets.map((t) => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-surface-hover transition-colors">
                <td className="py-4">
                  <div className="font-medium text-text">{t.subject}</div>
                </td>
                <td className="py-4 capitalize text-text-muted">{t.category}</td>
                <td className="py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-4 text-text-muted">{new Date(t.updated_at).toLocaleDateString()}</td>
                <td className="py-4">
                  <Button variant="outline" size="sm" onClick={() => handleSelectTicket(t)}>
                    View
                  </Button>
                </td>
              </motion.tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="inline-flex h-12 w-12 rounded-xl bg-accent-muted text-accent items-center justify-center mb-4">
                    <LifeBuoy className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight">No support tickets</h2>
                  <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
                    You have no open support tickets. Open a new ticket if you need assistance.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
