import React from 'react';
import { Award, Compass, History, Target, Users, Scale, Eye, Heart, Handshake } from 'lucide-react';

const coreValues = [
  {
    letter: 'U',
    word: 'UNITY',
    icon: Users,
    desc: 'Collaborate activities at all times.',
  },
  {
    letter: 'C',
    word: 'COOPERATION',
    icon: Award,
    desc: 'Express enthusiasm, willingness and volunteerism.',
  },
  {
    letter: 'M',
    word: 'MOTIVATION',
    icon: Compass,
    desc: 'Encourage members to invest and be socially responsible.',
  },
  {
    letter: 'E',
    word: 'EQUITY',
    icon: Scale,
    desc: 'Treat members justly and fairly.',
  },
  {
    letter: 'T',
    word: 'TRANSPARENCY',
    icon: Eye,
    desc: 'Deal financially to members and other stakeholders with openness and honesty.',
  },
  {
    letter: 'C',
    word: 'COMPASSION',
    icon: Heart,
    desc: 'Manifest love and care towards the common goal.',
  },
];

export default function AboutPage() {
  return (
    <>
      <main className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-12">
        {/* Page Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
            University of Cebu METC Campus
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary dark:text-secondary tracking-tight">
            About UC-METC Multipurpose Cooperative
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Supporting the academic and support communities of the University of Cebu METC Campus through sustainable, member-owned financial services.
          </p>
        </header>

        {/* Mission / Vision Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-lg sm:text-xl font-bold">Our Mission</h2>

            <p className="font-body text-sm text-neutral-600 dark:text-neutral-400">
              The Cooperative commits to:
            </p>

            <ul className="list-disc pl-5 space-y-1.5 font-body text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <li>Alleviate the members&apos; financial standing.</li>
              <li>Increase its financial capability.</li>
              <li>
                Engage in social responsibility through active cooperation among
                stakeholders.
              </li>
            </ul>
          </div>

          <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-lg sm:text-xl font-bold">Our Vision</h2>
            <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              To be the leading school cooperative, inspiring empowerment, community solidarity, sustainable growth, and ethical practices.
            </p>
          </div>
        </section>

        {/* Core Values Section — Vertical Typographic UC-METC Treatment */}
        <section className="p-6 sm:p-10 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-8 shadow-sm">
          {/* Header with Handshake Icon */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-primary dark:text-secondary mb-1.5">
                <Handshake className="w-4 h-4" />
                Guiding Principles
              </div>
              <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
                Our Core Values
              </h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 self-start sm:self-auto">
              <span className="font-mono font-bold tracking-widest">UC-METC</span>
              <span className="text-neutral-500 dark:text-neutral-400 font-normal">Acronym</span>
            </div>
          </div>

          {/* Vertical Acronym Spine & Values List */}
          <div className="relative pl-2 sm:pl-4">
            {/* Continuous vertical rail guide */}
            <div
              className="absolute left-7 sm:left-9 top-4 bottom-6 w-0.5 bg-gradient-to-b from-primary/30 via-primary/20 to-transparent dark:from-secondary/30 dark:via-secondary/20"
              aria-hidden="true"
            />

            <div className="space-y-4">
              {coreValues.map((val, idx) => {
                const IconComponent = val.icon;
                return (
                  <div
                    key={idx}
                    className="relative flex items-start gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 group"
                  >
                    {/* Vertical Letter Station */}
                    <div className="relative flex-shrink-0 w-10 sm:w-11 h-10 sm:h-11 rounded-2xl bg-white dark:bg-neutral-950 border-2 border-primary/30 dark:border-secondary/30 group-hover:border-primary dark:group-hover:border-secondary group-hover:scale-105 shadow-xs flex items-center justify-center transition-all duration-200 z-10">
                      <span className="font-headline font-black text-xl sm:text-2xl text-primary dark:text-secondary select-none">
                        {val.letter}
                      </span>
                    </div>

                    {/* Value Content */}
                    <div className="flex-1 min-w-0 pt-0.5 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="font-headline text-sm sm:text-base font-bold text-on-surface dark:text-white tracking-wide">
                          {val.word}
                        </h3>
                      </div>
                      <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {val.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* History / Background Section */}
        <section className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
          <h2 className="font-headline text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary dark:text-secondary" />
            Cooperative Background &amp; History
          </h2>
          <div className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 space-y-4 leading-relaxed">
            <p>
              Founded to serve the staff, faculty, and cooperative partners of the University of Cebu Maritime Education and Training Center (METC), our multipurpose cooperative has consistently worked to create localized capital opportunities.
            </p>
            <p>
              By offering share capital structures, fixed deposits, and tailored loan products, we serve as the primary financial bridge for our members during periods of career advancement, academic investment, or family transitions.
            </p>
          </div>
        </section>

        {/* Development Partners / KADT solutions */}
        <section className="p-6 sm:p-8 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl space-y-4 text-center">
          <div className="w-10 h-10 rounded-full bg-primary/15 dark:bg-secondary/15 flex items-center justify-center mx-auto text-primary dark:text-secondary">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-headline text-base font-bold">Technology Partner</h3>
          <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            This Loan Monitoring System is designed, engineered, and maintained by <strong>KADT Solutions</strong> in partnership with the UC-METC Multipurpose Cooperative Board of Directors.
          </p>
        </section>
      </main>
    </>
  );
}
