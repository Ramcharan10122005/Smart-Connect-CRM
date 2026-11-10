import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StickyNote,
  Pin,
  Send,
  Loader2,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { cn, formatDate, initials } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function NotesTab({ contactId = null, companyId = null }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const [noteText, setNoteText] = useState('');
  const [pinnedNoteIds, setPinnedNoteIds] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Fetch activities of type NOTE
  const queryParams = {
    contactId: contactId || undefined,
    companyId: companyId || undefined,
    type: 'NOTE',
    limit: 50,
  };

  const { data: notesData, isLoading } = useQuery({
    queryKey: ['activities', 'notes-tab', queryParams],
    queryFn: async () => {
      const res = await api.get('/activities', { params: queryParams });
      return res.data?.data || [];
    },
  });

  const notes = notesData || [];

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (body) => {
      const res = await api.post('/activities', {
        type: 'NOTE',
        subject: 'Internal Note',
        body,
        contactId: contactId || null,
        companyId: companyId || null,
        occurredAt: new Date(),
      });
      return res.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.overview(contactId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ contactId }) });
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.companies.overview(companyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.timeline({ companyId }) });
      }
      setNoteText('');
      toast.success('Note added');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save note');
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Note deleted');
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete note');
    },
  });

  const handleTogglePin = (id) => {
    setPinnedNoteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied note to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    createNoteMutation.mutate(noteText.trim());
  };

  const pinnedNotes = notes.filter((n) => pinnedNoteIds.includes(n.id));
  const otherNotes = notes.filter((n) => !pinnedNoteIds.includes(n.id));

  return (
    <div className="space-y-6">
      {/* Quick Add Note Card */}
      <div className="rounded-card border bg-card p-4 shadow-xs space-y-3">
        <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
          <span>Add Internal Note</span>
        </h4>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Document phone conversations, client preferences, next actions..."
            rows={3}
            className="text-xs rounded-crm resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Internal notes are only visible to your sales team.
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={createNoteMutation.isPending || !noteText.trim()}
              className="h-8 text-xs gap-1.5 rounded-crm"
            >
              {createNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" /> Save Note
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p className="mt-2">Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-card border border-dashed p-10 text-center text-muted-foreground space-y-2">
          <StickyNote className="h-8 w-8 mx-auto opacity-40 text-amber-500" />
          <h4 className="font-semibold text-sm text-foreground">No notes recorded</h4>
          <p className="text-xs max-w-sm mx-auto">
            Use the box above to write down context, reminders, or insights.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Pin className="h-3 w-3" /> Pinned Notes ({pinnedNotes.length})
                </span>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="space-y-2.5">
                {pinnedNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isPinned={true}
                    onTogglePin={() => handleTogglePin(note.id)}
                    onCopy={() => handleCopy(note.id, note.body || '')}
                    onDelete={() => setDeleteId(note.id)}
                    isCopied={copiedId === note.id}
                    canDelete={note.createdBy?.id === currentUser?.id || currentUser?.role === 'ADMIN'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Notes */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Notes ({otherNotes.length})
              </span>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="space-y-2.5">
              {otherNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  isPinned={false}
                  onTogglePin={() => handleTogglePin(note.id)}
                  onCopy={() => handleCopy(note.id, note.body || '')}
                  onDelete={() => setDeleteId(note.id)}
                  isCopied={copiedId === note.id}
                  canDelete={note.createdBy?.id === currentUser?.id || currentUser?.role === 'ADMIN'}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(isOpen) => !isOpen && setDeleteId(null)}
        title="Delete this note?"
        description="This will permanently remove this note from the customer record."
        confirmText="Delete"
        variant="destructive"
        loading={deleteNoteMutation.isPending}
        onConfirm={async () => {
          if (deleteId) {
            await deleteNoteMutation.mutateAsync(deleteId);
          }
        }}
      />
    </div>
  );
}

function NoteItem({ note, isPinned, onTogglePin, onCopy, onDelete, isCopied, canDelete }) {
  return (
    <div
      className={cn(
        'rounded-card border bg-card p-4 shadow-xs space-y-2 transition-colors relative group',
        isPinned && 'border-amber-300 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={note.createdBy?.avatarUrl} alt={note.createdBy?.name} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials(note.createdBy?.name || 'SC')}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {note.createdBy?.name || 'Team member'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            • {formatDate(note.occurredAt || note.createdAt, { relative: true })}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onTogglePin}
            className={cn(
              'p-1 rounded cursor-pointer transition-colors',
              isPinned
                ? 'text-amber-600 hover:text-amber-700'
                : 'text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100'
            )}
            title={isPinned ? 'Unpin note' : 'Pin note to top'}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onCopy}
            className="p-1 rounded text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-colors"
            title="Copy text"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-muted-foreground/60 hover:text-destructive opacity-0 group-hover:opacity-100 cursor-pointer transition-colors"
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
        {note.body}
      </p>
    </div>
  );
}

export default NotesTab;
