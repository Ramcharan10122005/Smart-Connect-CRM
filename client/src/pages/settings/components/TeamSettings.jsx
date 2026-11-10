import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { initials, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TeamSettings() {
  const queryClient = useQueryClient();
  const { role: currentRole, user: currentUser } = useAuthStore();
  const isAdmin = currentRole === 'ADMIN';

  // Dialog states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('REP');
  const [invitePhone, setInvitePhone] = useState('');

  // Edit user state
  const [editTarget, setEditTarget] = useState(null);
  const [editRole, setEditRole] = useState('REP');
  const [editIsActive, setEditIsActive] = useState(true);

  // Fetch all users
  const { data: usersData, isLoading } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });

  const users = usersData || [];

  // 1. Invite User Mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/users', {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        phone: invitePhone.trim() || undefined,
      });
      return res.data?.data;
    },
    onSuccess: (newUser) => {
      toast.success(`Invitation sent to ${newUser?.email}!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('REP');
      setInvitePhone('');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to send invite');
    },
  });

  // 2. Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      const res = await api.patch(`/users/${editTarget.id}`, {
        role: editRole,
        isActive: editIsActive,
      });
      return res.data?.data;
    },
    onSuccess: () => {
      toast.success('Team member updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setEditTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update user');
    },
  });

  const openEditModal = (target) => {
    setEditTarget(target);
    setEditRole(target.role);
    setEditIsActive(target.isActive !== false);
  };

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    inviteMutation.mutate();
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Team Management</CardTitle>
          <CardDescription className="text-xs">
            Review CRM users, assign role access levels, and invite new sales representatives.
          </CardDescription>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)} className="h-9 gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Member</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-semibold">Team Member</TableHead>
              <TableHead className="text-xs font-semibold">Role</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold">Joined</TableHead>
              {isAdmin && <TableHead className="text-xs font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-14 animate-pulse bg-muted/20" />
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-xs text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((member) => {
                const isSelf = member.id === currentUser?.id;
                return (
                  <TableRow key={member.id}>
                    {/* User Info */}
                    <TableCell className="text-xs font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials(member.name || 'SC')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground font-mono">(You)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-normal">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono uppercase font-semibold ${
                          member.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300'
                            : member.role === 'MANAGER'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300'
                              : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300'
                        }`}
                      >
                        {member.role}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-xs">
                      {member.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          <XCircle className="h-3 w-3" /> Deactivated
                        </span>
                      )}
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDate(member.createdAt)}
                    </TableCell>

                    {/* Actions (Admin edit) */}
                    {isAdmin && (
                      <TableCell className="text-xs text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(member)}
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Invite Member Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Invite Team Member</DialogTitle>
            <DialogDescription className="text-xs">
              Send an invitation email with a secure registration link to join your SmartConnect CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="sarah@company.com"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role *</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REP">Sales Representative (REP)</SelectItem>
                  <SelectItem value="MANAGER">Sales Manager (MANAGER)</SelectItem>
                  <SelectItem value="ADMIN">System Administrator (ADMIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number (Optional)</Label>
              <Input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(false)}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending Invite...
                  </>
                ) : (
                  <>
                    <Mail className="mr-1.5 h-3.5 w-3.5" /> Send Invite
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(val) => !val && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Team Member</DialogTitle>
            <DialogDescription className="text-xs">
              Change role permissions or active status for {editTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role Permissions</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REP">Sales Representative (REP)</SelectItem>
                  <SelectItem value="MANAGER">Sales Manager (MANAGER)</SelectItem>
                  <SelectItem value="ADMIN">System Administrator (ADMIN)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Status</Label>
              <Select
                value={editIsActive ? 'active' : 'inactive'}
                onValueChange={(val) => setEditIsActive(val === 'active')}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Can log in)</SelectItem>
                  <SelectItem value="inactive">Deactivated (Access blocked)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditTarget(null)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
