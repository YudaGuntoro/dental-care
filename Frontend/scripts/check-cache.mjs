import assert from "node:assert/strict";

// Run against a production server, optionally through Nginx:
// node scripts/check-cache.mjs https://wms.toho.my.id
const origin = process.argv[2] || "http://localhost:3100";
const pages = ["/", "/signin", "/parts", "/locations", "/customers", "/pic-cards", "/users", "/stock-in", "/stock-out", "/item-check"];

function assertUncached(response, path) {
  const cacheControl = response.headers.get("cache-control") || "";
  assert.match(cacheControl, /no-store/i, `${path}: no-store missing`);
  assert.match(cacheControl, /no-cache/i, `${path}: no-cache missing`);
  assert.doesNotMatch(cacheControl, /s-maxage|immutable/i, `${path}: shared/static caching found`);
  assert.equal(response.headers.get("pragma"), "no-cache", `${path}: Pragma`);
  assert.equal(response.headers.get("expires"), "0", `${path}: Expires`);
}

for (const path of [...pages, "/parts?search=cache-check", "/?_rsc=cache-check"]) {
  const response = await fetch(new URL(path, origin), { method: "HEAD", cache: "no-store" });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  assertUncached(response, path);
  console.log(`PASS HEAD ${path}: ${response.headers.get("cache-control")}`);
}

for (const path of ["/api/parts", "/api/stock-movements", "/api/parts/import-template"]) {
  const response = await fetch(new URL(path, origin), { cache: "no-store" });
  assert.equal(response.status, 401, `${path}: expected unauthenticated API response`);
  assertUncached(response, path);
  console.log(`PASS ${path}: uncached API authentication response`);
}

const html = await (await fetch(new URL("/signin", origin))).text();
const scriptPath = html.match(/src="([^" ]*\/_next\/static\/[^" ]+\.js[^" ]*)"/)?.[1];
assert.ok(scriptPath, "No hashed Next.js script found");
const script = await fetch(new URL(scriptPath, origin), { method: "HEAD" });
assert.equal(script.status, 200, "Static JavaScript must load");
assert.match(script.headers.get("cache-control") || "", /max-age=31536000/i);
assert.match(script.headers.get("cache-control") || "", /immutable/i);
assert.doesNotMatch(script.headers.get("cache-control") || "", /no-store/i);
console.log("PASS hashed static JavaScript retains immutable caching");

const icon = await fetch(new URL("/icon.png", origin), { method: "HEAD" });
assert.equal(icon.status, 200);
assert.doesNotMatch(icon.headers.get("cache-control") || "", /no-store/i);
console.log("PASS public image is not covered by page no-store headers");
