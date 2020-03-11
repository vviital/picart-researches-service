import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import {toString, omit, omitBy, isNil} from 'lodash';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Research, {Types} from '../datasource/researches.mongo';
import {PersonalizedContext} from '../models';

const defaultProjection = { password: 0, _id: 0 };

const router = new Router({
  prefix: '/researches',
});

const toPersonalizedHandler = (fn: (t: PersonalizedContext) => void) => {
  return (ctx: Context) => {
    const context: PersonalizedContext = ctx as PersonalizedContext;

    return fn(context);
  }
};

router.get('/', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const fieldsToSearch = ['name', 'description'];
  const options = {
    query: toString(ctx.query['query']),
    limit: +ctx.query['limit'] || 100,
    offset: +ctx.query['offset'] || 0
  };

  const regex = new RegExp(options.query.split('').map((s) => `.*${s}`).join(''), 'gmi');

  const researches = await Research
    .find({
      $or: fieldsToSearch.map((field) => ({[field]: {$regex: regex}})),
      ownerID: ctx.user.id,
    }, defaultProjection)
    .sort({createdAt: -1})
    .skip(options.offset)
    .limit(options.limit);
  sendResponse(ctx, 200, {
    items: researches.map(x => x.toJSON({ virtuals: true })),
    limit: options.limit,
    offset: options.offset,
    totalCount: researches.length,
    type: 'collection',
  });
}));

router.get('/supportedTypes', toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  return sendResponse(ctx, 200, Types);
}));

const extractResearchParams = (ctx: PersonalizedContext) => ({
  description: ctx.request.body.description,
  files: ctx.request.body.files,
  name: ctx.request.body.name,
  ownerID: ctx.user.id,
  researchType: ctx.request.body.researchType,
})

router.use(koaBody());

router.post('/', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const research = new Research(extractResearchParams(ctx));
  const result = await research.save();
  sendResponse(ctx, 201, result.toJSON({ virtuals: true }));
}));

router.get('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;
  const research = await Research.findOne({ id, ownerID: ctx.user.id}, defaultProjection);

  if (!research) {
    return sendError(ctx, 404, { message: 'Research not found' });
  }

  sendResponse(ctx, 200, research.toJSON({ virtuals: true }));
}));

router.patch('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;
  const fields = omit(omitBy(extractResearchParams(ctx), isNil), 'ownerID');
  const query = { id, ownerID: ctx.user.id };

  await Research.updateOne(query, { $set: fields });

  const research = await Research.findOne(query, defaultProjection);

  if (research) {
    return sendResponse(ctx, 200, research.toJSON({ virtuals: true }));
  }

  sendResponse(ctx, 200, {});
}));

router.delete('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;

  await Research.deleteOne({ id, ownerID: ctx.user.id });

  sendResponse(ctx, 204);
}));

export default router;
