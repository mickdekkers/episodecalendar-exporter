// Type definitions for @serverless-chrome/lambda 1.0.0-55
// Project: https://github.com/adieuadieu/serverless-chrome
// Definitions by: Mick Dekkers <https://github.com/mickdekkers>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.0

declare module '@serverless-chrome/lambda' {
  interface LaunchOptions {
    flags?: string[];
    chromePath?: string;
    port?: number;
    forceLambdaLauncher?: boolean;
  }

  interface LaunchedChrome {
    pid: number;
    port: number;
    url: string;
    log: string;
    errorLog: string;
    pidFile: string;
    metaData: {
      launchTime: number;
      didLaunch: boolean;
    };
    kill(): Promise<void>;
  }

  function launch(options?: LaunchOptions): Promise<LaunchedChrome>;

  export default launch;
}
