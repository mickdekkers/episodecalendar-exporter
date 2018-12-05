import launchChrome from '@serverless-chrome/lambda';
import debug from 'debug';
import * as puppeteer from 'puppeteer';
import fetch from 'node-fetch';

const log = debug('epcal:browser');

const getDebuggerUrl = async (baseUrl: string): Promise<string> => {
  const data = await fetch(`${baseUrl}/json/version`, {
    method: 'get',
    timeout: 5000,
  }).then((res) => res.json());

  if (data != null && typeof data.webSocketDebuggerUrl === 'string') {
    return data.webSocketDebuggerUrl;
  }

  throw new Error("Couldn't find debugger url in response");
};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.94 Safari/537.36';

export const getBrowser = async ({
  userAgent = DEFAULT_USER_AGENT,
  slowMo = 0,
} = {}) => {
  log('getting browser');

  log('spawning chrome instance');
  let slsChrome = await launchChrome({
    flags: ['--enable-automation', `--user-agent="${userAgent}"`],
  });
  log('chrome instance spawned');

  log('getting debugger url from: %s', slsChrome.url);
  const debuggerUrl = await getDebuggerUrl(slsChrome.url);
  log('got debugger url: %s', debuggerUrl);

  log('connecting puppeteer');
  let browser = await puppeteer.connect({
    browserWSEndpoint: debuggerUrl,
    // @ts-ignore TODO: update puppeteer typings to include this option
    slowMo,
  });
  log('puppeteer connected');

  log('browser ready');

  return {
    browser,
    async shutdown() {
      log('shutting down browser');

      log('disconnecting puppeteer');
      if (browser != null) {
        await browser.disconnect();
        browser = null;
        log('puppeteer disconnected');
      } else {
        log('puppeteer was already disconnected');
      }

      log('killing chrome instance');
      if (slsChrome != null) {
        await slsChrome.kill();
        slsChrome = null;
        log('chrome instance killed');
      } else {
        log('chrome instance was already killed');
      }

      log('browser shut down');
    },
  };
};
