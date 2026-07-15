import React from 'react';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import { Award, Compass, History, Target } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">
      <LandingNavbar activeIndex={3} />

      <main className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary">
            About UC-METC Multipurpose Cooperative
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            Supporting the academic and support communities of the University of Cebu METC Campus through sustainable, member-owned financial services.
          </p>
        </header>

        {/* Mission / Vision Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-lg font-bold">Our Mission</h2>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              To uplift the economic and social well-being of cooperative members by providing secure, high-yield deposit accounts, accessible credit products, and financial literacy opportunities inside our campus network.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-lg font-bold">Our Vision</h2>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              To be the leading, most trusted digital cooperative platform for the University of Cebu academic community, driving financial independence, administrative transparency, and social development.
            </p>
          </div>
        </section>

        {/* History / Background Section */}
        <section className="p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
          <h2 className="font-headline text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary dark:text-secondary" />
            Cooperative Background &amp; History
          </h2>
          <div className="font-body text-xs text-neutral-600 dark:text-neutral-400 space-y-4 leading-relaxed">
            <p>
              Founded to serve the staff, faculty, and cooperative partners of the University of Cebu Maritime Education and Training Center (METC), our multipurpose cooperative has consistently worked to create localized capital opportunities.
            </p>
            <p>
              By offering share capital structures, fixed deposits, and tailored loan products, we serve as the primary financial bridge for our members during periods of career advancement, academic investment, or family transitions.
            </p>
          </div>
        </section>

        {/* Development Partners / KADT solutions */}
        <section className="p-8 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl space-y-4 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/15 dark:bg-secondary/15 flex items-center justify-center mx-auto text-primary dark:text-secondary">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-headline text-base font-bold">Technology Partner</h3>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
            This Loan Monitoring and Financial Management System is designed, engineered, and maintained by <strong>KADT Solutions</strong> in partnership with the UC-METC Multipurpose Cooperative Board of Directors.
          </p>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
