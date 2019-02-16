import { parse, splitCookiesString } from 'set-cookie-parser';
import { Headers } from 'node-fetch';
import { SESSION_TOKEN_KEY } from '../const';

export const parseSetCookie = (headers: Headers): string => {
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
