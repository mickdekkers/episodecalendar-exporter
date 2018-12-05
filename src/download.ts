import debug from 'debug';
import filesize from 'filesize';
import * as fs from 'fs';
import fetch from 'node-fetch';
import progressStream from 'progress-stream';
import * as puppeteer from 'puppeteer';

const log = debug('epcal:download');

/**
 * Create a Promise that resolves when a stream ends
 * or rejects when an error occurs
 * @param stream
 */
const streamCompletion = (
  stream: NodeJS.ReadableStream | NodeJS.WritableStream,
): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

/**
 * Simple helper function that converts a cookie object to a name=value string
 */
const stringifyCookie = ({name, value}: puppeteer.Cookie): string =>
  `${name}=${value}`;

/**
 * Download the user data json given a session cookie for authentication
 */
export const download = async (
  sessionCookie: puppeteer.Cookie,
): Promise<void> => {
  log('requesting data');
  const res = await fetch('https://episodecalendar.com/en/export_data/json', {
    headers: {
      Cookie: stringifyCookie(sessionCookie),
    },
  });

  // TODO: proper error handling
  if (res.status !== 200) {
    throw new Error(`Unexpected response code ${res.status}`);
  }

  log(`connection established (${res.status}), downloading data`);

  const file = fs.createWriteStream('user-data.json');

  const progress = progressStream({
    length: res.size,
    time: 100,
  });

  progress.on('progress', (p) => {
    log(
      `download progress: ${filesize(p.transferred)}/?? @ ${filesize(
        p.speed,
      )}/s`,
    );
  });

  // TODO: streamed json formatting
  await streamCompletion(res.body.pipe(progress).pipe(file));

  log('download complete');
};
