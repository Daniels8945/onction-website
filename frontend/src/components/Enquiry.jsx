import { useState } from "react";
import { countries, company } from "../data/content.js";
import { submitEnquiry } from "../api.js";
import Reveal from "./Reveal.jsx";
import { Arrow, Phone, Pin, Mail } from "./icons.jsx";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  country: "",
  message: "",
};

export default function Enquiry() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.full_name.trim() &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.phone.trim() &&
    form.message.trim();

  async function onSubmit() {
    if (!valid || status === "loading") return;
    setStatus("loading");
    setError("");
    try {
      await submitEnquiry(form);
      setStatus("success");
      setForm(EMPTY);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Could not send your message. Please try again.");
    }
  }

  return (
    <section id="enquire" className="scroll-mt-20 bg-white">
      <div className="wrap grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.15fr]">
        {/* contact rail */}
        <Reveal>
          <p className="eyebrow mb-3">Enquire now</p>
          <h2 className="text-3xl font-semibold leading-tight text-navy-900 sm:text-4xl">
            Want to partner to build a sustainable energy sector?
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-slatey">
            Tell us about your generation, offtake or trading needs and our desk will get back to you.
          </p>

          <div className="mt-10 space-y-6">
            <a
              href={`tel:${company.phoneHref}`}
              className="flex items-center gap-4 text-navy-900 hover:text-teal-600"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mist text-teal-600">
                <Phone width={20} height={20} />
              </span>
              <span className="font-medium">{company.phone}</span>
            </a>
            <a
              href={`mailto:${company.email}`}
              className="flex items-center gap-4 text-navy-900 hover:text-teal-600"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mist text-teal-600">
                <Mail width={20} height={20} />
              </span>
              <span className="font-medium">{company.email}</span>
            </a>
            {company.offices.map((o) => (
              <div key={o.label} className="flex items-start gap-4 text-ink/80">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist text-teal-600">
                  <Pin width={20} height={20} />
                </span>
                <span className="text-sm leading-snug">
                  <span className="block font-mono text-xs uppercase tracking-wide text-slatey">
                    {o.label}
                  </span>
                  {o.lines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* form */}
        <Reveal delay={120}>
          <div className="rounded-2xl border border-black/5 bg-mist p-6 sm:p-8">
            {status === "success" ? (
              <div className="grid min-h-[420px] place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-500 text-navy-950">
                    <Arrow width={24} height={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-navy-900">
                    Your details have been captured
                  </h3>
                  <p className="mt-2 text-slatey">
                    Thanks — our trading desk will be in touch shortly.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="btn-primary mt-6"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" required value={form.full_name} onChange={update("full_name")} />
                  <Field label="Email address" type="email" required value={form.email} onChange={update("email")} />
                  <Field label="Phone" required value={form.phone} onChange={update("phone")} placeholder="+234 …" />
                  <Field label="Company" value={form.company} onChange={update("company")} />
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-navy-900">Country</span>
                  <select
                    value={form.country}
                    onChange={update("country")}
                    className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Select a country</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-navy-900">
                    Your message <span className="text-teal-600">*</span>
                  </span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={update("message")}
                    className="w-full resize-none rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Tell us a little about what you need…"
                  />
                </label>

                {status === "error" && (
                  <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  onClick={onSubmit}
                  disabled={!valid || status === "loading"}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "loading" ? "Sending…" : "Send message"}
                  {status !== "loading" && <Arrow width={18} height={18} />}
                </button>
                <p className="text-center text-xs text-slatey">
                  Fields marked <span className="text-teal-600">*</span> are required.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Field({ label, required, type = "text", value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-900">
        {label} {required && <span className="text-teal-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </label>
  );
}
