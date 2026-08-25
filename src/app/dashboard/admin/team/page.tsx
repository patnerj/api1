'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { 
  Users2, UserPlus, Shield, ShieldCheck, ShieldAlert, 
  Lock, Key, Check, X, RefreshCw, Trash2, Edit, 
  Mail, User, Clock, CheckCircle2, AlertTriangle, Sparkles
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TeamMember } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/input'
import { toast } from 'sonner'

export default function TeamHubPage() {
  const queryClient = useQueryClient()

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'support_agent',
    password: '',
  })
  const [isInviting, setIsInviting] = useState(false)

  // Edit Role Modal State
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [newRole, setNewRole] = useState('')
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)

  // Query Team Members
  const { data: team = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-team-list'],
    queryFn: async () => {
      const res = await api.admin.teamList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    },
    staleTime: 5000,
  })

  // Role Counts
  const counts = useMemo(() => {
    return {
      super_admin: team.filter(t => t.role === 'super_admin').length,
      risk_officer: team.filter(t => t.role === 'risk_officer').length,
      support_agent: team.filter(t => t.role === 'support_agent').length,
      accountant: team.filter(t => t.role === 'accountant').length,
    }
  }, [team])

  // Generate random strong password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setInviteForm(prev => ({ ...prev, password: pass }))
    toast.success('Generated secure 12-character temporary password.')
  }

  const handleInviteSubmit = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Please enter name and valid email.')
      return
    }
    setIsInviting(true)
    try {
      const res = await api.admin.teamInvite(inviteForm)
      if (res.ok) {
        toast.success(res.data.message || `Team member ${inviteForm.name} provisioned!`)
        setIsInviteModalOpen(false)
        setInviteForm({ name: '', email: '', role: 'support_agent', password: '' })
        queryClient.invalidateQueries({ queryKey: ['admin-team-list'] })
      } else {
        toast.error(res.error || 'Failed to invite team member.')
      }
    } catch (err: any) {
      toast.error('Invite Error: ' + err.message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editingMember || !newRole) return
    setIsUpdatingRole(true)
    try {
      const res = await api.admin.teamUpdateRole(editingMember.id, newRole)
      if (res.ok) {
        toast.success(`Role for ${editingMember.name} updated to ${newRole.toUpperCase()}!`)
        setEditingMember(null)
        queryClient.invalidateQueries({ queryKey: ['admin-team-list'] })
      } else {
        toast.error(res.error || 'Failed to update role.')
      }
    } catch (err: any) {
      toast.error('Update Error: ' + err.message)
    } finally {
      setIsUpdatingRole(false)
    }
  }

  const handleDeleteMember = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to deactivate access for ${member.name}?`)) return
    try {
      const res = await api.admin.teamDelete(member.id)
      if (res.ok) {
        toast.success(`Staff access for ${member.name} deactivated.`)
        queryClient.invalidateQueries({ queryKey: ['admin-team-list'] })
      } else {
        toast.error(res.error || 'Failed to deactivate staff member.')
      }
    } catch (err: any) {
      toast.error('Deactivate Error: ' + err.message)
    }
  }

  // Permission Matrix Definition
  const PERMISSIONS_MATRIX = [
    { feature: 'Dashboard Overview & KPIs', super_admin: true, risk_officer: true, support_agent: true, accountant: true },
    { feature: 'Traders 360 & Account Overrides', super_admin: true, risk_officer: true, support_agent: true, accountant: false },
    { feature: 'Risk Engine & Rule Breaches', super_admin: true, risk_officer: true, support_agent: false, accountant: false },
    { feature: 'Payout Review & Disbursements', super_admin: true, risk_officer: false, support_agent: false, accountant: true },
    { feature: 'KYC & AML Verification', super_admin: true, risk_officer: true, support_agent: true, accountant: false },
    { feature: 'Payment Gateways & Proofs', super_admin: true, risk_officer: false, support_agent: false, accountant: true },
    { feature: 'Marketing, Banners & Certificates', super_admin: true, risk_officer: false, support_agent: true, accountant: false },
    { feature: 'Helpdesk & Ticket Resolution', super_admin: true, risk_officer: true, support_agent: true, accountant: true },
    { feature: 'Emergency Kill-Switches & Operations', super_admin: true, risk_officer: true, support_agent: false, accountant: false },
    { feature: 'System Config, Whitelabel & SMTP', super_admin: true, risk_officer: false, support_agent: false, accountant: false },
  ]

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge tone="danger" size="sm" className="font-mono">Super Admin</Badge>
      case 'risk_officer':
        return <Badge tone="accent" size="sm" className="font-mono">Risk Officer</Badge>
      case 'accountant':
        return <Badge tone="warning" size="sm" className="font-mono">Treasury / Accountant</Badge>
      default:
        return <Badge tone="neutral" size="sm" className="font-mono">Support Agent</Badge>
    }
  }

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Team & Role-Based Access Control (RBAC)
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Staff Management
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Manage administrative operators, risk officers, support agents, and fine-grained route permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetch()
              toast.success('Team roster refreshed')
            }}
            className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800/80 gap-2 h-9"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              generatePassword()
              setIsInviteModalOpen(true)
            }}
            className="gap-2 shadow-emerald-500/20 h-9"
          >
            <UserPlus className="h-4 w-4" />
            Invite Staff Member
          </Button>
        </div>
      </div>

      {/* ── Role KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-[#111827] border-[#1F2937] p-4">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Super Admins</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">{counts.super_admin}</span>
            <span className="text-[10px] text-red-400 font-semibold">Unrestricted</span>
          </div>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] p-4">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Risk Officers</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">{counts.risk_officer}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Risk Desk</span>
          </div>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] p-4">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Support Agents</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">{counts.support_agent}</span>
            <span className="text-[10px] text-blue-400 font-semibold">Helpdesk / KYC</span>
          </div>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] p-4">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Treasury Desk</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">{counts.accountant}</span>
            <span className="text-[10px] text-amber-400 font-semibold">Payouts & Orders</span>
          </div>
        </Card>
      </div>

      {/* ── Staff Directory Table ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <Users2 className="h-4 w-4 text-emerald-400" />
          Active Administrative Team ({team.length})
        </h3>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
          <DataTable
            data={team}
            loading={isLoading}
            emptyMessage="No staff members found."
            columns={[
              {
                key: 'member',
                header: 'Staff Member',
                render: (t: TeamMember) => (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{t.name}</span>
                      <span className="font-mono text-[10px] text-gray-500">#{t.id}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono truncate">{t.email}</p>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Assigned Role',
                render: (t: TeamMember) => getRoleBadge(t.role),
              },
              {
                key: 'status',
                header: 'Account Status',
                render: (t: TeamMember) => (
                  <Badge tone={t.status === 'active' ? 'success' : 'danger'} size="sm" className="capitalize">
                    {t.status}
                  </Badge>
                ),
              },
              {
                key: 'last_login',
                header: 'Last Active',
                render: (t: TeamMember) => (
                  <span className="text-xs text-gray-400 font-mono">
                    {t.last_login ? new Date(t.last_login).toLocaleDateString() : 'Never'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (t: TeamMember) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMember(t)
                        setNewRole(t.role)
                      }}
                      className="h-8 text-xs gap-1 border-[#1F2937] hover:bg-slate-800"
                    >
                      <Edit className="h-3.5 w-3.5 text-blue-400" />
                      Role
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMember(t)}
                      className="h-8 text-xs gap-1 border-[#1F2937] hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* ── Permission Matrix Preview ──────────────────────────────────────── */}
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardHeader className="border-b border-[#1F2937]/60 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-gray-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Role-Based Permission Matrix
            </CardTitle>
            <Badge tone="neutral" size="sm">Security Policy</Badge>
          </div>
          <CardDescription className="text-xs text-gray-400">
            Enforced fine-grained route access and capability boundaries per operator role.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1F2937] bg-[#0B0F19] text-gray-400 uppercase text-[10px]">
                <th className="py-3 px-4 font-bold">Platform Feature & Route</th>
                <th className="py-3 px-4 text-center text-red-400">Super Admin</th>
                <th className="py-3 px-4 text-center text-emerald-400">Risk Officer</th>
                <th className="py-3 px-4 text-center text-blue-400">Support Agent</th>
                <th className="py-3 px-4 text-center text-amber-400">Treasury Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              {PERMISSIONS_MATRIX.map((perm, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-gray-200 font-medium font-sans">{perm.feature}</td>
                  <td className="py-3 px-4 text-center">
                    {perm.super_admin ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-gray-600 mx-auto" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {perm.risk_officer ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-gray-600 mx-auto" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {perm.support_agent ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-gray-600 mx-auto" />}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {perm.accountant ? <Check className="h-4 w-4 text-emerald-400 mx-auto" /> : <X className="h-4 w-4 text-gray-600 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Invite Staff Member Modal ──────────────────────────────────────── */}
      <Modal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            <span>Invite Team Member</span>
          </div>
        }
        description="Provision operator credentials and assign role permissions."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Staff Member Full Name</Label>
            <Input
              id="staff-name"
              placeholder="e.g. Sarah Jenkins"
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Work Email Address</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="sarah@propfirm.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Operator Role</Label>
            <select
              id="staff-role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="support_agent">Support Agent (Helpdesk, KYC, Traders Read-Only)</option>
              <option value="risk_officer">Risk Officer (Risk Engine, Breaches, News-Lock)</option>
              <option value="accountant">Treasury / Accountant (Payouts, Payments, Affiliates)</option>
              <option value="super_admin">Super Admin (Full Unrestricted System Access)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="staff-pass">Temporary Password</Label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
              >
                <Sparkles className="h-3 w-3" /> Auto-Generate
              </button>
            </div>
            <Input
              id="staff-pass"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1F2937]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInviteSubmit}
              loading={isInviting}
              className="shadow-emerald-500/20"
            >
              Provision Account
            </Button>
          </div>

        </div>
      </Modal>

      {/* ── Edit Role Modal ────────────────────────────────────────────────── */}
      <Modal
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        title={`Change Role: ${editingMember?.name}`}
        description="Update administrative permissions for this staff member."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-select">Select New Role</Label>
            <select
              id="edit-role-select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="support_agent">Support Agent</option>
              <option value="risk_officer">Risk Officer</option>
              <option value="accountant">Treasury / Accountant</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1F2937]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingMember(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdateRole}
              loading={isUpdatingRole}
            >
              Update Permissions
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
