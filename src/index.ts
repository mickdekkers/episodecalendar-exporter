import {APIGatewayProxyHandler} from 'aws-lambda';
import {download} from './download';
import {login} from './login';
import debug from 'debug';
import FileAsync from 'lowdb/adapters/FileAsync';
import low from 'lowdb';

const log = debug('epcal:main');

export const doExport = async (): Promise<void> => {
  log('starting');

  log('reading user credentials from env');
  const user = {
    email: process.env.EPISODECALENDAR_EMAIL,
    password: process.env.EPISODECALENDAR_PASSWORD,
  };

  if (typeof user.email !== 'string' || user.email.length === 0) {
    throw new Error('user email is missing');
  }
  if (typeof user.password !== 'string' || user.password.length === 0) {
    throw new Error('user password is missing');
  }

  log('connecting to db');
  const db = await low(new FileAsync('db.json'));
  await db.defaults({sessionCookie: null}).write();
  log('connected to db');

  // TODO: handle expired session
  // let sessionCookie = null;
  let sessionCookie = await db.get('sessionCookie').value();
  if (sessionCookie == null) {
    log('no session cookie, logging in');
    sessionCookie = await login(user);
    log('writing session cookie to db');
    // TODO: store this in some better place
    await db.set('sessionCookie', sessionCookie).write();
  }

  log('session cookie retrieved');
  log('downloading user data');

  await download(sessionCookie);

  log('done');
};

/**
 * The main handler
 */
export const handler: APIGatewayProxyHandler = async (
  event,
  context,
  callback,
) => {
  try {
    await doExport();
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: error.toString(),
    };
  }

  return {
    statusCode: 200,
    body: '',
  };
};
