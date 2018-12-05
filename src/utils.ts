import debug from 'debug';
import * as puppeteer from 'puppeteer';

const log = debug('epcal:utils');

/**
 * Wrapper around page.click() with workaround for https://github.com/GoogleChrome/puppeteer/issues/2977
 * @param page
 * @param selector
 */
export const click = async (
  page: puppeteer.Page,
  selector: string,
): Promise<void> => {
  try {
    await page.click(selector);
  } catch (error) {
    if (error.message === 'Node is either not visible or not an HTMLElement') {
      log(
        '"Node not visible" error encountered, using page.evaluate workaround to click element',
      );
      await page.evaluate((selector) => {
        const element = document.querySelector(selector) as HTMLElement;
        element.click();
      }, selector);
      return;
    }
    throw error;
  }
};
