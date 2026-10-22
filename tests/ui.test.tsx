import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { Field } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { COPY } from "@/lib/copy";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
/** Rendered text with HTML entities decoded (React escapes apostrophes as &#x27;). */
const decoded = (markup: string) => markup.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const classOf = (markup: string, tag: string) => markup.match(new RegExp(`<${tag}[^>]*class="([^"]*)"`))?.[1] ?? "";

describe("Button", () => {
  it.each(["primary", "secondary", "ghost", "link"] as const)("%s keeps a 44px minimum target and defaults to type=button", (variant) => {
    const out = html(<Button variant={variant}>Go</Button>);
    const cls = classOf(out, "button");
    expect(cls).toContain("min-h-11");
    expect(cls).toContain("min-w-11");
    expect(out).toContain('type="button"');
    expect(out).toContain(`data-variant="${variant}"`);
  });

  it("lg size raises the height to 48px", () => {
    expect(classOf(html(<Button size="lg">Go</Button>), "button")).toContain("min-h-12");
  });

  it("loading shows a spinner, sets aria-busy and disables the button", () => {
    const out = html(<Button loading>Saving</Button>);
    expect(out).toContain('aria-busy="true"');
    expect(out).toMatch(/<button[^>]*disabled=""/);
    expect(out).toContain('data-ui="spinner"');
  });

  it("is not busy when not loading", () => {
    expect(html(<Button>Go</Button>)).not.toContain("aria-busy");
  });

  it("primary uses tokens only", () => {
    const cls = classOf(html(<Button>Go</Button>), "button");
    expect(cls).toContain("bg-brand-700");
    expect(cls).toContain("text-on-brand");
    expect(cls).not.toMatch(/indigo|zinc|white/);
  });

  it("link tone picks exactly one text colour, so overrides never fight", () => {
    for (const [tone, colour] of [["brand", "text-link"], ["ink", "text-ink"], ["muted", "text-muted"]] as const) {
      const cls = classOf(html(<Button variant="link" tone={tone}>x</Button>), "button");
      expect(cls).toContain(colour);
      const textColours = cls.split(" ").filter((c) => /^text-(link|ink|muted|on-brand)$/.test(c));
      expect(textColours, tone).toHaveLength(1);
    }
  });

  it("passes type=submit through", () => {
    expect(html(<Button type="submit">Send</Button>)).toContain('type="submit"');
  });
});

describe("Card", () => {
  it("is a surface with radius 20, a light-mode shadow and a dark-mode border", () => {
    const cls = classOf(html(<Card>hi</Card>), "div");
    for (const c of ["rounded-card", "bg-surface", "shadow-card", "dark:border", "dark:border-line", "dark:shadow-none"]) {
      expect(cls).toContain(c);
    }
  });
});

describe("Field", () => {
  const render = (props: Partial<React.ComponentProps<typeof Field>> = {}) =>
    html(
      <Field id="f-x" label="Client name" {...props}>
        {(cls, d) => <input id="f-x" className={cls} aria-describedby={d} />}
      </Field>,
    );

  it("labels the input", () => {
    expect(render()).toContain('<label for="f-x"');
    expect(render()).toContain("Client name");
  });

  it("links the error and hint with aria-describedby", () => {
    const out = render({ error: "Enter the client's name.", help: "As on the invoice." });
    expect(out).toContain('aria-describedby="f-x-err f-x-help"');
    expect(out).toContain('id="f-x-err"');
    expect(out).toContain('id="f-x-help"');
  });

  it("has no aria-describedby when there is nothing to describe", () => {
    expect(render()).not.toContain("aria-describedby");
  });

  it("shows the exact flag copy", () => {
    expect(decoded(render({ flag: "missing" }))).toContain(COPY.unreadable);
    expect(decoded(render({ flag: "check" }))).toContain(COPY.pleaseCheck);
  });

  it("picks the border from state: error > flag > default", () => {
    expect(classOf(render({ error: "x", flag: "check" }), "input")).toContain("border-danger");
    expect(classOf(render({ flag: "check" }), "input")).toContain("border-warn-ink");
    expect(classOf(render(), "input")).toContain("border-control");
  });

  it("inputs are at least 48px tall", () => {
    expect(classOf(render(), "input")).toContain("min-h-12");
  });
});

describe("Badge", () => {
  it.each([
    ["neutral", "bg-line"],
    ["success", "bg-brand-50"],
    ["warn", "bg-warn-bg"],
  ] as const)("%s tone", (tone, bg) => {
    expect(classOf(html(<Badge tone={tone}>x</Badge>), "span")).toContain(bg);
  });
});

