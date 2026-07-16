import React from 'react';
import { Award, Compass, History, Target, Users, Scale, Eye, Heart, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
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

            <p className="font-body space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
              The Cooperative commits to:
            </p>

            <ul className="list-disc pl-5 space-y-1 font-body text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <li>Alleviate the members&apos; financial standing.</li>
              <li>Increase its financial capability.</li>
              <li>
                Engage in social responsibility through active cooperation among
                stakeholders.
              </li>
            </ul>

          </div>

          <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-lg font-bold">Our Vision</h2>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The University of Cebu-Maritime Education and Training Center Employees Credit Cooperative envisions to be one of the leading school cooperatives in Cebu City.
            </p>
          </div>
        </section>

        {/* Core Values Section */}
        <section className="p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
          <h2 className="font-headline text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary dark:text-secondary" />
            Our Core Values
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Unity */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">UNITY</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Collaborate activities at all times.
              </p>
            </div>

            {/* Cooperation */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">COOPERATION</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Express enthusiasm, willingness and volunteerism.
              </p>
            </div>

            {/* Motivation */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">MOTIVATION</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Encourage members to invest and be socially responsible.
              </p>
            </div>

            {/* Equity */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">EQUITY</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Treat members justly and fairly.
              </p>
            </div>

            {/* Transparency */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">TRANSPARENCY</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Deal financially to members and other stakeholders with openness and honest.
              </p>
            </div>

            {/* Compassion */}
            <div className="p-5 border border-outline-variant/40 rounded-2xl space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Heart className="w-4 h-4" />
              </div>
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">COMPASSION</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Manifest love and care towards the common goal.
              </p>
            </div>
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
    </>
  );
}
