'use client';

import { usePathname } from 'next/navigation';
import WorkspaceShell from './WorkspaceShell';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEntry = pathname === '/';

  return (
    <div className="sfa-shell" data-entry={isEntry ? 'true' : 'false'}>
      {isEntry ? (
        <main className="sfa-main sfa-main-entry">{children}</main>
      ) : (
        <main className="sfa-main sfa-main-app">
          <WorkspaceShell>{children}</WorkspaceShell>
        </main>
      )}
    </div>
  );
}
