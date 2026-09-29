import { Navigate, useLocation } from "react-router-dom";
import { useVendorAuth } from "./VendorAuthContext.jsx";

export default function VendorProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useVendorAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-mist">
        <div className="eyebrow">Loading portal…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
