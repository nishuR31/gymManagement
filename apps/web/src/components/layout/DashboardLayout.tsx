import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { APP_NAME } from "../../utils/env";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PackageSearch,
  Settings,
  ShieldCheck,
  Users,
  UserRound,
  WalletCards
} from "lucide-react";
import { toast } from "sonner";
import { logoutThunk } from "../../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { isAdminRole } from "../../utils/roles";
import { Button } from "../ui/Button";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  memberAllowed?: boolean;
  memberOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, memberAllowed: true },
  { label: "My Membership", to: "/dashboard/my-membership", icon: WalletCards, memberAllowed: true, memberOnly: true },
  { label: "Training Plans", to: "/dashboard/my-plans", icon: Dumbbell, memberAllowed: true, memberOnly: true },
  { label: "Products", to: "/dashboard/products", icon: PackageSearch, memberAllowed: true },
  { label: "My Orders", to: "/dashboard/my-orders", icon: ClipboardList, memberAllowed: true, memberOnly: true },
  { label: "My Payments", to: "/dashboard/my-payments", icon: CreditCard, memberAllowed: true, memberOnly: true },
  { label: "Profile", to: "/dashboard/profile", icon: UserRound, memberAllowed: true },
  { label: "Members", to: "/dashboard/members", icon: Users },
  { label: "Memberships", to: "/dashboard/memberships", icon: WalletCards },
  { label: "Attendance", to: "/dashboard/attendance", icon: Activity },
  { label: "Payments Received", to: "/dashboard/payments", icon: CreditCard },
  { label: "Orders", to: "/dashboard/orders", icon: ClipboardList },
  { label: "Inventory", to: "/dashboard/inventory", icon: Boxes },
  { label: "Staff", to: "/dashboard/staff", icon: ShieldCheck },
  { label: "Plans", to: "/dashboard/plans", icon: Dumbbell },
  { label: "Reports", to: "/dashboard/reports", icon: BarChart3 },
  { label: "Notifications", to: "/dashboard/notifications", icon: Bell },
  { label: "Activity Logs", to: "/dashboard/activity-logs", icon: ClipboardList },
  { label: "Settings", to: "/dashboard/settings", icon: Settings },
  { label: "Inquiries", to: "/dashboard/inquiries", icon: MessageSquare, adminOnly: true }
];

const navGroups = [
  {
    label: "Operate",
    items: navItems.slice(0, 13)
  },
  {
    label: "Analyze",
    items: navItems.slice(13, 17)
  },
  {
    label: "System",
    items: navItems.slice(17)
  }
];

const memberNavGroups = [
  {
    label: "Member",
    items: navItems.filter((item) => item.memberAllowed === true)
  }
];

export function DashboardLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isMember = user?.role === "MEMBER";
  const visibleNavItems = navItems.filter((item) => {
    if (isMember) {
      return item.memberAllowed === true;
    }
    if (item.memberOnly) {
      return false;
    }
    return !item.adminOnly || isAdminRole(user?.role);
  });

  if (isMember && !visibleNavItems.some((item) => location.pathname === item.to)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = async (): Promise<void> => {
    await dispatch(logoutThunk());
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen text-foreground">
      <aside className="layout-sidebar">
        <div className="shrink-0 px-4 pt-5">
        <Link to="/" className="block rounded-lg border border-border bg-card/80 p-4 transition hover:border-primary focus-visible:focus-ring" aria-label="Go to home page">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{APP_NAME}</p>
              <h1 className="mt-1 truncate text-lg font-black">Command Center</h1>
            </div>
          </div>
          <div className="mt-4 h-px bg-line" />
          <p className="mt-4 text-xs font-semibold leading-5 text-muted-foreground">Single-gym operations across members, revenue, inventory, coaching, and reporting.</p>
        </Link>
        </div>
        <nav className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4">
            {(isMember ? memberNavGroups : navGroups).map((group) => {
              const items = group.items.filter((item) => visibleNavItems.includes(item));
              if (items.length === 0) {
                return null;
              }
              return (
                <div key={group.label} className="grid gap-1.5">
                  <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                  {items.map((item) => (
                    <SidebarLink key={item.to} item={item} />
                  ))}
                </div>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border p-4">
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Signed in</p>
            <p className="mt-1 truncate text-sm font-bold text-foreground">{user ? `${user.firstName} ${user.lastName}` : "Workspace user"}</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="layout-dashboard-header">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/" className="grid h-10 w-10 place-items-center rounded-md border border-border bg-background transition hover:border-primary focus-visible:focus-ring lg:hidden" aria-label="Go to home page">
                <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
              </Link>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{user?.role.replace("_", " ")}</p>
                <p className="text-base font-black">{user ? `${user.firstName} ${user.lastName}` : "Signed in"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/settings" className="p-2 text-muted-foreground hover:text-primary transition rounded-md focus-visible:focus-ring" aria-label="Settings" title="Theming & Cache Settings">
                <Settings className="h-5 w-5 transition-transform duration-500 ease-in-out hover:rotate-180" />
              </Link>
              <Button variant="secondary" onClick={() => void handleLogout()}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </div>
          <nav className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
            {visibleNavItems.map((item) => (
              <MobileLink key={item.to} item={item} />
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1600px] min-w-0 overflow-x-hidden px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/dashboard"}
      className={({ isActive }) =>
        `group flex h-10 min-w-0 items-center gap-3 rounded-md px-3 text-sm font-bold transition duration-200 focus-visible:focus-ring ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-card/85 hover:text-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{item.label}</span>
    </NavLink>
  );
}

function MobileLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/dashboard"}
      title={item.label}
      aria-label={item.label}
      className={({ isActive }) =>
        `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-bold transition focus-visible:focus-ring ${
          isActive ? "border-primary bg-primary px-3 text-primary-foreground" : "w-10 border-border bg-background px-0 text-muted-foreground hover:border-primary hover:text-foreground"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className={`max-w-28 truncate ${isActive ? "inline" : "hidden"}`}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
