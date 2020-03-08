import * as Koa from 'koa';
import * as Router from 'koa-router';

import { sendResponse } from '../senders';

const router = new Router({
  prefix: '/service',
});

router.get('/health', async (ctx: Koa.Context) => {
  sendResponse(ctx, 200, { ok: true });
});

export default router;
