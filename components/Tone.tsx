"use client";

import { useEffect, useRef } from "react";
import { EMAIL } from "@/lib/copy";
import { TONE_IDS, TONES, type Tone } from "@/lib/email/tones";
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
        <p className="mt-1 text-base text-muted">{EMAIL.toneHelp}</p>
      </div>

      <div role="radiogroup" aria-labelledby="tone-h" className="flex flex-col gap-3">
        {TONE_IDS.map((id) => (
          <label
            key={id}
            className="flex min-h-20 cursor-pointer flex-col justify-center gap-1 rounded-card border-2 border-line bg-surface p-5 shadow-card transition has-[:checked]:border-brand-700 has-[:checked]:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand-700)_22%,transparent)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600"
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
            <span className="text-base text-muted">{TONES[id].when}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onDraft}>
          {EMAIL.draftButton}
        </Button>
        <Button variant="link" tone="ink" onClick={onBack} className="self-start text-base">
          {EMAIL.back}
        </Button>
      </div>
    </section>
  );
}
