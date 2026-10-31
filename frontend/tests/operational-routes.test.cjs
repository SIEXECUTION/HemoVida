const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../src");
function graph(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const s = fs.readFileSync(file, "utf8");
  for (const m of s.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    const base = path.resolve(path.dirname(file), m[1]);
    const target = [
      base,
      base + ".tsx",
      base + ".ts",
      path.join(base, "index.ts"),
    ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (target && /\.tsx?$/.test(target)) graph(target, seen);
  }
  return seen;
}
test("El recorrido operativo no importa datos o pantallas simuladas", () => {
  const files = [...graph(path.join(root, "App.tsx"))];
  assert.ok(files.some((p) => p.endsWith("ClinicalCircuit.tsx")));
  for (const p of files) {
    const s = fs.readFileSync(p, "utf8");
    assert.doesNotMatch(s, /MOCK_|mockData/, "Archivo: " + p);
    if (!p.endsWith("security.ts"))
      assert.equal(
        /generateForensicIp\s*\(/.test(s),
        false,
        "Auditoría ficticia: " + p,
      );
    assert.doesNotMatch(
      s,
      /localStorage\.(?:setItem|getItem)/,
      "Sin persistencia operativa local: " + p,
    );
  }
});
test("Los errores de tipos bloquean la compilación", () => {
  assert.match(require("../package.json").scripts.build, /tsc --noEmit/);
});
