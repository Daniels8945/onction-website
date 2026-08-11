import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .get("/api/enquiries")
      .then(setEnquiries)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Enquiries</h1>
      <p className="mb-6 text-sm text-slatey">Submissions from the website's contact form, newest first.</p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!enquiries && !error && <p className="text-sm text-slatey">Loading…</p>}

      {enquiries && enquiries.length === 0 && (
        <div className="card text-sm text-slatey">No enquiries yet.</div>
      )}

      {enquiries && enquiries.length > 0 && (
        <div className="overflow-x-auto border border-black/5 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-950 text-white">
              <tr>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Company / Country</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => (
                <tr key={e.id} className="border-t border-black/5 align-top hover:bg-mist">
                  <td className="whitespace-nowrap px-4 py-3 text-slatey">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{e.full_name}</td>
                  <td className="px-4 py-3 text-slatey">
                    <div>{e.email}</div>
                    <div>{e.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slatey">
                    <div>{e.company || "—"}</div>
                    <div>{e.country || "—"}</div>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-slatey">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
