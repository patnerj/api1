'use client'

import * as React from 'react'
import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Headphones, MessageSquare, Clock, AlertCircle, CheckCircle2, 
  Send, User, Hash, Tag, Filter, Search, RefreshCw, Paperclip,
  Sparkles, ShieldCheck, ChevronRight, X, ArrowLeft, ExternalLink,
  Flame, CheckCircle, AlertTriangle, LifeBuoy, FileText
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Ticket, TicketMessage } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { DataTable } from '@/components/ui/DataTable'
import { toast } from 'sonner'

// Canned Response Templates
const CANNED_RESPONSES = [
  {
    title: 'KYC Instructions',
    text: 'Hello, please submit a clear government-issued Photo ID (Passport or Driver License) along with a recent Utility Bill or Bank Statement (dated within the last 90 days) via the KYC tab in your dashboard for immediate compliance review.'
  },
  {
    title: 'Rule Breach Explained',
    text: 'Hello, our automated risk engine detected a drawdown breach exceeding the maximum daily or total equity threshold. As per our Trading Rules, the account has been transitioned to breached status. You can view the exact trade logs in your Account Analytics.'
  },
  {
    title: 'Payout Processing Note',
    text: 'Hello, your payout request is currently undergoing final risk audit and dual-admin compliance review. Payouts are normally disbursed within 24 business hours to your designated crypto wallet or bank destination.'
  },
  {
    title: 'MT5 EA Latency Checked',
    text: 'Hello, our engineering team checked the MT5 gateway bridge telemetry. Server latency is operating normally at sub-15ms. Please ensure your Expert Advisor is utilizing market execution orders and conforms to maximum lot limits.'
  }
]

