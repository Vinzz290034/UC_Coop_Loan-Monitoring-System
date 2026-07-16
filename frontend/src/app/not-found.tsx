'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BackButton from '@/components/BackButton';

export default function NotFound() {
  return (
    <div className="bg-background dark:bg-background text-on-surface min-h-screen flex items-center justify-center font-sans p-6 transition-colors">
      <header className="absolute top-6 right-6">
        <ThemeToggle />
      </header>
      
      <main className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-tertiary/10 text-tertiary flex items-center justify-center mx-auto border border-tertiary/20 animate-bounce">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary dark:text-secondary">404</h1>
          <h2 className="font-headline text-xl font-bold text-on-surface dark:text-white">Secure Asset Not Found</h2>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            The resource you requested either does not exist or is protected under deep security access clearance.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <BackButton className="w-full sm:w-auto">Go Back</BackButton>
          
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <Home className="w-4 h-4" /> Portals Home
          </Link>
        </div>
      </main>
    </div>
  );
}
