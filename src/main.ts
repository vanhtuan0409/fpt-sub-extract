import { chromium } from "playwright";

const CHROME_BIN = "/usr/bin/google-chrome-stable";

function getRequestedLink() {
  if (process.argv.length !== 3) {
    throw new Error("missing requested fpt play url");
  }
  const url = process.argv[2];
  return url;
}

function debug(msg: string) {
  process.stderr.write(msg + "\n");
}

async function main() {
  const requestedUrl = getRequestedLink();
  debug(`using chrome bin ${CHROME_BIN}`);
  debug(`processing link ${requestedUrl}`);

  const browser = await chromium.launch({
    executablePath: CHROME_BIN,
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const p = page.waitForResponse((request) => {
    const requestedUrl = request.url();
    if (requestedUrl.endsWith("vtt")) {
      return true;
    }
    return false;
  }, { timeout: 30_000 });
  await page.goto(requestedUrl);

  const resp = await p;
  debug(`found vtt url ${resp.request().url()}`);
  const body = await resp.text();
  process.stdout.write(body);
  await browser.close();
}

main();
