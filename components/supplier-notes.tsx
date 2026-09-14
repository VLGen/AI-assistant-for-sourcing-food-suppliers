"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  text: string;
  createdAt: string;
};

export function SupplierNotes({ supplierId }: { supplierId: string }) {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = async () => {
    const response = await fetch(`/api/notes?supplierId=${supplierId}`);
    if (!response.ok) {
      throw new Error("Не удалось загрузить заметки");
    }

    const data = (await response.json()) as { notes?: Note[] };
    setNotes(data.notes ?? []);
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadNotes();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки заметок");
      }
    })();
  }, [supplierId]);

  const handleSave = async () => {
    if (!text.trim()) {
      setError("Введите текст заметки");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, text }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Не удалось сохранить заметку");
      }

      setText("");
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Заметки</h2>

      <div className="mt-4 space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Добавьте заметку по поставщику..."
          className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Сохраняем..." : "Сохранить"}
        </button>

        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Существующие заметки</h3>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">Пока нет заметок по этому поставщику.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="whitespace-pre-line leading-6">{note.text}</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                  {new Date(note.createdAt).toLocaleString("ru-RU")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
