import React from 'react';
import {
  Award,
  Compass,
  History,
  Target,
  Users,
  Scale,
  Eye,
  Heart,
  Handshake,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  Lock,
  Zap,
  ShieldCheck,
} from 'lucide-react';

const metrics = [
  {
    icon: Users,
    value: '100+',
    label: 'Active Members',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'Member-Owned',
  },
  {
    icon: GraduationCap,
    value: 'METC',
    label: 'Cebu Campus',
  },
  {
    icon: RefreshCw,
    value: '24/7',
    label: 'Digital Sync',
  },
];

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
      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-14">
        {/* Page Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
            University of Cebu METC Campus
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary dark:text-secondary tracking-tight">
            About UC-METC Multipurpose Cooperative
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Supporting the academic and maritime support communities of the University of Cebu METC Campus through sustainable, transparent, and member-owned financial services.
          </p>

          {/* Live Status Metrics Quick Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4">
            {metrics.map((m, i) => {
              const MetricIcon = m.icon;
              return (
                <div
                  key={i}
                  className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-2xl p-4 flex items-center gap-3.5 shadow-xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                    <MetricIcon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-headline text-base sm:text-lg font-bold text-primary dark:text-secondary leading-tight">
                      {m.value}
                    </div>
                    <div className="font-body text-[11px] text-neutral-500 dark:text-neutral-400">
                      {m.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        {/* Mission / Vision Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Mission Card */}
          <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface dark:text-white">
                Our Mission
              </h2>
              <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                The UC-METC Multipurpose Cooperative commits to continuous institutional service, advancing members&apos; financial independence:
              </p>
              <ul className="space-y-2.5 pt-1">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary mt-0.5 shrink-0" />
                  <span className="font-body text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Alleviate the members&apos; financial standing through accessible credit and welfare funds.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary mt-0.5 shrink-0" />
                  <span className="font-body text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Increase institutional financial capability through pooled capital and disciplined savings.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary mt-0.5 shrink-0" />
                  <span className="font-body text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Engage in social responsibility through active cooperation among maritime and faculty stakeholders.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Vision Card */}
          <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Compass className="w-6 h-6" />
              </div>
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface dark:text-white">
                Our Vision
              </h2>
              <blockquote className="font-headline text-sm sm:text-base text-on-surface dark:text-white font-medium leading-relaxed p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border-l-4 border-primary dark:border-secondary">
                &ldquo;To be the leading school cooperative, inspiring empowerment, community solidarity, sustainable growth, and ethical practices.&rdquo;
              </blockquote>
              <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Envisioning a self-reliant maritime campus community where cooperative principles empower educators, staff, and maritime training officers toward lifelong security.
              </p>
            </div>
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
          <div className="space-y-2 sm:space-y-3">
            {coreValues.map((val, idx) => {
              const IconComponent = val.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 sm:gap-6 p-3 sm:p-4 rounded-2xl transition-all duration-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 group"
                >
                  {/* Vertical Letter - Bold Typographic Focal Point */}
                  <div className="flex-shrink-0 w-8 sm:w-10 text-center select-none pt-0.5">
                    <span className="font-headline font-black text-3xl sm:text-4xl text-primary dark:text-secondary tracking-tight block transition-transform duration-200 group-hover:scale-110">
                      {val.letter}
                    </span>
                  </div>

                  {/* Value Content */}
                  <div className="flex-1 min-w-0 space-y-1 pt-1">
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
        </section>

        {/* Cooperative Background & History Section (STRICTLY PRESERVED) */}
        <section className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
              <History className="w-5 h-5" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface dark:text-white">
              Cooperative Background &amp; History
            </h2>
          </div>
          <div className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 space-y-4 leading-relaxed">
            <p>
              Founded to serve the staff, faculty, and cooperative partners of the University of Cebu Maritime Education and Training Center (METC), our multipurpose cooperative has consistently worked to create localized capital opportunities.
            </p>
            <p>
              By offering share capital structures, fixed deposits, and tailored loan products, we serve as the primary financial bridge for our members during periods of career advancement, academic investment, or family transitions.
            </p>
          </div>
        </section>

        {/* Official Technology Partner Section (ORIGINAL COLOR SCHEME PRESERVED) */}
        <section className="p-8 sm:p-10 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl space-y-6 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-primary/15 dark:bg-secondary/15 flex items-center justify-center mx-auto text-primary dark:text-secondary">
            <Award className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-[11px] font-bold tracking-wider uppercase border border-primary/20 dark:border-secondary/20">
              Official Technology Partner
            </span>
            <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface dark:text-white">
              Engineered &amp; Maintained by KADT Solutions
            </h3>
            <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              This Loan Monitoring System and digital ledger infrastructure is designed, engineered, and maintained by <strong>KADT Solutions</strong> in close technical partnership with the <strong>UC-METC Multipurpose Cooperative Board of Directors</strong>.
            </p>
          </div>

          {/* Technical Assurance Chips (Styled in Original Brand Tokens) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-semibold border border-primary/20 dark:border-secondary/20">
              <Lock className="w-3.5 h-3.5" />
              <span>256-Bit Encrypted Ledger</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-semibold border border-primary/20 dark:border-secondary/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Real-Time Amortization Engine</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-semibold border border-primary/20 dark:border-secondary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Dedicated to METC Transparency</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
