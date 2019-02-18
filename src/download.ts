import fetch from 'node-fetch';
import fs from 'fs';
import filesize from 'filesize';
import progressStream from 'progress-stream';
import { streamCompletion } from './util/stream';
import { logger } from './util/logger';
import fecha from 'fecha';

const log = logger('epcal:download');

/**
 * Export the user's data to csv
 */
export const exportData = async (sessionCookie: string): Promise<void> => {
  log('requesting data export');
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

  const filename = `user-data-${fecha.format(
    new Date(),
    'YYYY-MM-DD--HH-mm-ss',
  )}.csv`;

  log(
    `connection established (${
      res.status
    }), downloading data export to ${filename}`,
  );

  const file = fs.createWriteStream(filename);

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

  await streamCompletion(res.body.pipe(progress).pipe(file));

  log('download complete');
};
