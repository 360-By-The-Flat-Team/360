import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { execSync } from "child_process";

const ROOT = process.cwd();
const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function main() {
  const files = collectFiles([".html", ".css", ".js"]);

  const payload = {
    files: files.map((file) => ({
      path: file,
      content: fs.readFileSync(path.join(ROOT, file), "utf8"),
    })),
  };

  const res = await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("AI autofix failed:", res.status, await res.text());
    process.exit(1);
  }

  const result = await res.json();
  const { fixes = [], complexFixes = [], warnings = [] } = result;

  if (warnings.length) {
    console.log("Warnings from AI:");
    warnings.forEach((w) => console.log(" -", w));
  }

  // SIMPLE FIXES → AUTO APPLY
  for (const fix of fixes) applyFix(fix);

  if (fixes.length) {
    commit("Autofix: simple AI fixes");
  }

  // COMPLEX FIXES → PR
  if (complexFixes.length) {
    const branch = `ai-autofix-${Date.now()}`;
    execSync(`git checkout -b ${branch}`, { stdio: "inherit" });

    for (const fix of complexFixes) applyFix(fix);

    execSync("git add .", { stdio: "inherit" });
    execSync("git commit -m 'AI suggested complex fixes'", {
      stdio: "inherit",
    });
    execSync(`git push origin ${branch}`, { stdio: "inherit" });

    await createPR(branch, "AI Autofix (complex changes)", "AI suggested complex fixes. Please review.");
  }
}

function collectFiles(extensions) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (full.includes(".git")) continue;
        walk(full);
      } else {
        if (extensions.some((ext) => full.endsWith(ext))) {
          out.push(path.relative(ROOT, full));
        }
      }
    }
  }
  walk(ROOT);
  return out;
}

function applyFix(fix) {
  const filePath = path.join(ROOT, fix.file);
  let content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  if (fix.type === "replace") {
    content = content.replace(fix.target, fix.replacement);
  } else if (fix.type === "append") {
    content += "\n" + fix.content;
  } else if (fix.type === "overwrite") {
    content = fix.content;
  }

  fs.writeFileSync(filePath, content, "utf8");
}

function commit(message) {
  execSync("git config user.name 'github-actions'", { stdio: "inherit" });
  execSync("git config user.email 'github-actions@github.com'", {
    stdio: "inherit",
  });
  execSync("git add .", { stdio: "inherit" });
  execSync(`git commit -m "${message}" || echo 'No commit'`, {
    stdio: "inherit",
  });
  execSync("git push", { stdio: "inherit" });
}

async function createPR(branch, title, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const url = `https://api.github.com/repos/${repo}/pulls`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      head: branch,
      base: "main",
      body,
    }),
  });

  if (!res.ok) {
    console.error("Failed to create PR:", res.status, await res.text());
  } else {
    console.log("PR created:", (await res.json()).html_url);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
