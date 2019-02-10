import debug from 'debug';
import * as puppeteer from 'puppeteer';
import {getBrowser} from './browser';
import {click, isOffline} from './utils';

const log = debug('epcal:login');

/**
 * Log in to episodecalendar.com to retrieve a session cookie
 * @param user - The user to log in as
 * @returns The session cookie
 */
export const login = async (user: {
  email: string;
  password: string;
}): Promise<puppeteer.Cookie> => {
  // Launch browser
  log('launching browser');
  const {browser, shutdown} = await getBrowser({
    slowMo: isOffline ? 100 : 0,
  });

  try {
    // Get page handle
    log('getting page handle');
    const [page] = await browser.pages();

    // Go to the login page
    log('navigating to login page');
    await page.goto('https://episodecalendar.com/en/account/sign_in');

    // Enter email
    log('entering email address');
    await page.type('input#user_email', user.email);

    // Enter password
    log('entering password');
    await page.type('input#user_password', user.password);

    // Click remember
    log('clicking remember me');
    await click(page, 'input#user_remember_me');

    // Click submit
    log('submitting login form');
    await page.click('input[type="submit"]');

    // Wait for next page to load
    log('waiting for next page load');
    await page.waitForNavigation();

    // Read session cookie
    log('reading session cookie');
    const sessionCookie = (await page.cookies()).find(
      (x) => x.name === '_episodecalendar_session',
    );

    return sessionCookie;
  } finally {
    // Close browser
    log('shutting down browser');
    await shutdown();
    log('browser shut down');
  }
};
