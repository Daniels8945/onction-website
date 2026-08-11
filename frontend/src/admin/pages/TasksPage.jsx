import { useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi.js";

const COLUMNS = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "done", label: "Done" },
];

function TaskCard({ task, admins, onStatusChange, onDelete }) {
  const assignee = admins.find((a) => a.id === task.assignee_id);
  const overdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();

  return (
    <div className="border border-black/10 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{task.title}</p>
        <button onClick={onDelete} className="shrink-0 text-xs text-red-600 hover:text-red-700">
          ✕
        </button>
      </div>
      {task.description && <p className="mt-1 text-xs text-slatey">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-slatey">{assignee ? assignee.full_name || assignee.email : "Unassigned"}</span>
        {task.due_date && (
          <span className={overdue ? "font-medium text-red-600" : "text-slatey"}>{task.due_date}</span>
        )}
      </div>
      <select
        value={task.status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="mt-3 w-full border border-black/10 px-2 py-1 text-xs outline-none focus:border-teal-500"
      >
        {COLUMNS.map((c) => (
          <option key={c.status} value={c.status}>
            Move to: {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewTaskForm({ admins, onCreate, onCancel }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onCreate({
      title,
      description,
      assignee_id: assigneeId ? Number(assigneeId) : null,
      due_date: dueDate || null,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-6 space-y-3">
      <input
        placeholder="Task title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <textarea
        placeholder="Description (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
      />
      <div className="flex gap-3">
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="flex-1 border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        >
          <option value="">Unassigned</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name || a.email}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="border border-black/10 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Adding…" : "Add task"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-slatey hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    adminApi.get("/api/tasks").then(setTasks).catch((err) => setError(err.message));
    adminApi.get("/api/admin/users").then(setAdmins).catch(() => {});
  }, []);

  async function handleCreate(payload) {
    try {
      const task = await adminApi.post("/api/tasks", payload);
      setTasks((prev) => [task, ...prev]);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(task, status) {
    try {
      const updated = await adminApi.put(`/api/tasks/${task.id}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(task) {
    try {
      await adminApi.del(`/api/tasks/${task.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-syne text-2xl font-semibold text-ink">Tasks</h1>
          <p className="text-sm text-slatey">Action items for running the business day to day.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add task
          </button>
        )}
      </div>

      {error && <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {showForm && <NewTaskForm admins={admins} onCreate={handleCreate} onCancel={() => setShowForm(false)} />}

      {!tasks ? (
        <p className="text-sm text-slatey">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.status}>
              <p className="eyebrow mb-3">
                {col.label} ({tasks.filter((t) => t.status === col.status).length})
              </p>
              <div className="space-y-3">
                {tasks
                  .filter((t) => t.status === col.status)
                  .map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      admins={admins}
                      onStatusChange={(status) => handleStatusChange(task, status)}
                      onDelete={() => handleDelete(task)}
                    />
                  ))}
                {tasks.filter((t) => t.status === col.status).length === 0 && (
                  <p className="text-xs text-slatey">Nothing here.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
