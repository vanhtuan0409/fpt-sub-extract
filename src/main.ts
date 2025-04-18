import { chromium, Page, Response } from "playwright";
import { parseArgs } from "node:util";

const CHROME_BIN = "/usr/bin/google-chrome-stable";

function debug(msg: string) {
  process.stderr.write(msg + "\n");
}

async function filterResponse(resp: Response): Promise<boolean> {
  if (!resp.ok()) return false;

  const contentType = await resp
    .headerValues("content-type")
    .then((s) => s.join(","));

  return contentType === "application/octet-stream";
}

async function eventListener(resp: Response) {
  if (await filterResponse(resp)) {
    console.log(resp.url());
  }
}

async function runInspect(page: Page, requestedUrl: string) {
  page.on("response", eventListener);
  await page.goto(requestedUrl);
}

async function getFirst(page: Page, requestedUrl: string) {
  const p = page.waitForResponse(filterResponse, { timeout: 30_000 });
  await page.goto(requestedUrl);
  const resp = await p;
  console.log(resp.url());
}

async function main() {
  const { values: optValues, positionals } = parseArgs({
    options: {
      inspect: { type: "boolean", short: "i", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });
  if (optValues.help) {
    debug("fpt-sub-extract <input_url> [--inspect]");
    return;
  }

  const requestedUrl = positionals[0];
  if (typeof requestedUrl === "undefined") throw new Error("missing input url");
  debug(`using chrome bin ${CHROME_BIN}`);
  debug(`processing link ${requestedUrl}`);

  const browser = await chromium.launch({
    executablePath: CHROME_BIN,
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  if (optValues.inspect) {
    await runInspect(page, requestedUrl);
  } else {
    await getFirst(page, requestedUrl);
    await browser.close();
  }
}

main();
