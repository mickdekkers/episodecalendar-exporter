import debug from 'debug';
import filesize from 'filesize';
import fetch from 'node-fetch';
import progressStream from 'progress-stream';
import * as puppeteer from 'puppeteer';
import {getS3} from './s3';

const log = debug('epcal:download');

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
  const s3 = getS3();

  log('requesting data');
  const res = await fetch('https://episodecalendar.com/en/export_data/json', {
    headers: {
      Cookie: stringifyCookie(sessionCookie),
    },
  });

  // TODO: implement proper error handling
  if (res.status !== 200) {
    throw new Error(`Unexpected response code ${res.status}`);
  }

  log(`connection established (${res.status}), downloading data`);

  // const progress = progressStream({
  //   length: res.size,
  //   time: 100,
  // });

  // progress.on('progress', (p) => {
  //   log(
  //     `download progress: ${filesize(p.transferred)}/?? @ ${filesize(
  //       p.speed,
  //     )}/s`,
  //   );
  // });

  // TODO: streamed json formatting
  await s3
    .upload({
      Bucket: 'epcal',
      Key: 'exports/export.json',
      Body: await res.text(),
      ContentType: 'application/json',
    })
    .promise();

  log('download complete');
};
