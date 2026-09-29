import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import { usePageviewTracking } from "./hooks/usePageviewTracking.js";
import { AuthProvider } from "./admin/AuthContext.jsx";
import { VendorAuthProvider } from "./vendor-portal/VendorAuthContext.jsx";
import "./index.css";

// Code-split everything admin/dashboard-related (and the dynamic page
// renderer) out of the landing page's bundle — a marketing-site visitor
// should never pay for recharts + the page builder just to load "/".
const DynamicPage = lazy(() => import("./DynamicPage.jsx"));
const NewsList = lazy(() => import("./public/NewsList.jsx"));
const NewsDetail = lazy(() => import("./public/NewsDetail.jsx"));
const EventsList = lazy(() => import("./public/EventsList.jsx"));
const EventDetail = lazy(() => import("./public/EventDetail.jsx"));
const Unsubscribe = lazy(() => import("./public/Unsubscribe.jsx"));

const ProtectedRoute = lazy(() => import("./admin/ProtectedRoute.jsx"));
const LoginPage = lazy(() => import("./admin/LoginPage.jsx"));
const AdminLayout = lazy(() => import("./admin/AdminLayout.jsx"));
const AnalyticsPage = lazy(() => import("./admin/pages/AnalyticsPage.jsx"));
const EnquiriesPage = lazy(() => import("./admin/pages/EnquiriesPage.jsx"));
const MediaPage = lazy(() => import("./admin/pages/MediaPage.jsx"));
const PagesListPage = lazy(() => import("./admin/pages/PagesListPage.jsx"));
const PageBuilderPage = lazy(() => import("./admin/pages/PageBuilderPage.jsx"));
const TasksPage = lazy(() => import("./admin/pages/TasksPage.jsx"));
const TeamPage = lazy(() => import("./admin/pages/TeamPage.jsx"));
const NewsListPage = lazy(() => import("./admin/pages/NewsListPage.jsx"));
const NewsEditorPage = lazy(() => import("./admin/pages/NewsEditorPage.jsx"));
const EventsListPage = lazy(() => import("./admin/pages/EventsListPage.jsx"));
const EventEditorPage = lazy(() => import("./admin/pages/EventEditorPage.jsx"));
const NewsletterPage = lazy(() => import("./admin/pages/NewsletterPage.jsx"));
const VendorsListPage = lazy(() => import("./admin/pages/vendor-platform/VendorsListPage.jsx"));
const AddVendorPage = lazy(() => import("./admin/pages/vendor-platform/AddVendorPage.jsx"));
const VendorProfilePage = lazy(() => import("./admin/pages/vendor-platform/VendorProfilePage.jsx"));
const InvoicesPage = lazy(() => import("./admin/pages/vendor-platform/InvoicesPage.jsx"));
const VendorDocumentsPage = lazy(() => import("./admin/pages/vendor-platform/VendorDocumentsPage.jsx"));
const ServicesPage = lazy(() => import("./admin/pages/vendor-platform/ServicesPage.jsx"));
const AuditLogPage = lazy(() => import("./admin/pages/vendor-platform/AuditLogPage.jsx"));
const VendorSettingsPage = lazy(() => import("./admin/pages/vendor-platform/VendorSettingsPage.jsx"));

const VendorProtectedRoute = lazy(() => import("./vendor-portal/VendorProtectedRoute.jsx"));
const VendorLayout = lazy(() => import("./vendor-portal/VendorLayout.jsx"));
const VendorLoginPage = lazy(() => import("./vendor-portal/VendorLoginPage.jsx"));
const VendorRegisterPage = lazy(() => import("./vendor-portal/VendorRegisterPage.jsx"));
const VendorForgotPasswordPage = lazy(() => import("./vendor-portal/VendorForgotPasswordPage.jsx"));
const VendorResetPasswordPage = lazy(() => import("./vendor-portal/VendorResetPasswordPage.jsx"));
const VendorDashboardPage = lazy(() => import("./vendor-portal/pages/VendorDashboardPage.jsx"));
const VendorInvoicesPage = lazy(() => import("./vendor-portal/pages/VendorInvoicesPage.jsx"));
const VendorPortalDocumentsPage = lazy(() => import("./vendor-portal/pages/VendorDocumentsPage.jsx"));
const VendorPortalProfilePage = lazy(() => import("./vendor-portal/pages/VendorProfilePage.jsx"));
const VendorNotificationsPage = lazy(() => import("./vendor-portal/pages/VendorNotificationsPage.jsx"));

// The vendor portal is served from its own subdomain (vendors.onctionenergy.com)
// rather than a /vendor path on the main site — Caddy routes both hostnames to
// this same frontend container/build, so we branch the route tree here instead
// of shipping (and deploying) a second app.
const IS_VENDOR_SUBDOMAIN = window.location.hostname.startsWith("vendors.");

function MainSiteRoutes() {
  usePageviewTracking();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/news" element={<NewsList />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:slug" element={<EventDetail />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />

        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AnalyticsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="pages" element={<PagesListPage />} />
          <Route path="pages/:id" element={<PageBuilderPage />} />
          <Route path="news" element={<NewsListPage />} />
          <Route path="news/:id" element={<NewsEditorPage />} />
          <Route path="events" element={<EventsListPage />} />
          <Route path="events/:id" element={<EventEditorPage />} />
          <Route path="newsletter" element={<NewsletterPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="vendors" element={<VendorsListPage />} />
          <Route path="vendors/add" element={<AddVendorPage />} />
          <Route path="vendors/:id" element={<VendorProfilePage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="documents" element={<VendorDocumentsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="vendor-settings" element={<VendorSettingsPage />} />
        </Route>

        {/* Catch-all: any other path is a dashboard-built page, e.g. /about */}
        <Route path="/:slug" element={<DynamicPage />} />
      </Routes>
    </Suspense>
  );
}

function VendorPortalRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/register" element={<VendorRegisterPage />} />
        <Route path="/login" element={<VendorLoginPage />} />
        <Route path="/forgot-password" element={<VendorForgotPasswordPage />} />
        <Route path="/reset-password" element={<VendorResetPasswordPage />} />
        <Route
          path="/"
          element={
            <VendorProtectedRoute>
              <VendorLayout />
            </VendorProtectedRoute>
          }
        >
          <Route index element={<VendorDashboardPage />} />
          <Route path="invoices" element={<VendorInvoicesPage />} />
          <Route path="documents" element={<VendorPortalDocumentsPage />} />
          <Route path="profile" element={<VendorPortalProfilePage />} />
          <Route path="notifications" element={<VendorNotificationsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {IS_VENDOR_SUBDOMAIN ? (
        <VendorAuthProvider>
          <VendorPortalRoutes />
        </VendorAuthProvider>
      ) : (
        <AuthProvider>
          <MainSiteRoutes />
        </AuthProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>
);
