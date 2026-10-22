// Fails (exit 1) if anything secret-looking is tracked by git. Run: npm run check:secrets
// Matches key SHAPES, not bare words: the docs legitimately mention "sk-ant" as text.
// Not wired into `npm run build`: Vercel's build container may have no .git directory.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SECRET_PATTERNS = [
  { name: "Anthropic API key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Google API key (AIza)", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "Google API key (AQ.)", re: /\bAQ\.[A-Za-z0-9_-]{30,}/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "GitHub fine-grained token", re: /\bgithub_pat_[A-Za-z0-9_]{40,}/ },
  { name: "OpenAI-style key", re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

/** Findings for one file's text: [{ name, line, preview }], preview masked. */
export function findSecrets(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const { name, re } of SECRET_PATTERNS) {
      const m = line.match(re);
      if (m) out.push({ name, line: i + 1, preview: `${m[0].slice(0, 6)}…` });
    }
  });
  return out;
}

/** A tracked path that should never be committed (real env files; the template is allowed). */
export function isForbiddenPath(path) {
  const base = path.split("/").pop();
  return /^\.env(\..+)?$/.test(base) && base !== ".env.example";
}

/** .env.example must stay a template: every KEY= line has an empty value. */
export function envExampleProblems(text) {
  return text
    .split(/\r?\n/)
    .map((l, i) => ({ l: l.trim(), line: i + 1 }))
    .filter(({ l }) => l && !l.startsWith("#") && /^[A-Za-z_][A-Za-z0-9_]*=.+/.test(l))
    .map(({ l, line }) => ({ line, key: l.split("=")[0] }));
}

export function scanTrackedFiles(cwd = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" }).split("\0").filter(Boolean);
  const problems = [];
  for (const f of files) {
    if (isForbiddenPath(f)) problems.push(`${f}: env file must not be committed`);
    let buf;
    try {
      buf = readFileSync(`${cwd}/${f}`);
    } catch {
      continue; // deleted in the working tree
    }
    if (buf.includes(0)) continue; // binary (pdf, ico, ...)
    const text = buf.toString("utf8");
    for (const s of findSecrets(text)) problems.push(`${f}:${s.line}: looks like a ${s.name} (${s.preview})`);
    if (f.split("/").pop() === ".env.example") {
      for (const p of envExampleProblems(text)) problems.push(`${f}:${p.line}: ${p.key} has a value; the template must be empty`);
    }
  }
  return { files: files.length, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { files, problems } = scanTrackedFiles();
  if (problems.length) {
    console.error(`check-secrets: FAILED (${problems.length} problem(s) in ${files} tracked files)`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-secrets: OK (${files} tracked files, no secrets found)`);
}
