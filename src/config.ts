const config = {
  mongoURL: process.env.MONGODB_URL || '',
  port: +(process.env.PORT || '3000'),
  tokenSecret: process.env.TOKEN_SECRET || '',
  zaidelServiceURL: process.env.ZAIDEL_SERVICE_URL
};

export default config;
