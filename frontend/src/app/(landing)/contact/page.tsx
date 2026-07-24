'use client';

import React, { useState } from 'react';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // New API Interaction States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: name,
          email: email,
          message_content: message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Something went wrong. Please try again.');
      }

      // Success
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      // Safe type narrow to replace the 'any' linter error
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary">
            Contact Support &amp; Offices
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            Get in touch with the UC-METC Multipurpose Cooperative administration office or report system errors to the support desk.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Contact Information */}
          <div className="space-y-6">
            <h2 className="font-headline text-xl font-bold">Office Information</h2>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              For membership inquiries, loan applications support, or manual share account updates, please drop by or reach out through the official channels:
            </p>

            <div className="space-y-4 font-body text-xs">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold">Physical Address</h4>
                  <p className="text-neutral-600 dark:text-neutral-400">Alumnos Mambaling, Cebu City, Philippines</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold">Contact Number</h4>
                  <p className="text-neutral-600 dark:text-neutral-400">+63 (032) 410-8811 (Local 104)</p>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary dark:text-secondary">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold">Email Address</h4>
                  <p className="text-neutral-600 dark:text-neutral-400">ucmetc.ecc@gmail.com</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-2xl">
              <h4 className="font-headline text-xs font-bold text-primary dark:text-secondary mb-1">System Tech Support</h4>
              <p className="font-body text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                For backend database, ledger discrepancies, or access token issues, please coordinate directly with the IT division at <strong>support@kadtsolutions.dev</strong>.
              </p>
            </div>
          </div>

          {/* Contact Form Connected to Express Backend */}
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl p-6 shadow-sm">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 dark:bg-secondary/15 flex items-center justify-center mx-auto text-primary dark:text-secondary">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-headline font-bold text-base">Message Received</h3>
                <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 max-w-xs mx-auto">
                  Thank you! Your message has been sent to our administrative office staff. We will reply to your email address shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold rounded-full transition-transform active:scale-95 cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h3 className="font-headline text-base font-bold mb-4">Send a Message</h3>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400">Message Content *</label>
                  <textarea
                    required
                    rows={4}
                    disabled={loading}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here (min. 10 characters)..."
                    className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none resize-none font-body disabled:opacity-60"
                  />
                </div>

                {/* Submit button with canonical Tailwind Translate class */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label font-bold rounded-xl shadow hover:-translate-y-px transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}