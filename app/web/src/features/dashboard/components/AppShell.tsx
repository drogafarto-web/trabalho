import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

/**
 * Layout base do painel do professor: sidebar fixa + área principal.
 * Usado como wrapper de todas as rotas protegidas.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
