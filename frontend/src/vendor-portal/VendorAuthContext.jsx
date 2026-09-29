import { createContext, useContext, useEffect, useState } from "react";
import { vendorApi, getToken, setToken } from "./lib/vendorApi.js";

const VendorAuthContext = createContext(null);

export function VendorAuthProvider({ children }) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return vendorApi.get("/api/vendor-platform/auth/me").then(setVendor);
  }

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refresh()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(vendor_code, password) {
    const res = await vendorApi.post("/api/vendor-platform/auth/login", { vendor_code, password: password || undefined });
    setToken(res.access_token);
    setVendor(res.vendor);
    return res.vendor;
  }

  function logout() {
    setToken(null);
    setVendor(null);
  }

  return (
    <VendorAuthContext.Provider value={{ vendor, loading, login, logout, refresh, isAuthenticated: !!vendor }}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useVendorAuth() {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error("useVendorAuth must be used within VendorAuthProvider");
  return ctx;
}
