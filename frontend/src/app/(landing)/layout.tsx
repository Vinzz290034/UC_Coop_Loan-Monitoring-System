import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">
      {/* Shared top navigation — persists across route changes */}
      <LandingNavbar />

      {/* Page-specific content swapped in by Next.js router */}
      {children}

      {/* Shared footer — persists across route changes */}
      <LandingFooter />
    </div>
  );
}
