import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const SHORTCUT_GROUPS = [
  {
    title: 'Navigation & Search',
    shortcuts: [
      { keys: ['⌘', 'K'], label: 'Open Search / Command Palette' },
      { keys: ['?'], label: 'Open Keyboard Shortcuts' },
      { keys: ['Esc'], label: 'Close open dialog, sheet, or menu' },
    ],
  },
  {
    title: 'Quick Actions',
    shortcuts: [
      { keys: ['N', 'C'], label: 'New Contact' },
      { keys: ['N', 'L'], label: 'New Lead' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Keyboard Shortcuts</DialogTitle>
          <DialogDescription className="text-xs">
            Quick shortcuts to navigate and take action throughout SmartConnect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h4>
              <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <span className="text-foreground">{shortcut.label}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-background px-1.5 font-mono text-[11px] font-medium text-foreground shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsModal;

