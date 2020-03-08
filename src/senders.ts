import { Context } from 'koa';

const sendError = (ctx: Context, status: number, resp: object) => {
  ctx.status = status;
  ctx.body = resp;
};

const sendResponse = (ctx: Context, status: number, resp?: object) => {
  ctx.status = status;

  if (resp) {
    ctx.body = resp;
  }
};

export {
  sendError,
  sendResponse,
};
