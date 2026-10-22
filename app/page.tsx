"use client";

import { useReducer } from "react";
import { Confirm } from "@/components/Confirm";
import { Stepper } from "@/components/Stepper";
import { Upload } from "@/components/Upload";
import { extractInvoice, ExtractFailure } from "@/lib/api";
import { COPY } from "@/lib/copy";
import { compressImage, UploadError } from "@/lib/image";
import { todayIST } from "@/lib/today";
import { initialState, reducer, sampleExtraction } from "@/lib/wizard";

export default function Home() {
  // The whole journey lives in memory only: no localStorage, no cookies (CLAUDE.md rule 3).
  const [state, dispatch] = useReducer(reducer, initialState);

  async function handleFile(file: File) {
    dispatch({ type: "reading" });
    try {
      const data = await extractInvoice(await compressImage(file));
      dispatch({ type: "extracted", data });
    } catch (e) {
      const known = e instanceof UploadError || e instanceof ExtractFailure;
      dispatch({ type: "failed", message: known ? e.message : COPY.aiFailed });
    }
  }

  // The sample goes through the real extraction path; if the file or the AI is unavailable,
  // fall back to hard-coded data for the same invoice so the demo never breaks (CLAUDE.md rule 8).
  async function handleSample() {
    dispatch({ type: "reading" });
    try {
      const res = await fetch("/sample/sample-invoice.pdf");
      if (!res.ok) throw new Error("no sample file");
      const blob = await res.blob();
      const data = await extractInvoice(new File([blob], "sample-invoice.pdf", { type: "application/pdf" }));
      dispatch({ type: "extracted", data });
    } catch {
      dispatch({ type: "extracted", data: sampleExtraction(todayIST()) });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
      <Stepper current={state.step} />

      {state.step === "upload" && (
        <Upload
          upload={state.upload}
          error={state.error}
          onFile={handleFile}
          onSample={handleSample}
          onManual={() => dispatch({ type: "manual" })}
        />
      )}

      {state.step === "check" && (
        <Confirm state={state} dispatch={dispatch} onSubmit={() => dispatch({ type: "go", step: "standing" })} />
      )}

      {state.step === "standing" && (
        // Placeholder until Phase 3 wires the engine into this screen.
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Details confirmed</h2>
          <p className="text-base">The &quot;where you stand&quot; screen is built in the next phase. Your details are kept while you go back.</p>
          <button type="button" onClick={() => dispatch({ type: "go", step: "check" })} className="min-h-11 self-start text-base underline underline-offset-4">
            Back
          </button>
        </section>
      )}

      <footer className="mt-auto text-sm text-zinc-700 dark:text-zinc-300">{COPY.disclaimer}</footer>
    </main>
  );
}
