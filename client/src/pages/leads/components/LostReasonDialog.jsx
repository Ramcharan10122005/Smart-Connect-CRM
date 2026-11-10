import { useState, useEffect } from 'react';
import { ThumbsDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LOST_REASONS = [
  'Competitor selected',
  'Budget constraints / Price too high',
  'Project cancelled / Internal reorg',
  'Feature mismatch / Capability gap',
  'Timing not right / Postponed to next quarter',
  'Unresponsive / Ghosted',
  'Other',
];

export function LostReasonDialog({
  open,
  onOpenChange,
  leadTitle = '',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [selectedReason, setSelectedReason] = useState(LOST_REASONS[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedReason(LOST_REASONS[0]);
      setNotes('');
    }
  }, [open]);

  const handleConfirm = () => {
    const combinedReason = notes.trim()
      ? `${selectedReason}: ${notes.trim()}`
      : selectedReason;
    onConfirm(combinedReason);
  };

  const handleClose = (isOpen) => {
    if (!isOpen && onCancel) {
      onCancel();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
            <ThumbsDown className="h-4 w-4" />
            Mark Opportunity as Lost
          </DialogTitle>
          <DialogDescription className="text-xs">
            {leadTitle
              ? `Record the primary reason why "${leadTitle}" did not convert.`
              : 'Record the primary reason why this deal did not convert.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason Preset Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Primary Lost Reason *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="h-9 text-xs rounded-crm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOST_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason} className="text-xs">
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes / Details */}
          <div className="space-y-1.5">
            <Label htmlFor="lostNotes" className="text-xs font-medium">
              Additional Feedback or Context
            </Label>
            <Textarea
              id="lostNotes"
              placeholder="e.g. Chose competitor X due to lower initial setup fees..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs rounded-crm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="min-w-28"
          >
            {loading ? 'Saving...' : 'Confirm Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LostReasonDialog;
