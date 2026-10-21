// Shown above a draft that staff are previewing on its public page.
export default function DraftNotice({ kind = "page" }) {
  return (
    <div className="mb-6 flex items-start gap-3 border border-spark-400/60 bg-spark-400/10 px-4 py-3 text-sm text-ink" role="status">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-spark-400" aria-hidden="true" />
      <p>
        <strong>Draft preview.</strong> This {kind} isn't published, so visitors can't see it. Only signed-in staff can open this preview.
      </p>
    </div>
  );
}
