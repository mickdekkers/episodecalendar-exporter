import AWS from 'aws-sdk';
import {isOffline} from './utils';

export const getS3 = (options: AWS.S3.ClientConfiguration = {}) => {
  const fixedOptions: AWS.S3.ClientConfiguration = {
    apiVersion: '2006-03-01',
    s3ForcePathStyle: true,
  };

  let localEndpoint = '';
  if (isOffline) {
    localEndpoint = process.env.LOCAL_S3_ENDPOINT;
    if (typeof localEndpoint !== 'string' || localEndpoint.length === 0) {
      throw new Error(
        'Using serverless-offline but LOCAL_S3_ENDPOINT env variable is missing',
      );
    }
  }

  const envOptions: AWS.S3.ClientConfiguration = isOffline
    ? {
        endpoint: localEndpoint,
      }
    : {
        region: 'eu-west-1',
      };

  return new AWS.S3({
    ...fixedOptions,
    ...envOptions,
    ...options,
  });
};