describe("Banner", () => {
  it("renders the role, title, body and action", () => {
    const out = html(
      <Banner tone="danger" role="alert" title="Couldn't read it" action={<Button variant="link">Enter by hand</Button>}>
        <p>Try another file.</p>
      </Banner>,
    );
    expect(out).toContain('role="alert"');
    expect(out).toContain("Couldn&#x27;t read it");
    expect(out).toContain("Try another file.");
    expect(out).toContain("Enter by hand");
    expect(out).toMatch(/<p class="[^"]*text-danger[^"]*">Couldn/);
  });

  it("has no role unless the caller chooses one", () => {
    expect(html(<Banner tone="info">x</Banner>)).not.toContain("role=");
  });
});

describe("Disclosure", () => {
  it("is a native details/summary with a 44px summary", () => {
    const out = html(<Disclosure summary="How your data is handled">body</Disclosure>);
    expect(out).toMatch(/^<details/);
    const cls = classOf(out, "summary");
    expect(cls).toContain("min-h-11");
    expect(cls).toContain("min-w-11");
  });

  it("className replaces the default frame instead of stacking on it", () => {
    const out = html(<Disclosure summary="s" className="rounded-card border-2 border-line" summaryClassName="p-4">b</Disclosure>);
    expect(classOf(out, "details")).toBe("rounded-card border-2 border-line");
    expect(classOf(out, "summary")).not.toContain("px-4");
  });
});

describe("Spinner and Skeleton", () => {
  it("are hidden from assistive tech and use animations that reduced motion switches off", () => {
    const spinner = html(<Spinner />);
    const skeleton = html(<Skeleton />);
    expect(spinner).toContain('aria-hidden="true"');
    expect(spinner).toContain("animate-spin");
    expect(skeleton).toContain('aria-hidden="true"');
    expect(skeleton).toContain("animate-pulse");
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.animate-spin[\s\S]*\.animate-pulse[\s\S]*animation: none/);
  });
});

describe("ProgressBar", () => {
  it("is a labelled progressbar with the current step", () => {
    const out = html(<ProgressBar value={2} max={5} />);
    expect(out).toContain('role="progressbar"');
    expect(out).toContain('aria-valuenow="2"');
    expect(out).toContain('aria-valuemax="5"');
    expect(out).toContain('aria-valuetext="Step 2 of 5"');
    expect(out).toContain("Step 2 of 5");
    const labelId = out.match(/<span id="([^"]+)"/)?.[1];
    expect(labelId).toBeTruthy();
    expect(out).toContain(`aria-labelledby="${labelId}"`);
    expect(out).toContain("width:40%");
  });

  it("clamps the bar between 0 and 100%", () => {
    expect(html(<ProgressBar value={9} max={5} />)).toContain("width:100%");
  });
});

describe("design tokens shipped in app/globals.css match REDESIGN.md section 4 exactly", () => {
  const css = readFileSync("app/globals.css", "utf8").toLowerCase();
  const [light, dark] = css.split("@media (prefers-color-scheme: dark)");
  const value = (block: string, name: string) => block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))?.[1];

  it.each([
    ["canvas", "#fafaf7", "#0c0d10"],
    ["surface", "#ffffff", "#16181c"],
    ["ink", "#14151a", "#f3f3f1"],
    ["muted", "#5d5f68", "#a3a5ad"],
    ["control", "#8a8c94", "#6b6e77"],
    ["brand-50", "#e7f4ef", "#06291f"],
    ["brand-600", "#0e7c66", "#5edbb8"],
    ["brand-700", "#0b6b57", "#2ec79c"],
    ["brand-800", "#08503f", "#c8f1e3"],
    ["on-brand", "#ffffff", "#0c0d10"],
    ["link", "#0b6b57", "#5edbb8"],
    ["warn-bg", "#fff6e5", "#2b1e06"],
    ["warn-ink", "#7a4a00", "#ffd58a"],
    ["danger", "#b42318", "#ff9c91"],
  ])("%s", (name, lightHex, darkHex) => {
    expect(value(light, name)).toBe(lightHex);
    expect(value(dark, name)).toBe(darkHex);
  });

  it("no longer forces Arial (rules only; a comment may mention the old bug)", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).not.toMatch(/font-family:\s*arial/);
    expect(css).toContain("--font-sans: var(--font-geist-sans)");
  });
});
