import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import { usePageviewTracking } from "./hooks/usePageviewTracking.js";
import { AuthProvider } from "./admin/AuthContext.jsx";
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

function AppRoutes() {
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
        </Route>

        {/* Catch-all: any other path is a dashboard-built page, e.g. /about */}
        <Route path="/:slug" element={<DynamicPage />} />
      </Routes>
    </Suspense>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
