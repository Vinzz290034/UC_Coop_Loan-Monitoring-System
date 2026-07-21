'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import CountdownTimer from '@/components/CountdownTimer';
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

  return (
    <div className="h-screen flex bg-background dark:bg-background transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside
        className={`h-screen bg-white dark:bg-surface-container-low border-r border-outline-variant/65 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Brand Banner */}
        <div className="h-20 border-b border-outline-variant/50 flex items-center justify-between px-6">
          {!sidebarCollapsed && (
            <div className="font-brandname font-bold text-lg text-primary dark:text-secondary flex items-center gap-1">
              <img src="/SynCo_logo.png" alt="SynCo Logo" className="w-10 h-5 object-contain" />
              SynCo
            </div>
          )}
          {sidebarCollapsed && (
            <img src="/SynCo_logo.png" alt="SynCo Logo" className="w-6 h-6 object-contain mx-auto" />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded bg-surface hover:bg-neutral/10 dark:hover:bg-neutral/20 border border-outline-variant/50 hidden md:block text-neutral-600 dark:text-neutral-400"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User Summary profile card — clickable, navigates to profile */}
        <div className="p-4 border-b border-outline-variant/40">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-full flex items-center gap-3 bg-surface-container-low dark:bg-surface-container-high/60 p-2.5 rounded-2xl hover:bg-primary/5 dark:hover:bg-secondary/5 transition-colors cursor-pointer text-left"
            title="View Profile"
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
            {!sidebarCollapsed && (
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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems
            .filter((item) => item.allowed)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive
                    ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 dark:hover:bg-neutral/10 hover:text-on-surface dark:hover:text-white'
                    }`}
                  title={item.name}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="font-body">{item.name}</span>}
                </Link>
              );
            })}
        </nav>

        {/* Bottom Section: Settings + Log Out */}
        <div className="p-4 border-t border-outline-variant/40 space-y-1">
          {/* Settings Link */}
          <Link
            href="/dashboard/settings"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === '/dashboard/settings'
                ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 dark:hover:bg-neutral/10'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-body">Settings</span>}
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-600 dark:text-neutral-400 hover:bg-tertiary/10 hover:text-tertiary rounded-xl text-sm font-semibold transition-colors active:scale-95"
            title="Log Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-body">Log Out</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="pt-2 text-center text-[10px] text-neutral-500 dark:text-neutral-400 font-bold border-t border-outline-variant/20 flex items-center justify-center gap-1.5 select-none">
              <Cpu className="w-3.5 h-3.5 text-primary dark:text-secondary animate-pulse" />
              <span>By KADT Solutions</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-20 bg-white dark:bg-surface-container-low border-b border-outline-variant/65 flex items-center justify-between px-6 py-6 md:px-8 z-30">
          <div className="flex items-center gap-3">
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white capitalize">
              {pathname === '/dashboard'
                ? 'System Dashboard'
                : pathname
                  .split('/')
                  .slice(2)
                  .map((segment) => breadcrumbLabels[segment] || segment)
                  .join(' / ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Session countdown timer - updated to 900 seconds (15 minutes) */}
            <CountdownTimer initialSeconds={900} onComplete={logout} />

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

            <NotificationBell />

            <ThemeToggle />
          </div>
        </header>

        {/* Page contents */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
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

