const puppeteer = require('puppeteer')

const fs = require('fs')
const fetch = require('node-fetch')
const filesize = require('filesize')
const progressStream = require('progress-stream')

const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')

const debug = require('debug')
const debugEpcal = debug('epcal:main')
const debugLogin = debug('epcal:login')
const debugDown = debug('epcal:download')

/**
 * Create a Promise that resolves when a stream ends
 * or rejects when an error occurs
 * @param {WritableStream|ReadableStream} stream
 * @returns {Promise}
 */
const streamCompletion = stream =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('finish', resolve)
    stream.on('error', reject)
  })

/**
 * Simple helper function that converts a cookie object to a name=value string
 */
const stringifyCookie = ({ name, value }) => `${name}=${value}`

/**
 * Log in to episodecalendar.com to retrieve a session cookie
 * @param {*} db - The db to write the session cookie to
 * @param {*} user - The user to log in as
 * @returns {Promise<{}>} - The session cookie
 */
const login = async (db, user) => {
  // Launch browser
  debugLogin('launching browser')
  const browser = await puppeteer.launch({ headless: true })

  // Open new page
  debugLogin('opening new page')
  const page = await browser.newPage()

  // Go to the login page
  debugLogin('navigating to login page')
  await page.goto('https://episodecalendar.com/en/users/sign_in')

  // Enter email
  debugLogin('entering email address')
  await page.focus('input#user_email')
  await page.type('input#user_email', user.email)

  // Enter password
  debugLogin('entering password')
  await page.focus('input#user_password')
  await page.type('input#user_password', user.password)

  // // Click remember
  // debugLogin('clicking remember me')
  // await page.waitForSelector('input#user_remember_me')
  // await page.('input#user_remember_me')

  // Click submit
  debugLogin('submitting login form')
  await page.click('input[type="submit"]')

  // Wait for next page to load
  debugLogin('waiting for next page load')
  await page.waitForNavigation()

  // Read session cookie
  debugLogin('reading session cookie')
  const sessionCookie = (await page.cookies()).find(
    x => x.name === '_episodecalendar_session',
  )

  // Close browser
  debugLogin('closing browser')
  await browser.close()

  debugLogin('writing session cookie to db')
  await db.set('sessionCookie', sessionCookie).write()

  return sessionCookie
}

/**
 * Download the user data json given a session cookie for authentication
 */
const downloadUserData = async sessionCookie => {
  debugDown('requesting data')
  const res = await fetch('https://episodecalendar.com/en/export_data/json.json', {
    headers: {
      Cookie: stringifyCookie(sessionCookie),
    },
  })

  // TODO: proper error handling
  if (res.status !== 200) {
    throw new Error(`Unexpected response code ${res.status}`)
  }

  debugDown(`connection established (${res.status}), downloading data`)

  const file = fs.createWriteStream('user-data.json')

  const progress = progressStream({
    length: res.size,
    time: 100,
  })

  progress.on('progress', p => {
    debugDown(
      `download progress: ${filesize(p.transferred)}/?? @ ${filesize(
        p.speed,
      )}/s`,
    )
  })

  // TODO: streamed json formatting
  await streamCompletion(res.body.pipe(progress).pipe(file))

  debugDown('download complete')
}

/**
 * The main function
 */
const main = async () => {
  debugEpcal('reading user from env')
  const user = {
    email: process.env.EPCAL_EMAIL,
    // Obligatory note that base64 is not a secure encoding for password storage
    password: new Buffer(process.env.EPCAL_PASS, 'base64').toString('utf8'),
  }

  debugEpcal('connecting to db')
  const db = await low(new FileAsync('db.json'))
  await db.defaults({ sessionCookie: null }).write()
  debugEpcal('connected to db')

  let sessionCookie = await db.get('sessionCookie').value()
  if (sessionCookie == null) {
    debugEpcal('no session cookie, logging in')
    sessionCookie = await login(db, user)
  }

  debugEpcal('session cookie retrieved')
  debugEpcal('downloading user data')

  await downloadUserData(sessionCookie)

  debugEpcal('done')
}

debugEpcal('starting')
main()
