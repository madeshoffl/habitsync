"use client";

import { useEffect, useMemo, useState } from "react";

type AddHabitModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate?: (habit: { name: string; category: typeof CATEGORIES[number]; icon: string; color: typeof COLORS[number]["name"] }) => void;
};

const ICONS = ["☀️", "💧", "📖", "🏃", "🎯", "💪", "🧘", "🍎", "😴", "✍️"];
const CATEGORIES = ["Health", "Productivity", "Learning", "Lifestyle", "Other"] as const;
const COLORS = [
  { name: "blue", class: "bg-blue-500" },
  { name: "green", class: "bg-green-500" },
  { name: "purple", class: "bg-purple-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "pink", class: "bg-pink-500" },
] as const;

export default function AddHabitModal({ open, onClose, onCreate }: AddHabitModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("Health");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState<typeof COLORS[number]["name"]>("blue");

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setName("");
      setCategory("Health");
      setIcon(ICONS[0]);
      setColor("blue");
    }
  }, [open]);

  const colorClass = useMemo(() => COLORS.find((c) => c.name === color)?.class ?? "bg-blue-500", [color]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 opacity-0 animate-[fadeIn_150ms_ease-out_forwards]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg scale-95 transform rounded-2xl border border-gray-200 bg-white p-6 shadow-xl opacity-0 ring-1 ring-black/5 animate-[popIn_180ms_ease-out_forwards]">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add New Habit</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Habit name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Routine"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Icon picker */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Icon</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${
                      icon === i ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                    aria-pressed={icon === i}
                  >
                    <span className="text-xl" aria-hidden>
                      {i}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
              <div className="flex flex-wrap items-center gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={`relative h-8 w-8 rounded-full ${c.class} ring-2 ring-offset-2 transition ${
                      color === c.name ? "ring-blue-500" : "ring-transparent hover:ring-gray-300"
                    }`}
                    aria-pressed={color === c.name}
                    aria-label={c.name}
                  />
                ))}
                <div className={`ml-2 inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-gray-700 ${colorClass.replace("bg-", "bg-").replace("-500", "-100")}`}>
                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="capitalize">{color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onCreate?.({ name, category, icon, color });
                onClose();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Create Habit
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { opacity: 0; transform: translateY(6px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}


