import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { LogActivityModal } from '@/components/activities/LogActivityModal';
import { FollowUpModal } from '@/components/followups/FollowUpModal';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';

export function AppLayout() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Desktop Sticky Sidebar */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 border-r">
            <Sidebar isMobile onCloseMobile={() => setMobileSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col min-w-0">
          <TopBar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

          {/* Page Container */}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>

        {/* Global Command Palette */}
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

        {/* Global Modals */}
        <LogActivityModal />
        <FollowUpModal />
      </div>
    </TooltipProvider>
  );
}

export default AppLayout;
