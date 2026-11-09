import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
        <Layers className="h-7 w-7" />
      </div>

      <span className="font-mono text-sm font-semibold tracking-wider text-primary uppercase">
        404 Error
      </span>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        Sorry, the page you are looking for doesn&apos;t exist, has been removed, or is temporarily
        unavailable.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/dashboard">
          <Button>
            <Home className="mr-2 h-4 w-4" /> Return to Dashboard
          </Button>
        </Link>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    </div>
  );
}
