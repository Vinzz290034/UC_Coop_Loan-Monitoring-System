'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Banknote,
  WalletCards,
  CalendarCheck,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  Building2,
  Calendar,
  Cpu,
  UserCog,
  ScrollText,
  MessageSquare,
  Bell,
  Settings,
  Menu,
  X,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NotificationBell from '@/components/NotificationBell';
import { AuthProvider } from '@/context/AuthContext';
import { BreadcrumbProvider, useBreadcrumb } from '@/context/BreadcrumbContext';

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { breadcrumbLabels } = useBreadcrumb();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile sidebar open state — off-canvas overlay on screens < md
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  // Close mobile sidebar on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [mobileSidebarOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!user) {
    return null;
  }

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return null;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}${path}`;
  };

  // Navigation Links based on role
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

  const menuItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      name: 'Calendar',
      path: '/dashboard/calendar',
      icon: Calendar,
      allowed: true,
    },
    {
      name: 'Members',
      path: '/dashboard/members',
      icon: Users,
      allowed: isAdminOrManager,
    },
    {
      name: 'Loans',
      path: '/dashboard/loans',
      icon: Banknote,
      allowed: true,
    },
    {
      name: 'Capital Accounts',
      path: '/dashboard/accounting',
      icon: WalletCards,
      allowed: true,
    },
    {
      name: 'Billings',
      path: '/dashboard/billing',
      icon: CalendarCheck,
      allowed: isAdminOrManager,
    },
    {
      name: 'Reports',
      path: '/dashboard/reports',
      icon: BarChart3,
      allowed: isAdminOrManager,
    },
    {
      name: 'Messages',
      path: '/dashboard/messages',
      icon: MessageSquare,
      allowed: isAdminOrManager,
    },
    {
      name: 'Notifications',
      path: '/dashboard/notifications',
      icon: Bell,
      allowed: true,
    },
    {
      name: 'Users',
      path: '/dashboard/users',
      icon: UserCog,
      allowed: user.role === 'admin',
    },
    {
      name: 'Audit Trail',
      path: '/dashboard/audit',
      icon: ScrollText,
      allowed: user.role === 'admin',
    },
  ];

  /* Shared sidebar content — rendered identically in both desktop sidebar and mobile drawer */
  const isCollapsed = sidebarCollapsed && !mobileSidebarOpen;

  const sidebarContent = (
    <>
      {/* Brand Banner */}
      <div className={`h-20 border-b border-outline-variant/50 flex items-center justify-between flex-shrink-0 ${isCollapsed ? 'px-3' : 'px-6'
        }`}>
        {/* Brand Logo & Name */}
        {(!sidebarCollapsed || mobileSidebarOpen) ? (
          <div className="font-brandname font-bold text-lg text-primary dark:text-secondary flex items-center gap-1.5">
            <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" className="w-9 h-6 object-contain" />
            <span>Coop Sync</span>
          </div>
        ) : (
          <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" className="w-7 h-7 object-contain mx-auto" />
        )}

        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1 rounded bg-surface hover:bg-neutral/10 dark:hover:bg-neutral/20 border border-outline-variant/50 hidden md:flex items-center justify-center text-neutral-600 dark:text-neutral-400 transition-colors cursor-pointer"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile close button — visible only on mobile sidebar */}
        {mobileSidebarOpen && (
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User Summary profile card — clickable, navigates to profile */}
      <div className={`border-b border-outline-variant/40 flex-shrink-0 ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        <button
          onClick={() => router.push('/dashboard/profile')}
          className={`flex items-center transition-all cursor-pointer ${isCollapsed
              ? 'w-11 h-11 justify-center rounded-xl bg-surface-container-low dark:bg-surface-container-high/60 hover:bg-primary/10 dark:hover:bg-secondary/10'
              : 'w-full gap-3 bg-surface-container-low dark:bg-surface-container-high/60 p-2.5 rounded-2xl hover:bg-primary/5 dark:hover:bg-secondary/5 text-left'
            }`}
          title={user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.username}
          aria-label="View user profile"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary/20 dark:bg-secondary/20 flex items-center justify-center text-primary dark:text-secondary">
            {user.profile_picture_url ? (
              <img
                src={getAvatarUrl(user.profile_picture_url) || ''}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h4 className="font-headline text-xs font-bold text-on-surface dark:text-white truncate">
                {user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.username}
              </h4>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-secondary" />
                <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 truncate">
                  {user.role}
                </span>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Menu List */}
      <nav className={`flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuItems
          .filter((item) => item.allowed)
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                prefetch={false}
                className={`flex items-center transition-all ${isCollapsed
                    ? `w-11 h-11 mx-auto justify-center rounded-xl ${isActive
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral/10 dark:hover:bg-neutral/20 hover:text-on-surface dark:hover:text-white'
                    }`
                    : `gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 dark:hover:bg-neutral/10 hover:text-on-surface dark:hover:text-white'
                    }`
                  }`}
                title={item.name}
                aria-label={item.name}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-body text-sm font-semibold">{item.name}</span>}
              </Link>
            );
          })}
      </nav>

      {/* Bottom Section: Settings + Log Out */}
      <div className={`border-t border-outline-variant/40 space-y-1.5 flex-shrink-0 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {/* Settings Link */}
        <Link
          href="/dashboard/settings"
          prefetch={false}
          className={`flex items-center transition-all ${isCollapsed
              ? `w-11 h-11 mx-auto justify-center rounded-xl ${pathname === '/dashboard/settings'
                ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral/10 dark:hover:bg-neutral/20'
              }`
              : `w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${pathname === '/dashboard/settings'
                ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 dark:hover:bg-neutral/10'
              }`
            }`}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-body text-sm font-semibold">Settings</span>}
        </Link>

        {/* Log Out Button */}
        <button
          onClick={logout}
          className={`flex items-center transition-all cursor-pointer ${isCollapsed
              ? 'w-11 h-11 mx-auto justify-center rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-tertiary/10 hover:text-tertiary active:scale-95'
              : 'w-full gap-3 px-3 py-2.5 text-neutral-600 dark:text-neutral-400 hover:bg-tertiary/10 hover:text-tertiary rounded-xl text-sm font-semibold active:scale-95'
            }`}
          title="Log Out"
          aria-label="Log Out"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-body text-sm font-semibold">Log Out</span>}
        </button>

        {!isCollapsed && (
          <div className="pt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400 font-bold border-t border-outline-variant/20 flex items-center justify-center gap-1.5 select-none">
            <Cpu className="w-3.5 h-3.5 text-primary dark:text-secondary animate-pulse" />
            <span>By KADT Solutions</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen flex bg-background dark:bg-background transition-colors duration-200">

      {/* ─── Mobile Sidebar Overlay (< md) ─── */}
      {/* Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-modal-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-surface-container-low border-r border-outline-variant/65 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        aria-label="Mobile navigation"
      >
        {sidebarContent}
      </aside>

      {/* ─── Desktop Sidebar (≥ md) ─── */}
      <aside
        className={`hidden md:flex h-screen bg-white dark:bg-surface-container-low border-r border-outline-variant/65 flex-col overflow-x-hidden transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        aria-label="Desktop navigation"
      >
        {sidebarContent}
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white dark:bg-surface-container-low border-b border-outline-variant/65 flex items-center justify-between px-4 sm:px-6 md:px-8 z-30 flex-shrink-0">
          {/* Left Section: Hamburger + Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger — visible only on < md */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white capitalize truncate">
              {pathname === '/dashboard'
                ? 'System Dashboard'
                : pathname
                  .split('/')
                  .slice(2)
                  .map((segment) => breadcrumbLabels[segment] || segment)
                  .join(' / ')}
            </h2>
          </div>

          {/* Right Action Control Bar */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Live Date Badge — hidden on small screens */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral/5 dark:bg-neutral/10 border border-outline-variant/30 text-xs text-neutral-600 dark:text-neutral-300">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-mono font-semibold">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle */}
            <ThemeToggle />
          </div>
        </header>

        {/* Page contents */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </BreadcrumbProvider>
    </AuthProvider>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary dark:border-secondary/20 dark:border-t-secondary animate-spin"></div>
          <p className="font-body text-xs font-semibold text-neutral-600 dark:text-neutral-300">Loading...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
