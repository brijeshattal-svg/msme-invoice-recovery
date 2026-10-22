"use client";

import { useReducer } from "react";
import { Confirm } from "@/components/Confirm";
import { SendScreen } from "@/components/Send";
import { Standing } from "@/components/Standing";
import { Stepper } from "@/components/Stepper";
import { ToneScreen } from "@/components/Tone";
import { Upload } from "@/components/Upload";
import { extractInvoice, ExtractFailure, requestDraft } from "@/lib/api";
import { COPY } from "@/lib/copy";
import { factsFromForm, getDraft } from "@/lib/email/flow";
import { compute } from "@/lib/engine";
import { compressImage, UploadError } from "@/lib/image";
import { toEngineInput } from "@/lib/standing";
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
      dispatch({ type: "extracted", data: sampleExtraction() });
    }
  }

  // Server draft -> re-checked in the browser -> template on any failure (never dead-ends).
  async function handleDraft() {
    dispatch({ type: "draftLoading" });
    const drafted = await getDraft(state.form, state.tone, todayIST(), requestDraft);
    if (drafted) dispatch({ type: "drafted", subject: drafted.subject, body: drafted.body, source: drafted.source });
    else dispatch({ type: "go", step: "standing" }); // not overdue today: back to the standing screen
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-8 sm:py-12">
      {/* One page-level heading for assistive tech; each step's visible heading is an h2. */}
      <h1 className="sr-only">Overdue invoice check for service businesses</h1>
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
        <Standing
          // asOf = today in India, read when this screen opens (CLAUDE.md rule 5).
          result={compute(toEngineInput(state.form, todayIST()))}
          form={state.form}
          onBack={() => dispatch({ type: "go", step: "check" })}
          onTone={() => dispatch({ type: "go", step: "tone" })}
          onReset={() => dispatch({ type: "reset" })}
        />
      )}

      {state.step === "tone" && (
        <ToneScreen
          tone={state.tone}
          onSelect={(tone) => dispatch({ type: "setTone", tone })}
          onDraft={handleDraft}
          onBack={() => dispatch({ type: "go", step: "standing" })}
        />
      )}

      {state.step === "send" && (
        <SendScreen
          draft={state.draft}
          facts={factsFromForm(state.form, todayIST())}
          onEdit={(field, value) => dispatch({ type: "editDraft", field, value })}
          onChangeTone={() => dispatch({ type: "go", step: "tone" })}
          onBack={() => dispatch({ type: "go", step: "standing" })}
        />
      )}

      <footer className="mt-auto text-sm text-muted">{COPY.disclaimer}</footer>
    </main>
  );
}
