// Type definitions for set-cookie-parser
// Project: https://github.com/nfriedly/set-cookie-parser
// Definitions by: Nick Paddock <https://github.com/nickp10>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

// TODO: contribute ParseOptions addition to DefinitelyTyped

declare module 'set-cookie-parser' {
  import http = require('http');

  // TODO: see if we can avoid duplicating this definition. Ideally we'd use the one defined at SetCookieParser.parse
  function SetCookieParser(
    input: string | ReadonlyArray<string> | http.IncomingMessage,
    options: SetCookieParser.ParseOptions & { map: true },
  ): SetCookieParser.CookieMap;
  function SetCookieParser(
    input: string | ReadonlyArray<string> | http.IncomingMessage,
    options?: SetCookieParser.ParseOptions,
  ): SetCookieParser.Cookie[];

  namespace SetCookieParser {
    function parse(
      input: string | ReadonlyArray<string> | http.IncomingMessage,
      options: ParseOptions & { map: true },
    ): CookieMap;
    function parse(
      input: string | ReadonlyArray<string> | http.IncomingMessage,
      options?: ParseOptions,
    ): Cookie[];

    function splitCookiesString(
      input: string | ReadonlyArray<string> | void,
    ): string[];

    interface ParseOptions {
      decodeValues?: boolean;
      map?: boolean;
    }

    interface CookieMap {
      [key: string]: Cookie;
    }

    interface Cookie {
      name: string;
      value: string;
      path?: string;
      expires?: Date;
      maxAge?: number;
      domain?: string;
      secure?: boolean;
      httpOnly?: boolean;
    }
  }

  export = SetCookieParser;
}
