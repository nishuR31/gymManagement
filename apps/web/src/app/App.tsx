import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { RoleRoute } from "../components/layout/RoleRoute";
import { bootstrapAuthThunk } from "../features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

const operatorRoles = ["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF"] as const;
const adminRoles = ["SUPER_ADMIN", "GYM_OWNER", "ADMIN"] as const;
const memberRoles = ["MEMBER"] as const;

const DashboardLayout = lazy(() => import("../components/layout/DashboardLayout").then((module) => ({ default: module.DashboardLayout })));
const PublicHomePage = lazy(() => import("../pages/PublicHomePage").then((module) => ({ default: module.PublicHomePage })));
const PublicPlansPage = lazy(() => import("../pages/PublicPlansPage").then((module) => ({ default: module.PublicPlansPage })));
const MemberLoginPage = lazy(() => import("../pages/MemberLoginPage").then((module) => ({ default: module.MemberLoginPage })));
const FirstPasswordPage = lazy(() => import("../pages/FirstPasswordPage").then((module) => ({ default: module.FirstPasswordPage })));
const DashboardPage = lazy(() => import("../pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const MembersPage = lazy(() => import("../pages/MembersPage").then((module) => ({ default: module.MembersPage })));
const MembershipsPage = lazy(() => import("../pages/MembershipsPage").then((module) => ({ default: module.MembershipsPage })));
const PaymentsPage = lazy(() => import("../pages/PaymentsPage").then((module) => ({ default: module.PaymentsPage })));
const InventoryPage = lazy(() => import("../pages/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const ProductsPage = lazy(() => import("../pages/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const OrdersPage = lazy(() => import("../pages/OrdersPage").then((module) => ({ default: module.OrdersPage })));
const MemberAccountPage = lazy(() => import("../pages/MemberAccountPage").then((module) => ({ default: module.MemberAccountPage })));
const StaffPage = lazy(() => import("../pages/StaffPage").then((module) => ({ default: module.StaffPage })));
const PlansPage = lazy(() => import("../pages/PlansPage").then((module) => ({ default: module.PlansPage })));
const ReportsPage = lazy(() => import("../pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const ActivityLogsPage = lazy(() => import("../pages/ActivityLogsPage").then((module) => ({ default: module.ActivityLogsPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const InquiriesPage = lazy(() => import("../pages/InquiriesPage").then((module) => ({ default: module.InquiriesPage })));
const PlaceholderPage = lazy(() => import("../pages/PlaceholderPage").then((module) => ({ default: module.PlaceholderPage })));

export function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status === "idle") {
      void dispatch(bootstrapAuthThunk());
    }
  }, [dispatch, status]);

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/plans" element={<PublicPlansPage />} />
        <Route path="/member-login" element={<MemberLoginPage />} />
        <Route path="/member/first-password" element={<FirstPasswordPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route element={<RoleRoute allowedRoles={operatorRoles} />}>
              <Route path="members" element={<MembersPage />} />
              <Route path="memberships" element={<MembershipsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="activity-logs" element={<ActivityLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={adminRoles} />}>
              <Route path="inquiries" element={<InquiriesPage />} />
            </Route>
            <Route element={<RoleRoute allowedRoles={memberRoles} />}>
              <Route path="my-orders" element={<OrdersPage />} />
              <Route path="my-membership" element={<MemberAccountPage mode="membership" />} />
              <Route path="my-plans" element={<MemberAccountPage mode="plans" />} />
              <Route path="my-payments" element={<MemberAccountPage mode="payments" />} />
              <Route path="profile" element={<MemberAccountPage mode="profile" />} />
            </Route>
            <Route path=":section" element={<PlaceholderPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function RouteLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-backdrop px-6 text-center">
      <div className="grid justify-items-center gap-3 animate-fade-in">
        <div className="h-12 w-12 animate-pulse rounded-full border border-brand/40 bg-brand/15 shadow-soft" />
        <p className="text-sm font-bold text-ink-muted">Loading workspace</p>
      </div>
    </div>
  );
}
