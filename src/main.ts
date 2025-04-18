import { chromium, Page, Response } from "playwright";
import { parseArgs } from "node:util";

const CHROME_BIN = "/usr/bin/google-chrome-stable";

function debug(msg: string) {
  process.stderr.write(msg + "\n");
}

function filterResponse(pattern?: string) {
  return async function (resp: Response): Promise<boolean> {
    if (!resp.ok()) return false;

    const contentType = await resp
      .headerValues("content-type")
      .then((s) => s.join(","));

    if (contentType !== "application/octet-stream") return false;
    if (typeof pattern === "undefined" || pattern === "") return true;

    return new RegExp(pattern).test(resp.url());
  };
}

async function runInspect(page: Page, requestedUrl: string, pattern?: string) {
  const filterFn = filterResponse(pattern);
  page.on("response", async (resp) => {
    if (await filterFn(resp)) {
      console.log(resp.url());
    }
  });
  await page.goto(requestedUrl);
}

async function getFirst(page: Page, requestedUrl: string, pattern?: string) {
  const filterFn = filterResponse(pattern);
  const p = page.waitForResponse(filterFn, { timeout: 30_000 });
  await page.goto(requestedUrl);
  const resp = await p;
  console.log(resp.url());
}

async function main() {
  const { values: optValues, positionals } = parseArgs({
    options: {
      attach: { type: "boolean", default: false },
      chromePort: { type: "string", default: "9222" },
      inspect: { type: "boolean", short: "i", default: false },
      match: { type: "string", short: "m", default: "" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });
  if (optValues.help) {
    debug("fpt-sub-extract <input_url> [--inspect] [--attach] [-m <pattern>]");
    return;
  }

  const requestedUrl = positionals[0];
  if (typeof requestedUrl === "undefined") throw new Error("missing input url");
  debug(`using chrome bin ${CHROME_BIN}`);
  debug(`processing link ${requestedUrl}`);
  debug(`opts: ${JSON.stringify(optValues)}`);

  const browser = optValues.attach
    ? await chromium.connectOverCDP(`http://127.0.0.1:${optValues.chromePort}`)
    : await chromium.launch({
      executablePath: CHROME_BIN,
      headless: true,
    });
  const context = optValues.attach
    ? browser.contexts()[0]
    : await browser.newContext();
  const page = await context.newPage();

  if (optValues.inspect) {
    await runInspect(page, requestedUrl, optValues.match);
  } else {
    await getFirst(page, requestedUrl, optValues.match);
    await browser.close();
  }
}

main();
