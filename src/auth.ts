import serializeForm from 'form-urlencoded';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import { parseSetCookie } from './util/cookie';
import {
  USER_AGENT,
  START_SESSION_URL,
  AUTH_TOKEN_SELECTOR,
  LOGIN_POST_URL,
} from './const';
import { User } from './types/user';
import { logger } from './util/logger';
import crypto from 'crypto';
import Keyv from 'keyv';
import KeyvFile from 'keyv-file';

const log = logger('epcal:auth');

const keyv = new Keyv({
  store: new KeyvFile({
    filename: 'cookie-cache.json',
    writeDelay: 0,
  }),
}) as Keyv<string>;

// Note: this is not meant to provide any kind of security
const getUserCacheKey = (user: User): string =>
  crypto
    .createHash('sha256')
    .update(user.email + user.password)
    .digest('hex');

const cacheUserCookie = (user: User, cookie: string) =>
  keyv.set(getUserCacheKey(user), cookie);

const getCachedUserCookie = (user: User) => keyv.get(getUserCacheKey(user));

/**
 * Log in to episodecalendar.com to retrieve a session cookie
 */
export const authenticate = async (user: User): Promise<string> => {
  log('checking if cookie is cached');
  const cachedCookie = await getCachedUserCookie(user);
  if (cachedCookie != null) {
    // TODO: use cookie's expire time to set ttl for cache
    log('cookie is cached, returning cached cookie');
    return cachedCookie;
  }

  log('cookie is not cached');

  log('starting authentication process');

  const { authToken, sessionCookie } = await initSession();
  log('session initialized');

  const _sessionCookie = await login(authToken, sessionCookie, user);
  log('logged in');

  log('saving cookie to cache', _sessionCookie);

  await cacheUserCookie(user, _sessionCookie);

  log('cookie saved to cache');

  return _sessionCookie;
};

const initSession = async (): Promise<{
  authToken: string;
  sessionCookie: string;
}> => {
  const res = await fetch(START_SESSION_URL, {
    headers: {
      Accept: 'text/html',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    throw new Error(
      `initSession call failed: unexpected status code ${res.status}`,
    );
  }

  const sessionCookie = parseSetCookie(res.headers);

  const authToken = cheerio
    .load(await res.text())(AUTH_TOKEN_SELECTOR)
    .attr('value');

  if (typeof authToken !== 'string' || !authToken.length) {
    throw new Error('unable to extract auth token from initSession response');
  }

  return {
    authToken,
    sessionCookie,
  };
};

const login = async (
  authToken: string,
  sessionCookie: string,
  user: User,
): Promise<string> => {
  const res = await fetch(LOGIN_POST_URL, {
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
