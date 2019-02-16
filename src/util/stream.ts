/**
 * Create a Promise that resolves when a stream ends
 * or rejects when an error occurs
 * @param stream
 */
export const streamCompletion = <
  T extends NodeJS.ReadableStream | NodeJS.WritableStream
>(
  stream: T,
) =>
  new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
