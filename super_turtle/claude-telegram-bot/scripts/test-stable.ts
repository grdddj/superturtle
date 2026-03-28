import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

async function collectTestFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(entryPath);
      }
      if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        return [entryPath];
      }
      return [];
    }),
  );

  return files.flat();
}

const packageRoot = process.cwd();
const explicitTargets = process.argv.slice(2).map((target) => resolve(packageRoot, target));
const discoveredTargets =
  explicitTargets.length > 0
    ? explicitTargets
    : await collectTestFiles(resolve(packageRoot, "src"));
const testFiles = discoveredTargets
  .map((file) => relative(packageRoot, file))
  .sort((left, right) => left.localeCompare(right));

if (testFiles.length === 0) {
  console.error("No test files found for stable test run.");
  process.exit(1);
}

const bunExecutable = process.execPath;

for (const [index, testFile] of testFiles.entries()) {
  console.log(`[${index + 1}/${testFiles.length}] bun test ${testFile}`);
  const child = Bun.spawn([bunExecutable, "test", testFile], {
    cwd: packageRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    console.error(`Stable test run failed. Reproduce with: bun test ${testFile}`);
    process.exit(exitCode);
  }
}

console.log(`Stable test run passed across ${testFiles.length} files.`);
