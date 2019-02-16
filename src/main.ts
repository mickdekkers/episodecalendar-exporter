import fs from 'fs';
import fetch, { Headers } from 'node-fetch';
import filesize from 'filesize';
import progressStream from 'progress-stream';
import cheerio from 'cheerio';
import { parse, splitCookiesString } from 'set-cookie-parser';
import serializeForm from 'form-urlencoded';
import debug from 'debug';

const debugEpcal = debug('epcal:main');
const debugAuth = debug('epcal:login');
const debugDown = debug('epcal:download');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36';

/**
 * Create a Promise that resolves when a stream ends
 * or rejects when an error occurs
 * @param stream
 */
const streamCompletion = <
  T extends NodeJS.ReadableStream | NodeJS.WritableStream
>(
  stream: T,
) =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

const parseSetCookie = (headers: Headers): string => {
  const SESSION_TOKEN_KEY = '_episodecalendar_session';
  const setCookieHeader = headers.get('Set-Cookie');

  if (!setCookieHeader) {
    throw new Error('Unable to get session: no Set-Cookie header present');
  }

  const parsedHeader = parse(splitCookiesString(setCookieHeader), {
    map: true,
    decodeValues: false,
  });

  if (!parsedHeader[SESSION_TOKEN_KEY]) {
    throw new Error(
      `Unable to get session: Set-Cookie header has no ${SESSION_TOKEN_KEY} value`,
    );
  }

  const session = parsedHeader[SESSION_TOKEN_KEY].value;

  return `${SESSION_TOKEN_KEY}=${session}`;
};

const getSession = async (): Promise<{
  authToken: string;
  sessionCookie: string;
}> => {
  const res = await fetch('https://episodecalendar.com/en/account/sign_in', {
    headers: {
      Accept: 'text/html',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(
      `getSession call failed: unexpected status code ${res.status}`,
    );
  }

  const sessionCookie = parseSetCookie(res.headers);

  const authToken = cheerio
    .load(await res.text())(
      'form[action="/users/sign_in"] input[name=authenticity_token]',
    )
    .attr('value');

  if (typeof authToken !== 'string' || !authToken.length) {
    throw new Error('unable to extract auth token from getSession response');
  }

  return {
    authToken,
    sessionCookie,
  };
};

interface User {
  email: string;
  password: string;
}

const login = async (
  authToken: string,
  sessionCookie: string,
  user: User,
): Promise<string> => {
  const res = await fetch('https://episodecalendar.com/users/sign_in', {
    // Don't follow redirects; the headers we need are in the first response
    redirect: 'manual',
    method: 'POST',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: `${sessionCookie}; omniauth_remember_me=true`,
      'User-Agent': USER_AGENT,
    },
    body: serializeForm({
      authenticity_token: authToken,
      'user[email]': user.email,
      'user[password]': user.password,
      'user[remember_me]': '1',
    }),
  });

  if (!(res.status >= 200 && res.status < 400)) {
    throw new Error(`login call failed: unexpected status code ${res.status}`);
  }

  // TODO: do we want/need to return the `remember_user_token` cookie as well?
  return parseSetCookie(res.headers);
};

/**
 * Log in to episodecalendar.com to retrieve a session cookie
 */
const authenticate = async (user: User): Promise<string> => {
  debugAuth('starting authentication process');

  const { authToken, sessionCookie } = await getSession();
  debugAuth('session initialized');

  const _sessionCookie = login(authToken, sessionCookie, user);
  debugAuth('logged in');

  return _sessionCookie;
};

/**
 * Download the user data csv given a session cookie for authentication
 */
const downloadUserData = async (sessionCookie: string): Promise<void> => {
  debugDown('requesting data');
  const res = await fetch('https://episodecalendar.com/en/export_data/csv', {
    headers: {
      Accept: 'text/csv',
      Cookie: sessionCookie,
    },
  });

  // TODO: proper error handling
  if (!res.ok) {
    throw new Error(`download failed: unexpected status code ${res.status}`);
  }

  debugDown(`connection established (${res.status}), downloading data`);

  const file = fs.createWriteStream('user-data.csv');

  const progress = progressStream({
    length: res.size,
    time: 100,
  });

  progress.on('progress', (p) => {
    debugDown(
      `download progress: ${filesize(p.transferred)}/?? @ ${filesize(
        p.speed,
      )}/s`,
    );
  });

  await streamCompletion(res.body.pipe(progress).pipe(file));

  debugDown('download complete');
};

/**
 * The main function
 */
const main = async (): Promise<void> => {
  debugEpcal('starting');
  debugEpcal('reading user from env');
  const user: Partial<User> = {
    email: process.env.EPISODECALENDAR_EMAIL,
    password: process.env.EPISODECALENDAR_PASSWORD,
  };

  if (user.email == null) {
    throw new Error(
      'email must be set in EPISODECALENDAR_EMAIL environment variable',
    );
  }

  if (user.password == null) {
    throw new Error(
      'password must be set in EPISODECALENDAR_PASSWORD environment variable',
    );
  }

  debugEpcal('no session cookie, logging in');
  const sessionCookie = await authenticate(user as User);
  debugEpcal('session cookie retrieved');

  debugEpcal('downloading user data');
  await downloadUserData(sessionCookie);
  debugEpcal('done');
};

main();
