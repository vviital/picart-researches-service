import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import {toString, omitBy, isNil} from 'lodash';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Research, {Types} from '../datasource/researches.mongo';

const defaultProjection = { password: 0, _id: 0 };

const router = new Router({
  prefix: '/researches',
});

router.get('/', auth, async (ctx: Context) => {
  const fieldsToSearch = ['name', 'description'];
  const options = {
    query: toString(ctx.query['query']),
    limit: +ctx.query['limit'] || 100,
    offset: +ctx.query['offset'] || 0
  };

  const regex = new RegExp(options.query.split('').map((s) => `.*${s}`).join(''), 'gmi');

  const researches = await Research
    .find({
      $or: fieldsToSearch.map((field) => ({[field]: {$regex: regex}}))
    }, defaultProjection)
    .skip(options.offset)
    .limit(options.limit);
  sendResponse(ctx, 200, {
    items: researches.map(x => x.toJSON({ virtuals: true })),
    limit: options.limit,
    offset: options.offset,
    totalCount: researches.length,
    type: 'collection',
  });
});

router.get('/supportedTypes', async (ctx: Context) => {
  return sendResponse(ctx, 200, Types);
});

const extractResearchParams = (ctx: Context) => ({
  researchType: ctx.request.body.about,
  name: ctx.request.body.email,
  description: ctx.request.body.login,
  ownerID: ctx.request.body.name
});

router.use(koaBody());

router.post('/', auth, async (ctx: Context) => {
  const research = new Research(extractResearchParams(ctx));
  const result = await research.save();
  sendResponse(ctx, 201, result.toJSON({ virtuals: true }));
});

router.get('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;
  const research = await Research.findOne({ id }, defaultProjection);

  if (!research) {
    return sendError(ctx, 404, { message: 'Research not found' });
  }

  sendResponse(ctx, 200, research.toJSON({ virtuals: true }));
});

router.patch('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;
  const fields = omitBy(extractResearchParams(ctx), isNil);

  await Research.updateOne({ id }, { $set: fields });

  const research = await Research.findOne({ id }, defaultProjection);

  if (research) {
    sendResponse(ctx, 200, research.toJSON({ virtuals: true }));
  }

  sendResponse(ctx, 200, {});
});

router.delete('/:id', auth, async (ctx: Context) => {
  const id = ctx.params.id;

  await Research.deleteOne({ id });

  sendResponse(ctx, 204);
});

export default router;
