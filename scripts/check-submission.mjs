import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync } from "node:fs";

// Include proposed source changes, but never inspect ignored local credentials/data.
const files = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];
const limit = 10_000_000;
let bytes = 0;
const problems = [];
for (const file of files) {
  if (!existsSync(file)) continue;
  const size = statSync(file).size;
  bytes += size;
  if (
    /(^|\/)(node_modules|artifacts|\.data|\.next|\.next-production|\.vercel)\//.test(
      file,
    ) ||
    /(^|\/)\.env(?!\.example$)/.test(file) ||
    /\.(mp4|wav|mp3|webm|pem|key)$/i.test(file)
  )
    problems.push(
      `Exclude generated media, local data, or credentials: ${file}`,
    );
  if (/\.(ts|tsx|js|mjs|json|ya?ml|md|example)$/.test(file) && size < limit) {
    const content = readFileSync(file, "utf8");
    if (
      /sk-(?:proj-)?[A-Za-z0-9_-]{32,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
        content,
      )
    )
      problems.push(`Possible secret found in ${file}; value suppressed.`);
  }
}
console.log(
  `Submission source: ${files.length} files, ${(bytes / 1_000_000).toFixed(2)} MB (limit: <10 MB).`,
);
if (bytes >= limit)
  problems.push("Source exceeds the submission's 10 MB limit.");
console.log(
  "Public GitHub access and an accessible YouTube/Drive video link must also be checked before submission.",
);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
}
