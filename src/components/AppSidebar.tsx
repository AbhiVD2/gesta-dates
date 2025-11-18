import { Home, Users, Calendar, FileText, Settings, User, CalendarClock } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const { userRole } = useAuth();

  const patientItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Scans', url: '/scans', icon: Calendar },
    { title: 'Profile', url: '/profile', icon: User },
  ];

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Patients', url: '/patients', icon: Users },
    { title: 'Scans', url: '/scans', icon: Calendar },
    { title: 'Reschedule', url: '/reschedule', icon: CalendarClock },
    { title: 'Reports', url: '/reports', icon: FileText },
    { title: 'Profile', url: '/profile', icon: User },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const menuItems = userRole === 'patient' ? patientItems : adminItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
