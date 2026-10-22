"use client";

import { useEffect, useRef } from "react";
import { EMAIL } from "@/lib/copy";
import { TONE_GROUPS, TONES, type Tone } from "@/lib/email/tones";
import { Button } from "./ui/Button";

type Props = { tone: Tone; onSelect: (t: Tone) => void; onDraft: () => void; onBack: () => void };

export function ToneScreen({ tone, onSelect, onDraft, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section aria-labelledby="tone-h" className="flex flex-col gap-6">
      <div className="text-center">
        <h2 id="tone-h" ref={heading} tabIndex={-1} className="step-title outline-none">
          {EMAIL.toneTitle}
        </h2>
        <p className="mt-4 text-lg text-muted">{EMAIL.toneHelp}</p>
      </div>

      <div role="radiogroup" aria-labelledby="tone-h" className="flex flex-col gap-8">
        {TONE_GROUPS.map((g) => (
          <div key={g.title} role="group" aria-label={g.title} className="flex flex-col gap-3">
            <h3 className="section-label">{g.title}</h3>
            {g.ids.map((id) => (
              <label
                key={id}
                className="flex min-h-20 cursor-pointer flex-col justify-center gap-1 rounded-[22px] border-[1.5px] border-line bg-surface px-6 py-5 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 has-[:checked]:border-brand-700 has-[:checked]:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-700)_22%,transparent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600"
              >
                <input type="radio" name="tone" value={id} checked={tone === id} onChange={() => onSelect(id)} className="sr-only" />
                <span className="tone-title text-xl font-semibold tracking-tight">{TONES[id].label}</span>
                <span className="text-base text-muted">{TONES[id].when}</span>
                <span className="mt-2 text-[15px] text-brand-700">{TONES[id].preview}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-col items-center gap-1.5">
        <Button size="lg" onClick={onDraft} className="px-7">
          {EMAIL.draftButton}
        </Button>
        <Button variant="link" tone="muted" onClick={onBack} className="text-[15px] no-underline hover:underline">
          {EMAIL.back}
        </Button>
      </div>
    </section>
  );
}
