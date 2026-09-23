'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Headphones,
  User,
  Building2,
} from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // API Interaction States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/contact', {
        full_name: name,
        email: email,
        message_content: message,
      });

      // Success
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12">
        {/* Header Section */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 shadow-xs">
            <Headphones className="w-3.5 h-3.5" />
            <span>Coop Helpdesk &amp; Services</span>
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary dark:text-secondary tracking-tight">
            Contact Support &amp; Offices
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Get in touch with the UC-METC Multipurpose Cooperative administration office or report system discrepancies directly to the technical team.
          </p>
        </header>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Office Details & Campus Channels */}
          <div className="lg:col-span-6 space-y-5">
            {/* Section Context Header */}
            <div className="space-y-1.5">
              <span className="font-headline text-xs font-bold text-primary dark:text-secondary uppercase tracking-wider block">
                Campus Branch &amp; Secretariat
              </span>
              <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">
                Office Information
              </h2>
              <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                For membership inquiries, loan schedule verifications, or manual share capital updates, visit our administrative headquarters or reach out via official lines.
              </p>
            </div>

            {/* Contact Cards Grid */}
            <div className="space-y-4">
              {/* Physical Address Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-headline text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                      Physical Address
                    </span>
                    <p className="font-headline text-base font-bold text-on-surface dark:text-white">
                      Alumnos Mambaling, Cebu City
                    </p>
                    <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                      6000 Cebu, Philippines
                    </p>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-outline-variant/30 flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-body">
                  <Clock className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />
                  <span>Monday – Friday • 8:00 AM – 4:00 PM</span>
                </div>
              </div>

              {/* Two-column sub-cards: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Contact Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                        Telephone Inquiries
                      </span>
                      <a
                        href="tel:+630324108811"
                        className="font-headline text-sm font-bold text-primary dark:text-secondary hover:underline block leading-snug mt-0.5"
                      >
                        +63 (032) 410-8811
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                        Official Dispatch
                      </span>
                      <a
                        href="mailto:ucmetc.ecc@gmail.com"
                        className="font-headline text-sm font-bold text-primary dark:text-secondary hover:underline leading-snug mt-0.5"
                        title="ucmetc.ecc@gmail.com"
                      >
                        ucmetc.ecc@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Walk-in Desk Banner */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-headline text-sm font-bold text-on-surface dark:text-white block">
                    Walk-in Member Counter
                  </span>
                  <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    UC-METC Coop Office • Open: 9:00 AM – 4:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-6">
            <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm">
              {submitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/15 dark:bg-secondary/15 flex items-center justify-center mx-auto text-primary dark:text-secondary">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-primary dark:text-secondary">
                    Inquiry Dispatched Successfully
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                    Thank you for contacting UC-METC MPC. Your message has been logged to the coordinator desk. We will reply to your email address shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-2 px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold rounded-full transition-transform active:scale-95 cursor-pointer shadow-sm hover:opacity-95"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                    <div>
                      <h3 className="font-headline text-lg sm:text-xl font-bold text-on-surface dark:text-white">
                        Send a Message
                      </h3>
                      <p className="font-body text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Messages will be   forwarded to the dedicated desk coordinator.
                      </p>
                    </div>
                    <span className="font-headline text-[11px] text-primary dark:text-secondary font-semibold bg-primary/10 dark:bg-secondary/10 px-2.5 py-1 rounded-full shrink-0">
                      * Required Fields
                    </span>
                  </div>

                  {/* Error Banner */}
                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl leading-relaxed text-xs"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Full Name Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="contact-name" className="font-headline text-xs font-semibold text-on-surface dark:text-white flex items-center justify-between">
                      <span>Your Full Name <span className="text-primary dark:text-secondary">*</span></span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 w-4 h-4 pointer-events-none" />
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        disabled={loading}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Captain Juan Dela Cruz"
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/70 border border-outline-variant/60 rounded-xl font-body text-xs text-on-surface dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-primary/40 dark:focus:ring-secondary/40 outline-none disabled:opacity-60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Address Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="contact-email" className="font-headline text-xs font-semibold text-on-surface dark:text-white flex items-center justify-between">
                      <span>Email Address <span className="text-primary dark:text-secondary">*</span></span>
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 text-neutral-400 dark:text-neutral-500 w-4 h-4 pointer-events-none" />
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        disabled={loading}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. j.delacruz@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/70 border border-outline-variant/60 rounded-xl font-body text-xs text-on-surface dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-primary/40 dark:focus:ring-secondary/40 outline-none disabled:opacity-60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Message Content Field with Dynamic Counter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="contact-message" className="font-headline text-xs font-semibold text-on-surface dark:text-white">
                        Message Content <span className="text-primary dark:text-secondary">*</span>
                      </label>
                      <span className={`font-body text-[11px] ${message.length >= 480 ? 'text-red-500 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {message.length} / 500 characters
                      </span>
                    </div>
                    <div className="relative">
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        maxLength={500}
                        rows={4}
                        disabled={loading}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Write your message here (min. 10 characters). Please provide your member account number if referencing an active ledger..."
                        className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-800/70 border border-outline-variant/60 rounded-xl font-body text-xs text-on-surface dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:bg-white dark:focus:bg-neutral-800 focus:ring-2 focus:ring-primary/40 dark:focus:ring-secondary/40 outline-none resize-none disabled:opacity-60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-headline font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:-translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:pointer-events-none group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>

                  {/* Turnaround reassurance footer */}
                  <div className="flex items-center justify-center gap-1.5 text-neutral-500 dark:text-neutral-400 pt-1 text-center font-body text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />
                    <span>Average office response time: Within 24–48 business hours</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}