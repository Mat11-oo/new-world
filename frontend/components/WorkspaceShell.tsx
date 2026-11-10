'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Images,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { brand } from '@/config/brand';
import BrandMark from '@/components/BrandMark';
import { fetchSessions } from '@/lib/workflowApi';
import { activityLabel, sessionActivity, sessionTitle } from '@/lib/sessionSummary';

const SIDEBAR_KEY = `${brand.storagePrefix}.workbench-sidebar`;

const MAIN_NAV = [
  { href: '/workbench', label: '工作台', icon: LayoutDashboard },
  { href: '/workbench#composer', label: '新建创作', icon: Plus, badge: 'NEW' },
  { href: '/projects', label: '作品', icon: FolderOpen },
  { href: '/inspiration', label: '灵感库', icon: Images },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/workbench') return pathname === '/workbench';
  if (href === '/projects') return pathname === '/projects' || pathname.startsWith('/workspace');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const isEditor = pathname.startsWith('/workspace');

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_KEY) === 'collapsed') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingSessions(true);
    fetchSessions()
      .then(list => {
        if (!cancelled) setSessions(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    setCollapsed(current => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sidebarSessions = sessions.slice(0, 5);

  return (
    <div className={clsx('nw-wb', collapsed && 'is-collapsed', mobileOpen && 'is-mobile-open', isEditor && 'is-editor')}>
      {mobileOpen && (
        <button
          type="button"
          className="nw-wb-scrim"
          aria-label="关闭菜单"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="nw-wb-sidebar" aria-label="工作台导航">
        <div className="nw-wb-brand">
          <Link href="/workbench" className="nw-wb-brand-link" aria-label={`${brand.name} 工作台`}>
            <BrandMark className="nw-wb-brand-mark" />
            <span className="nw-wb-brand-name">{brand.name}</span>
          </Link>
          <button
            type="button"
            className="nw-wb-collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="nw-wb-close"
            onClick={() => setMobileOpen(false)}
            aria-label="关闭菜单"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="nw-wb-sidebar-scroll">
          <nav className="nw-wb-nav" aria-label="主要导航">
            {MAIN_NAV.map(item => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx('nw-wb-nav-item', active && 'is-active')}
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="nw-wb-nav-icon" aria-hidden="true" />
                  <span className="nw-wb-nav-label">{item.label}</span>
                  {item.badge && <em className="nw-wb-new">{item.badge}</em>}
                </Link>
              );
            })}
          </nav>

          <div className="nw-wb-group nw-wb-sessions-group">
            <div className="nw-wb-group-head">
              <span>生成会话</span>
              <Link href="/projects" className="nw-wb-group-link">全部</Link>
            </div>
            {loadingSessions ? (
              <div className="nw-wb-skeletons" aria-hidden="true">
                {[0, 1, 2].map(index => (
                  <span key={index} className="nw-wb-skeleton">
                    <i />
                    <b />
                  </span>
                ))}
              </div>
            ) : sidebarSessions.length ? (
              <div className="nw-wb-sessions">
                {sidebarSessions.map(session => {
                  const activity = sessionActivity(session);
                  return (
                    <Link
                      key={session.id}
                      href={`/workspace?session=${encodeURIComponent(session.id)}`}
                      className="nw-wb-session"
                      title={sessionTitle(session)}
                    >
                      <span className={clsx('nw-wb-dot', `is-${activity}`)} aria-hidden="true" />
                      <span className="nw-wb-session-main">
                        <span className="nw-wb-session-title">{sessionTitle(session)}</span>
                        <em>{activityLabel(activity)}</em>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="nw-wb-session-empty">还没有生成会话</p>
            )}
          </div>
        </div>

        <div className="nw-wb-sidebar-foot">
          <Link
            href="/settings"
            className={clsx('nw-wb-nav-item', pathname.startsWith('/settings') && 'is-active')}
            title="设置"
          >
            <Settings className="nw-wb-nav-icon" aria-hidden="true" />
            <span className="nw-wb-nav-label">设置</span>
          </Link>
        </div>
      </aside>

      <div className={clsx('nw-wb-main', isEditor && 'is-editor')}>
        <div className="nw-wb-mobilebar">
          <button type="button" className="nw-wb-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="打开菜单">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/workbench" className="nw-wb-mobile-brand">
            <BrandMark className="h-6 w-6" />
            <span>{brand.name}</span>
          </Link>
          <Link href="/workbench#composer" className="nw-wb-mobile-new" aria-label="新建创作">
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        {isEditor ? (
          <div className="nw-wb-editor">{children}</div>
        ) : (
          <div className={`nw-wb-content${pathname === '/workbench' ? ' is-workbench' : ''}`}>{children}</div>
        )}
      </div>
    </div>
  );
}
