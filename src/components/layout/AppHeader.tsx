import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, LayoutDashboard, LogOut, Settings, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/learning/NotificationBell';
import { useT } from '@/i18n/lang';

export interface Crumb {
  label: string;
  to?: string;
}

// The same header on every signed-in screen: brand (back to the dashboard),
// where you are, notifications and the account menu.
export const AppHeader = ({ crumbs = [] }: { crumbs?: Crumb[] }) => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const roleLabel = userProfile ? (t.roles as Record<string, string>)[userProfile.role] ?? userProfile.role : '';

  return <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link to="/dashboard" className="shrink-0 text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
          DeskControl
        </Link>

        {crumbs.length > 0 && <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1;
              return <Fragment key={`${crumb.label}-${index}`}>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
                  {crumb.to && !last ? (
                    // Earlier crumbs collapse on phones so the current page keeps its space.
                    <Link to={crumb.to} className="hidden truncate text-muted-foreground hover:text-foreground sm:inline">{crumb.label}</Link>
                  ) : (
                    <span className={last ? 'truncate font-medium text-foreground' : 'hidden truncate text-muted-foreground sm:inline'} aria-current={last ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </Fragment>;
            })}
          </nav>}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell />
          {userProfile && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-auto items-center gap-2 px-2 py-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium leading-tight">{userProfile.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{roleLabel}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{userProfile.name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {t.header.dashboard}
                </DropdownMenuItem>
                {userProfile.role === 'admin' && userProfile.status === 'active' && <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/admin')}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t.header.admin}
                  </DropdownMenuItem>}
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t.header.settings}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-status-danger-fg focus:text-status-danger-fg">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t.header.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
        </div>
      </div>
    </header>;
};
