import * as Koa from 'koa';
import * as mongoose from 'mongoose';

import * as logger from 'koa-logger';
import * as cors from '@koa/cors';

import config from './config';
import { experiments, researches, service } from './routes';

const createApp = async () => {
  const app = new Koa();
  app.use(cors());
  app.use(logger());

  app.use(experiments.routes());
  app.use(researches.routes());
  app.use(service.routes());

  await mongoose.connect(config.mongoURL, { useNewUrlParser: true });

  const server = app.listen(config.port, () => {
    console.log('Researches service started');
  });

  return {
    destroy: async () => {
      server.close();
      await mongoose.disconnect();
    },
  };
};

export default createApp;
