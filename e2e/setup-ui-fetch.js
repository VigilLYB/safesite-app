/**
 * The React Native Jest environment's fetch is an XHR polyfill. The live UI suite needs real
 * networking, so replace it with a small https-based fetch (JSON and text bodies are all it needs).
 */
const https = require("node:https");
const { Buffer } = require("node:buffer");

global.fetch = function nodeFetch(input, init = {}) {
  const url = new URL(String(input));
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      { method: init.method || "GET", headers: init.headers || {} },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const headers = res.headers;
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
            text: async () => buffer.toString("utf8"),
            json: async () => JSON.parse(buffer.toString("utf8")),
          });
        });
      },
    );
    request.on("error", reject);
    if (init.signal)
      init.signal.addEventListener("abort", () => request.destroy(new Error("aborted")));
    if (init.body) request.write(init.body);
    request.end();
  });
};