export default function AdminHelpdeskPage() {
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Selected Ticket State
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [replyMessage, setReplyMessage] = useState('')

  // ─────────────────────────────────────────────────────────────
  // 1. FETCH TICKETS LIST
  // ─────────────────────────────────────────────────────────────
  const { data: tickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter, categoryFilter, searchQuery],
    queryFn: async () => {
      const res = await api.admin.tickets.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchQuery ? searchQuery : undefined,
      })
      return res.ok && Array.isArray(res.data) ? res.data : []
    },
    refetchInterval: 15_000,
  })

  // Auto-select first ticket on load if none selected
  useEffect(() => {
    if (tickets.length > 0 && selectedTicketId === null) {
      setSelectedTicketId(tickets[0].id)
    }
  }, [tickets, selectedTicketId])

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH ACTIVE TICKET DETAILS & MESSAGES
  // ─────────────────────────────────────────────────────────────
  const { data: activeTicketData, isLoading: isLoadingActiveTicket, refetch: refetchActiveTicket } = useQuery({
    queryKey: ['admin-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null
      const res = await api.admin.tickets.get(selectedTicketId)
      return res.ok ? res.data : null
    },
    enabled: !!selectedTicketId,
    refetchInterval: 6_000,
  })

  const activeTicket = activeTicketData?.ticket || tickets.find(t => t.id === selectedTicketId) || null
  const activeMessages = activeTicketData?.messages || []

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages])

  // ─────────────────────────────────────────────────────────────
  // 3. MUTATIONS: SEND REPLY & UPDATE STATUS
  // ─────────────────────────────────────────────────────────────
  const sendReplyMutation = useMutation({
    mutationFn: async ({ id, message }: { id: number; message: string }) => {
      const res = await api.admin.tickets.reply(id, message)
      if (!res.ok) throw new Error(res.error || 'Failed to send reply.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Response delivered to trader!')
      setReplyMessage('')
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error sending reply.')
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, priority }: { id: number; status?: string; priority?: string }) => {
      const res = await api.admin.tickets.updateStatus(id, status, priority)
      if (!res.ok) throw new Error(res.error || 'Failed to update status.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Ticket status updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Update failed.')
    }
  })

  const handleSendReplySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !replyMessage.trim()) {
      toast.error('Please enter a response message.')
      return
    }
    sendReplyMutation.mutate({ id: selectedTicketId, message: replyMessage.trim() })
  }

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    const total = tickets.length
    const openCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
    const urgentCount = tickets.filter(t => t.priority === 'urgent').length
    const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 100
    return { total, openCount, urgentCount, resolvedCount, resolutionRate }
  }, [tickets])

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Support & Helpdesk Hub
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Live Queue
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Resolve trader inquiries, dispute tickets, and dispatch real-time admin assistance.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchTickets()
            refetchActiveTicket()
            toast.info('Ticket queue refreshed.')
          }}
          className="gap-1.5 border-[#1F2937] hover:border-emerald-500 self-start sm:self-center"
        >
          <RefreshCw className="h-4 w-4 text-emerald-400" />
          Refresh Queue
        </Button>
      </div>

      {/* ── Summary Metric Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Total Tickets</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Headphones className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white mt-1.5 font-mono">
              {metrics.total}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">All-time inquiries</span>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Pending Queue</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">
              {metrics.openCount}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Awaiting admin review</span>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Urgent Escalations</span>
              <div className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-400 mt-1.5 font-mono">
              {metrics.urgentCount}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Priority triage</span>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Resolution Rate</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
              {metrics.resolutionRate}%
            </div>
            <span className="text-[10px] text-gray-500 font-mono">{metrics.resolvedCount} of {metrics.total} resolved</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Toolbar ──────────────────────────────────────── */}
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
              <Input
                placeholder="Search ticket #, trader name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Unread)</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="all">All Categories</option>
              <option value="billing">Billing & Checkout</option>
              <option value="rules">Trading Rules & Breaches</option>
              <option value="tech_mt5">MT5 Gateway / Bridge</option>
              <option value="kyc">KYC & Identity</option>
              <option value="general">General Support</option>
            </select>

          </div>
        </CardContent>
      </Card>

      {/* ── Master-Detail 2-Column Main Layout ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        
        {/* ── Left Column: Ticket Queue Table (5 Cols) ──────────────────────── */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              Ticket Queue ({tickets.length})
            </h3>
            <span className="text-[11px] text-gray-500">Click row to open thread</span>
          </div>

          <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
            {tickets.length === 0 ? (
              <Card className="bg-[#111827] border-[#1F2937]">
                <CardContent className="py-12 text-center text-gray-400">
                  <Headphones className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                  <p className="font-semibold text-white text-xs">No tickets match active filter</p>
                  <p className="text-[10px] text-gray-500 mt-1">Clear filters to view all customer support conversations.</p>
                </CardContent>
              </Card>
            ) : (
              tickets.map((t) => {
                const isSelected = selectedTicketId === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-[#111827] border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-[#111827]/70 border-[#1F2937] hover:border-gray-600 hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {t.ticket_number}
                        </span>
                        <Badge 
                          tone={
                            t.priority === 'urgent' ? 'danger' :
                            t.priority === 'high' ? 'warn' :
                            t.priority === 'medium' ? 'neutral' : 'neutral'
                          } 
                          size="sm" 
                          className="text-[10px] capitalize font-mono"
                          pulsing={t.priority === 'urgent'}
                        >
                          {t.priority}
                        </Badge>
                      </div>

                      <Badge 
                        tone={
                          t.status === 'open' ? 'success' :
                          t.status === 'in_progress' ? 'accent' :
                          t.status === 'resolved' ? 'neutral' : 'neutral'
                        } 
                        size="sm"
                        className="text-[10px] capitalize"
                      >
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-white line-clamp-1">
                        {t.subject}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1 font-sans">
                        {t.latest_message || 'No messages'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]/50 text-[10px] text-gray-500 font-mono">
                      <span>{t.display_name || t.user_login || `User #${t.trader_id}`}</span>
                      <span>{new Date(t.updated_at || t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Conversation & Response Panel (7 Cols) ─────────── */}
        <div className="lg:col-span-7">
          {activeTicket ? (
            <Card className="bg-[#111827] border-[#1F2937] flex flex-col h-[780px] justify-between overflow-hidden shadow-xl">
              
              {/* Ticket Detail Header */}
              <CardHeader className="border-b border-[#1F2937]/80 pb-4 shrink-0 bg-[#0B0F19]/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                        {activeTicket.ticket_number}
                      </span>
                      <h3 className="text-base font-bold text-white line-clamp-1">
                        {activeTicket.subject}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-mono">
                      <span>Trader: {activeTicket.display_name || activeTicket.user_login}</span>
                      <span>•</span>
                      <span>{activeTicket.user_email || 'No Email'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 uppercase">{activeTicket.category}</span>
                    </div>
                  </div>

                  {/* Status & Priority Modifiers */}
                  <div className="flex items-center gap-2">
                    <select
                      value={activeTicket.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: activeTicket.id, status: e.target.value })}
                      className="h-8 px-2.5 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono capitalize"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                    <select
                      value={activeTicket.priority}
                      onChange={(e) => updateStatusMutation.mutate({ id: activeTicket.id, priority: e.target.value })}
                      className="h-8 px-2.5 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono capitalize"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              {/* Scrollable Message Thread */}
              <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 font-sans bg-[#0B0F19]/20">
                {activeMessages.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-xs">
                    No message history loaded for this ticket.
                  </div>
                ) : (
                  activeMessages.map((msg: TicketMessage) => {
                    const isAdmin = msg.sender_type === 'admin'
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-gray-400">
                          <span className={isAdmin ? 'text-emerald-400 font-bold' : 'text-gray-300'}>
                            {isAdmin ? 'Prop Firm Support Agent' : (msg.sender_name || activeTicket.display_name || 'Trader')}
                          </span>
                          <span>•</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div 
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isAdmin 
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-gray-100 rounded-tr-none' 
                              : 'bg-[#111827] border border-[#1F2937] text-gray-200 rounded-tl-none shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Canned Response Presets & Reply Box */}
              <CardFooter className="border-t border-[#1F2937]/80 p-4 flex flex-col gap-3 bg-[#0B0F19]/60 shrink-0">
                
                {/* Canned Responses Row */}
                <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    Quick Canned:
                  </span>
                  {CANNED_RESPONSES.map((cr) => (
                    <button
                      key={cr.title}
                      type="button"
                      onClick={() => setReplyMessage(cr.text)}
                      className="px-2.5 py-1 rounded-md bg-[#111827] hover:bg-emerald-500/20 border border-[#1F2937] hover:border-emerald-500/40 text-[11px] text-gray-300 hover:text-emerald-300 transition-all shrink-0 cursor-pointer"
                    >
                      {cr.title}
                    </button>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReplySubmit} className="w-full space-y-2">
                  <div className="relative">
                    <Textarea
                      placeholder="Type admin response (supports markdown and quick guidelines)..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      className="text-xs bg-[#0B0F19] border-[#1F2937] focus:border-emerald-500 pr-24"
                    />
                    <div className="absolute right-2.5 bottom-2.5 flex items-center gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        loading={sendReplyMutation.isPending}
                        className="gap-1.5 shadow-emerald-500/20 h-8 text-xs font-semibold"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </form>

              </CardFooter>

            </Card>
          ) : (
            <Card className="bg-[#111827] border-[#1F2937] h-[780px] flex items-center justify-center text-center p-8">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <Headphones className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">Select a Ticket</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                  Choose an open inquiry from the left queue to view user details, full conversation threads, and send admin resolutions.
                </p>
              </div>
            </Card>
          )}
        </div>

      </div>

    </div>
  )
}
