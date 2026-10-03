import { useAuth } from "../AuthContext.jsx";

// Mirrors the backend's require_role("Super Admin", "Admin") on vendor-platform
// mutations, so Viewers aren't shown buttons that would only 403.
export function useCanManage() {
  const { admin } = useAuth();
  return admin?.role === "Super Admin" || admin?.role === "Admin";
}
