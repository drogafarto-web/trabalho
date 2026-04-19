import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/lib/use-auth';
import { cn } from '@/lib/cn';
import {
  FileCheck2,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import type { ComponentType } from 'react';

const NAV = [
  { to: '/dashboard',   label: 'Trabalhos',   icon: FileCheck2 },
  { to: '/disciplinas', label: 'Disciplinas', icon: BookOpen },
  { to: '/alunos',      label: 'Alunos',      icon: Users },
  { to: '/relatorios',  label: 'Relatórios',  icon: BarChart3 },
  { to: '/config',      label: 'Configurações', icon: Settings },
] as const;

export function Sidebar() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-border bg-bg-surface">
      {/* Brand */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-text font-display text-sm font-bold text-bg">
          c
        </div>
        <span className="font-display font-semibold tracking-tight">
          controle<span className="text-text-muted">.ia</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map((item) => (
          <NavItem key={item.to} to={item.to} label={item.label} Icon={item.icon} />
        ))}
      </nav>

      {/* Footer — user info + sync status */}
      <div className="border-t border-border p-3">
        <div className="mb-3 flex items-center gap-2 px-2 text-[10px] uppercase tracking-wider text-text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-pill bg-success" />
          </span>
          Sincronizado
        </div>
        <div className="truncate rounded-sm px-2 py-1.5 font-mono text-xs text-text-secondary">
          {email}
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="mt-1 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-text-muted transition-colors hover:bg-bg-surface-hi hover:text-text"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm transition-colors',
          isActive
            ? 'bg-bg-surface-hi text-text'
            : 'text-text-secondary hover:bg-bg-surface-hi hover:text-text',
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}
