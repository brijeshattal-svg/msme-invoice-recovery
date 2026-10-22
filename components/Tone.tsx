"use client";

import { useEffect, useRef } from "react";
import { EMAIL } from "@/lib/copy";
import { TONE_IDS, TONES, type Tone } from "@/lib/email/tones";

type Props = { tone: Tone; onSelect: (t: Tone) => void; onDraft: () => void; onBack: () => void };

export function ToneScreen({ tone, onSelect, onDraft, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section aria-labelledby="tone-h" className="flex flex-col gap-6">
      <div>
        <h2 id="tone-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          {EMAIL.toneTitle}
        </h2>
        <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">{EMAIL.toneHelp}</p>
      </div>

      <div role="radiogroup" aria-labelledby="tone-h" className="flex flex-col gap-3">
        {TONE_IDS.map((id) => (
          <label
            key={id}
            className="flex min-h-20 cursor-pointer flex-col justify-center gap-1 rounded-xl border-2 border-zinc-500 p-4 has-[:checked]:border-indigo-700 has-[:checked]:bg-indigo-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-700 dark:has-[:checked]:bg-indigo-950"
          >
            <input
              type="radio"
              name="tone"
              value={id}
              checked={tone === id}
              onChange={() => onSelect(id)}
              className="sr-only"
            />
            <span className="text-lg font-semibold">{TONES[id].label}</span>
            <span className="text-base text-zinc-700 dark:text-zinc-300">{TONES[id].when}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onDraft}
          className="min-h-12 rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          {EMAIL.draftButton}
        </button>
        <button type="button" onClick={onBack} className="min-h-11 min-w-11 self-start text-base underline underline-offset-4">
          {EMAIL.back}
        </button>
      </div>
    </section>
  );
}
