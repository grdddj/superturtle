import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

async function findBunVersionFile(startDir: string): Promise<string | null> {
  let currentDir = resolve(startDir);

  while (true) {
    const candidate = join(currentDir, ".bun-version");
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Keep walking upward until we hit the filesystem root.
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

const versionFile = await findBunVersionFile(process.cwd());
if (!versionFile) {
  console.error("Missing .bun-version. Add one at the repo root before running CI verification.");
  process.exit(1);
}

const expectedVersion = (await Bun.file(versionFile).text()).trim();
if (!expectedVersion) {
  console.error(`.bun-version at ${versionFile} is empty.`);
  process.exit(1);
}

if (Bun.version !== expectedVersion) {
  console.error(
    `Bun version mismatch: expected ${expectedVersion} from ${versionFile}, got ${Bun.version}.`,
  );
  process.exit(1);
}

console.log(`Using pinned Bun ${Bun.version} from ${versionFile}.`);
