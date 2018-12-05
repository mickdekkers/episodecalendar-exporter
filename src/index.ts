import {APIGatewayProxyHandler} from 'aws-lambda';
import {download} from './download';
import {login} from './login';
import debug from 'debug';
import FileAsync from 'lowdb/adapters/FileAsync';
import low from 'lowdb';

const log = debug('epcal:main');

export const doExport = async (): Promise<void> => {
  log('reading user from env');
  // TODO: get this in some better way
  const user = {
    email: process.env.EPCAL_EMAIL,
    // Obligatory note that base64 is not a secure encoding for password storage
    password: new Buffer(process.env.EPCAL_PASS, 'base64').toString('utf8'),
  };

  log('connecting to db');
  const db = await low(new FileAsync('db.json'));
  await db.defaults({sessionCookie: null}).write();
  log('connected to db');

  // TODO: handle expired session
  let sessionCookie = null; // await db.get('sessionCookie').value();
  if (sessionCookie == null) {
    log('no session cookie, logging in');
    sessionCookie = await login(user);
    log('writing session cookie to db');
    // TODO: store this in some better place
    // await db.set('sessionCookie', sessionCookie).write();
  }

  log('session cookie retrieved');
  log('downloading user data');

  // await download(sessionCookie);

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

log('starting');
