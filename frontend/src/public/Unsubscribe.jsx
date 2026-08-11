import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | done | error

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`${API_BASE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <>
      <Header />
      <main className="wrap flex min-h-[50vh] flex-col items-center justify-center text-center">
        {status === "loading" && <p className="text-sm text-slatey">Unsubscribing…</p>}
        {status === "done" && (
          <>
            <h1 className="font-syne text-2xl font-semibold text-ink">You've been unsubscribed</h1>
            <p className="mt-2 text-sm text-slatey">You won't receive any more newsletter emails from us.</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="font-syne text-2xl font-semibold text-ink">Something went wrong</h1>
            <p className="mt-2 text-sm text-slatey">That unsubscribe link looks invalid or expired.</p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
