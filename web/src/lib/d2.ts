import type { D2 } from "@terrastruct/d2";

/**
 * Renders D2 diagrams. The D2 compiler is ~8 MB (WebAssembly), so it loads
 * only when a page has a ```d2 block.
 */
let d2: Promise<D2> | null = null;
let salt = 0;
// D2's worker hangs when given two jobs at once, so every diagram waits its turn.
let queue: Promise<unknown> = Promise.resolve();

/** Light and dark SVGs; CSS shows the one matching the app's theme toggle. */
export function renderD2(source: string): Promise<string> {
  const job = queue.then(() => render(source));
  queue = job.catch(() => {});
  return job;
}

async function render(source: string) {
  d2 ??= import("@terrastruct/d2").then((m) => new m.D2());
  const client = await d2;
  const { diagram, renderOptions } = await client.compile(source).catch((err: unknown) => {
    // Errors arrive as JSON, e.g. [{"errmsg":"index:1:1: connection missing destination"}].
    const messages = [...String(err).matchAll(/"errmsg":"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/^index:/, "line "));
    throw new Error(messages.length ? messages.join("\n") : String(err));
  });
  const id = ++salt;
  const svgs: string[] = [];
  for (const [themeID, cls] of [[0, "d2-light"], [200, "d2-dark"]] as const) {
    const svg = await client.render(diagram, { ...renderOptions, themeID, pad: 16, noXMLTag: true, salt: `${cls}${id}` });
    svgs.push(naturalSize(svg, cls));
  }
  return svgs.join("");
}

// D2's SVG has only a viewBox, so it would stretch to the column; give it its own size.
function naturalSize(svg: string, cls: string) {
  const box = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  const size = box ? ` width="${box[1]}" height="${box[2]}"` : "";
  return svg.replace("<svg", `<svg class="${cls}"${size}`);
}
