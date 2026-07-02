import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery, queryOptions } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Wrench,
  LogOut,
  User,
  Shield,
  MessageSquare,
  BadgeCheck,
  FileSignature,
  UserCog,
  Bell,
  Users,
  ListTree,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/account.functions";
import { getUnreadCount } from "@/lib/notifications.functions";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const unreadQuery = queryOptions({
  queryKey: ["me", "notifications", "unread"],
  queryFn: () => getUnreadCount(),
  refetchInterval: 60_000,
});

type NavItem = { title: string; to: string; icon: React.ComponentType<{ className?: string }> };

function navFor(roles: AppRole[]): { label: string; items: NavItem[] }[] {
  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: "General",
      items: [
        { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { title: "Mi perfil", to: "/mi-perfil", icon: User },
      ],
    },
  ];
  if (roles.includes("cliente")) {
    groups.push({
      label: "Cliente",
      items: [
        { title: "Mis solicitudes", to: "/cliente/solicitudes", icon: FileText },
        { title: "Mensajes", to: "/cliente/mensajes", icon: MessageSquare },
      ],
    });
  }
  if (roles.includes("profesional")) {
    groups.push({
      label: "Profesional",
      items: [
        { title: "Oportunidades", to: "/profesional/oportunidades", icon: Briefcase },
        { title: "Mis cotizaciones", to: "/profesional/cotizaciones", icon: FileSignature },
        { title: "Mensajes", to: "/profesional/mensajes", icon: MessageSquare },
        { title: "Perfil profesional", to: "/profesional/perfil", icon: UserCog },
        { title: "Verificación", to: "/profesional/verificacion", icon: BadgeCheck },
      ],
    });
  }
  if (roles.includes("admin")) {
    groups.push({
      label: "Admin",
      items: [
        { title: "Panel admin", to: "/admin", icon: Shield },
        { title: "Verificaciones", to: "/admin/verificaciones", icon: BadgeCheck },
        { title: "Usuarios", to: "/admin/usuarios", icon: Users },
        { title: "Categorías", to: "/admin/categorias", icon: ListTree },
      ],
    });
  }
  return groups;
}

export function AppShell({
  roles,
  email,
  children,
}: {
  roles: AppRole[];
  email: string | null;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = navFor(roles);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <div className="flex items-center gap-2 px-3 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </span>
              <div className="text-sm font-semibold">Servicios Alanis</div>
            </div>
            {groups.map((g) => (
              <SidebarGroup key={g.label}>
                <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((it) => (
                      <SidebarMenuItem key={it.to}>
                        <SidebarMenuButton asChild isActive={pathname === it.to || pathname.startsWith(it.to + "/")}>
                          <Link to={it.to} className="flex items-center gap-2">
                            <it.icon className="h-4 w-4" />
                            <span>{it.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground truncate">{email}</div>
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher compact />
              <NotificationsBell />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function NotificationsBell() {
  const { data } = useQuery(unreadQuery);
  const count = data?.count ?? 0;
  return (
    <Button asChild variant="ghost" size="sm" className="relative">
      <Link to="/notificaciones">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]">
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Link>
    </Button>
  );
}
