import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router-dom";
import { LuArrowLeft, LuArrowRight, LuArrowUpRight, LuBookOpen, LuChevronDown, LuCircleCheck, LuHouse, LuListChecks, LuShieldCheck } from "react-icons/lu";
import { CATEGORIES, FREQUENT_TASKS, QUICK_START, TOPICS, topicById, topicText } from "../help/topics.js";
import { Alert, Badge, Button, EmptyState, PageHeader, Panel, SearchInput, Table, Td, Th, cx } from "../components/ui.jsx";

// Help Centre: guides for every dashboard module, generated from the
// structured content in ../help/topics.js (edit that file, not this one, to
// change what a guide says).
export default function HelpPage() {
  const { topicId } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const setQuery = (q) => setParams(q ? { q } : {}, { replace: true });
  const topic = topicId ? topicById[topicId] : null;

  useEffect(() => {
    document.getElementById("admin-main")?.scrollTo({ top: 0 });
  }, [topicId]);

  return (
    <div>
      <PageHeader
        title="Help & guides"
        description="How to use each part of the dashboard — what it does, step-by-step instructions, and what to do when something goes wrong."
      />
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <Sidebar query={query} setQuery={setQuery} activeId={topicId} />
        <div className="min-w-0">
          {query.trim() ? (
            <SearchResults query={query} onClear={() => setQuery("")} />
          ) : topicId && !topic ? (
            <Panel>
              <EmptyState icon={LuBookOpen} title="That guide doesn't exist" description="It may have been renamed." action={<Button to="/admin/help" icon={LuHouse}>Help home</Button>} />
            </Panel>
          ) : topic ? (
            <TopicView topic={topic} />
          ) : (
            <Home />
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ query, setQuery, activeId }) {
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Guides" className="space-y-4">
      <NavLink end to="/admin/help" className={({ isActive }) => cx("flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium", isActive && !activeId ? "bg-white text-ink shadow-sm ring-1 ring-black/5" : "text-slatey hover:text-ink")}>
        <LuHouse size={15} aria-hidden="true" /> Help home
      </NavLink>
      {CATEGORIES.map((c) => (
        <div key={c.id}>
          <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">{c.label}</p>
          <ul className="space-y-0.5">
            {TOPICS.filter((t) => t.category === c.id).map((t) => (
              <li key={t.id}>
                <NavLink
                  to={`/admin/help/${t.id}`}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cx("block rounded-lg px-3 py-1.5 text-sm transition", isActive ? "bg-white font-medium text-ink shadow-sm ring-1 ring-black/5" : "text-slatey hover:bg-white/60 hover:text-ink")}
                >
                  {t.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <aside className="lg:sticky lg:top-0 lg:max-h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:pb-6">
      <SearchInput value={query} onChange={setQuery} placeholder="Search the guides…" className="mb-4" />
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm"
        >
          {activeId ? topicById[activeId]?.title || "Browse guides" : "Browse all guides"}
          <LuChevronDown size={16} className={cx("transition", open && "rotate-180")} aria-hidden="true" />
        </button>
        {open && <div className="mt-3 rounded-lg border border-black/[0.07] bg-mist/60 p-2">{nav}</div>}
      </div>
      <div className="hidden lg:block">{nav}</div>
    </aside>
  );
}

function Home() {
  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/10">
            <LuBookOpen size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-2 text-sm text-slatey">
            <h2 className="text-base font-semibold text-ink">Welcome to the Onction Energy dashboard</h2>
            <p>
              This is where the team runs the public website and the vendor platform: publishing news and events, editing the pages, emailing subscribers, following enquiries and analytics, and reviewing vendors and invoices.
            </p>
            <p>
              Every guide follows the same pattern: what the screen is for, where to find it, a step-by-step walkthrough, the fields that matter, and fixes for common problems. Look for the <strong className="text-ink">Help</strong> button on any screen to jump straight to its guide.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="New here? Start with these" description="About ten minutes, in this order.">
          <ol className="space-y-2">
            {QUICK_START.map((q, i) => (
              <li key={q.topic}>
                <Link to={`/admin/help/${q.topic}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-950 text-xs font-semibold text-white">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{q.label}</span>
                  <LuArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Frequent tasks" description="Read the guide, or go straight to the screen.">
          <ul className="divide-y divide-black/[0.05]">
            {FREQUENT_TASKS.map((t) => (
              <li key={t.label} className="flex items-center justify-between gap-3 py-2">
                <Link to={`/admin/help/${t.topic}`} className="text-sm font-medium text-ink hover:text-teal-700">{t.label}</Link>
                <Button size="xs" variant="ghost" iconRight={LuArrowUpRight} to={t.route} aria-label={`Open the screen to ${t.label.toLowerCase()}`}>Open</Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Panel key={c.id} title={c.label}>
            <ul className="space-y-2">
              {TOPICS.filter((t) => t.category === c.id).map((t) => (
                <li key={t.id}>
                  <Link to={`/admin/help/${t.id}`} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">
                    <span className="text-sm font-medium text-ink hover:text-teal-700">{t.title}</span>
                    <span className="block text-xs text-slatey">{t.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function TopicView({ topic: t }) {
  const category = CATEGORIES.find((c) => c.id === t.category);
  return (
    <article className="space-y-6" aria-labelledby="help-topic-title">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-slatey">
          <Link to="/admin/help" className="hover:text-ink">Help home</Link>
          <span aria-hidden="true">/</span>
          <span>{category?.label}</span>
        </nav>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="help-topic-title" className="text-xl font-semibold tracking-tight text-ink">{t.title}</h2>
            <p className="mt-1 text-sm text-slatey">{t.summary}</p>
            {t.roles && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slatey">
                <LuShieldCheck size={13} className="text-teal-600" aria-hidden="true" /> Who can make changes: {t.roles}
              </p>
            )}
          </div>
          {t.route && <Button variant="primary" iconRight={LuArrowUpRight} to={t.route}>Open {t.title}</Button>}
        </div>
      </div>

      {(t.what || t.access) && (
        <div className="grid gap-4 md:grid-cols-2">
          {t.what && <Panel title="What it does"><p className="text-sm leading-relaxed text-slatey">{t.what}</p></Panel>}
          {t.access && <Panel title="Where to find it"><p className="text-sm leading-relaxed text-slatey">{t.access}</p></Panel>}
        </div>
      )}

      {t.steps?.length > 0 && <Walkthrough steps={t.steps} />}

      {t.actions?.length > 0 && (
        <Panel title="What you can do">
          <ul className="space-y-2">
            {t.actions.map((a) => (
              <li key={a} className="flex gap-2.5 text-sm text-slatey">
                <LuCircleCheck size={16} className="mt-0.5 shrink-0 text-teal-600" aria-hidden="true" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {t.fields?.length > 0 && (
        <Panel title="Important fields" padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Field</Th>
                <Th>What it means</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {t.fields.map((f) => (
                <tr key={f.name}>
                  <Td className="w-1/3 align-top">
                    <span className="font-medium text-ink">{f.name}</span>
                    {f.required && <Badge tone="warning" dot={false} className="ml-2">Required</Badge>}
                  </Td>
                  <Td className="align-top text-slatey">{f.description}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      {t.outcomes?.length > 0 && (
        <Panel title="What happens next">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slatey">
            {t.outcomes.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </Panel>
      )}

      {t.tips?.map((tip) => <Alert key={tip} tone="info" title="Tip">{tip}</Alert>)}
      {t.warnings?.map((w) => <Alert key={w} tone="warning" title="Be careful">{w}</Alert>)}

      {t.problems?.length > 0 && (
        <Panel title="Common problems" description="Select a problem to see the fix." padded={false}>
          <div className="divide-y divide-black/[0.05]">
            {t.problems.map((p) => (
              <details key={p.problem} className="group px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 [&::-webkit-details-marker]:hidden">
                  {p.problem}
                  <LuChevronDown size={16} className="shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slatey">{p.fix}</p>
              </details>
            ))}
          </div>
        </Panel>
      )}

      {t.limits?.length > 0 && (
        <Panel title="Not available yet" description="Limits of the current platform — these need development work.">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slatey">
            {t.limits.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </Panel>
      )}

      {t.related?.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Related guides</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {t.related.map((id) => topicById[id]).filter(Boolean).map((r) => (
              <Link key={r.id} to={`/admin/help/${r.id}`} className="rounded-xl border border-black/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(10,31,60,0.04)] transition hover:border-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">
                <p className="text-sm font-medium text-ink">{r.title}</p>
                <p className="mt-0.5 text-xs text-slatey">{r.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-black/[0.07] pt-4">
        <Button variant="ghost" icon={LuArrowLeft} to="/admin/help">Back to Help home</Button>
      </div>
    </article>
  );
}

// One step at a time (Back / Next), or every step at once.
function Walkthrough({ steps }) {
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setCurrent(0), [steps]);
  const step = steps[current];
  return (
    <Panel
      title="Step by step"
      description={showAll ? `${steps.length} steps` : `Step ${current + 1} of ${steps.length}`}
      actions={
        <Button size="sm" variant="ghost" icon={LuListChecks} onClick={() => setShowAll((s) => !s)} aria-pressed={showAll}>
          {showAll ? "One at a time" : "Show all steps"}
        </Button>
      }
    >
      {showAll ? (
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <StepNumber n={i + 1} />
              <div>
                <p className="text-sm font-medium text-ink">{s.title}</p>
                <p className="mt-0.5 text-sm text-slatey">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div>
          <div className="mb-4 flex gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.title} className={cx("h-1.5 flex-1 rounded-full transition", i <= current ? "bg-teal-500" : "bg-black/[0.08]")} />
            ))}
          </div>
          <div className="flex min-h-[88px] gap-3" aria-live="polite">
            <StepNumber n={current + 1} active />
            <div>
              <p className="font-medium text-ink">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slatey">{step.detail}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.06] pt-4">
            <Button size="sm" icon={LuArrowLeft} onClick={() => setCurrent((c) => c - 1)} disabled={current === 0}>Back</Button>
            <div className="flex flex-wrap gap-1">
              {steps.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to step ${i + 1}: ${s.title}`}
                  aria-current={i === current ? "step" : undefined}
                  className={cx("grid h-7 w-7 place-items-center rounded-full text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50", i === current ? "bg-navy-950 text-white" : "text-slatey hover:bg-black/5")}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {current < steps.length - 1 ? (
              <Button size="sm" variant="primary" iconRight={LuArrowRight} onClick={() => setCurrent((c) => c + 1)}>Next</Button>
            ) : (
              <Button size="sm" variant="primary" icon={LuCircleCheck} onClick={() => setCurrent(0)}>Start over</Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function StepNumber({ n, active }) {
  return (
    <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold", active ? "bg-teal-500 text-navy-950" : "bg-mist text-ink ring-1 ring-black/10")}>{n}</span>
  );
}

function SearchResults({ query, onClear }) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    return TOPICS.map((t) => {
      const title = t.title.toLowerCase();
      const summary = t.summary.toLowerCase();
      const text = topicText(t);
      const lower = text.toLowerCase();
      if (!terms.every((term) => lower.includes(term))) return null;
      const score = terms.reduce((s, term) => s + (title.includes(term) ? 5 : 0) + (summary.includes(term) ? 2 : 0) + 1, 0);
      const at = lower.indexOf(terms[0]);
      const start = Math.max(0, at - 70);
      const snippet = (start > 0 ? "…" : "") + text.slice(start, at + 130).replace(/\s*\n\s*/g, " ").trim() + "…";
      return { t, score, snippet };
    })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Panel title={`${results.length} guide${results.length === 1 ? "" : "s"} mention “${query.trim()}”`} actions={<Button size="sm" variant="ghost" onClick={onClear}>Clear search</Button>} padded={false}>
      {results.length === 0 ? (
        <EmptyState compact title="No guides match" description="Try a simpler word, like “publish”, “image” or “invoice”." />
      ) : (
        <ul className="divide-y divide-black/[0.05]">
          {results.map(({ t, snippet }) => (
            <li key={t.id}>
              <Link to={`/admin/help/${t.id}`} className="block px-5 py-3 transition hover:bg-mist/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/50">
                <p className="text-sm font-medium text-ink">
                  {t.title} <span className="ml-1 text-xs font-normal text-slatey">· {CATEGORIES.find((c) => c.id === t.category)?.label}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slatey"><Highlight text={snippet} terms={terms} /></p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Highlight({ text, terms }) {
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="rounded bg-amber-100 px-0.5 text-ink">{part}</mark> : <Fragment key={i}>{part}</Fragment>
  );
}
