"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReducer, useRef } from "react";
import { Confirm } from "@/components/Confirm";
import { SendScreen } from "@/components/Send";
import { Standing } from "@/components/Standing";
import { Stepper } from "@/components/Stepper";
import { ToneScreen } from "@/components/Tone";
import { Upload } from "@/components/Upload";
import { newId, useToolkit } from "@/components/toolkit/state";
import { extractInvoice, ExtractFailure, requestDraft } from "@/lib/api";
import { COPY, PRIVACY } from "@/lib/copy";
import { factsFromForm, getDraft, templateDraft } from "@/lib/email/flow";
import { compute } from "@/lib/engine";
import { compressImage, UploadError } from "@/lib/image";
import { eligibilityNotes, paymentsFromForm, toEngineInput } from "@/lib/standing";
import { todayIST } from "@/lib/today";
import { initialState, reducer, sampleExtraction, type FormValues } from "@/lib/wizard";

/** Invoice amount less part payments (cash + TDS), in rupees, rounded to paise. */
function unpaidOf(f: FormValues): number {
  const paid = paymentsFromForm(f).reduce((sum, p) => sum + p.amount + p.tds, 0);
  return Math.round((Number(f.amount) - paid) * 100) / 100;
}

export default function Home() {
  // The whole journey lives in memory only: no localStorage, no cookies (CLAUDE.md rule 3).
  const [state, dispatch] = useReducer(reducer, initialState);
  const router = useRouter();
  const { addFromQuickCheck } = useToolkit();
  // Each AI wait gets a ticket; an answer that arrives after the founder moved on (entered the
  // details by hand, took the standard draft) no longer matches and is ignored.
  const readJob = useRef(0);
  const draftJob = useRef(0);

  // Only on the founder's click: add this invoice to the shared in-memory list and open Priorities.
  function addToPriorities() {
    const f = state.form;
    addFromQuickCheck({
      id: newId(),
      client: f.clientName.trim(),
      number: f.invoiceNumber.trim(),
      // Part payments: Priorities tracks what is still unpaid (its interest estimate then runs on
      // that part only, so it can only understate, never overstate, what may be owed).
      amount: unpaidOf(f),
      invoiceDate: f.invoiceDate,
      acceptanceDate: f.acceptanceDate,
      agreementDays: f.hasAgreement ? Number(f.agreementDays) : null,
      promisedDate: null,
      paid: false,
    });
    router.push("/priorities");
  }

  async function handleFile(file: File) {
    const job = ++readJob.current;
    dispatch({ type: "reading" });
    try {
      const data = await extractInvoice(await compressImage(file));
      if (job === readJob.current) dispatch({ type: "extracted", data });
    } catch (e) {
      const known = e instanceof UploadError || e instanceof ExtractFailure;
      if (job === readJob.current) dispatch({ type: "failed", message: known ? e.message : COPY.aiFailed });
    }
  }

  // Always available, even while the AI is reading: never make the founder wait for it.
  function handleManual() {
    readJob.current++;
    dispatch({ type: "manual" });
  }

  // The sample goes through the real extraction path; if the file or the AI is unavailable,
  // fall back to hard-coded data for the same invoice so the demo never breaks (CLAUDE.md rule 8).
  async function handleSample() {
    const job = ++readJob.current;
    dispatch({ type: "reading" });
    let data;
    try {
      const res = await fetch("/sample/sample-invoice.pdf");
      if (!res.ok) throw new Error("no sample file");
      const blob = await res.blob();
      data = await extractInvoice(new File([blob], "sample-invoice.pdf", { type: "application/pdf" }));
    } catch {
      data = sampleExtraction();
    }
    if (job === readJob.current) dispatch({ type: "extracted", data });
  }

  // Server draft -> re-checked in the browser -> template on any failure (never dead-ends).
  async function handleDraft() {
    const job = ++draftJob.current;
    dispatch({ type: "draftLoading" });
    const drafted = await getDraft(state.form, state.tone, todayIST(), requestDraft, state.waiver);
    if (job !== draftJob.current) return;
    if (drafted) dispatch({ type: "drafted", subject: drafted.subject, body: drafted.body, source: drafted.source });
    else dispatch({ type: "go", step: "standing" }); // not overdue today: back to the standing screen
  }

  // The founder chose not to wait for the AI: the standard draft, same checked figures.
  function takeStandardDraft() {
    draftJob.current++;
    const t = templateDraft(state.form, state.tone, todayIST(), state.waiver);
    if (t) dispatch({ type: "drafted", subject: t.subject, body: t.body, source: t.source });
    else dispatch({ type: "go", step: "standing" });
  }

  return (
    <>
      <Stepper current={state.step} />
      <main className={`mx-auto flex w-full ${state.step === "upload" ? "max-w-3xl" : "max-w-xl"} flex-1 flex-col gap-8 px-5 py-10 sm:py-16`}>
      {/* One page-level heading for assistive tech; each step's visible heading is an h2. */}
      <h1 className="sr-only">Overdue invoice check for service businesses</h1>

      {state.step === "upload" && (
        <Upload
          upload={state.upload}
          error={state.error}
          onFile={handleFile}
          onSample={handleSample}
          onManual={handleManual}
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
          notes={eligibilityNotes(state.eligibility, state.form)}
          asOf={todayIST()}
          onAddToPriorities={addToPriorities}
          onBack={() => dispatch({ type: "go", step: "check" })}
          onTone={() => dispatch({ type: "go", step: "tone" })}
          onReset={() => dispatch({ type: "reset" })}
        />
      )}

      {state.step === "tone" && (
        <ToneScreen
          tone={state.tone}
          onSelect={(tone) => dispatch({ type: "setTone", tone })}
          waiver={state.waiver}
          onWaiver={(on) => dispatch({ type: "setWaiver", on })}
          onDraft={handleDraft}
          onBack={() => dispatch({ type: "go", step: "standing" })}
        />
      )}

      {state.step === "send" && (
        <SendScreen
          draft={state.draft}
          facts={factsFromForm(state.form, todayIST())}
          tone={state.tone}
          today={todayIST()}
          factsOn={(date) => factsFromForm(state.form, date)}
          onEdit={(field, value) => dispatch({ type: "editDraft", field, value })}
          onUseStandard={takeStandardDraft}
          onChangeTone={() => dispatch({ type: "go", step: "tone" })}
          onBack={() => dispatch({ type: "go", step: "standing" })}
        />
      )}

      <footer className="mt-auto text-sm text-muted">
        {COPY.disclaimer} <Link href="/privacy" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">{PRIVACY.link}</Link>
      </footer>
      </main>
    </>
  );
}
