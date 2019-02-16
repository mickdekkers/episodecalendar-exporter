import { exportData } from './download';
import { authenticate } from './auth';
import { User } from './types/user';
import { logger } from './util/logger';

const log = logger('epcal:main');

/**
 * The main function
 */
const main = async (): Promise<void> => {
  log('starting');
  log('reading user from env');
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

  log('no session cookie, logging in');
  const sessionCookie = await authenticate(user as User);
  log('session cookie retrieved');

  log('downloading user data');
  await exportData(sessionCookie);
  log('done');
};

main();
