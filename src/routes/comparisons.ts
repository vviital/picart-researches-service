import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import * as moment from 'moment';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Comparison, { IComparison } from '../datasource/comparisons.mongo';
import Research from '../datasource/researches.mongo';
import zaidel from '../datasource/zaidel.service';

import {PersonalizedContext} from '../models';


const router = new Router({
  prefix: '/comparisons',
});

const toPersonalizedHandler = (fn: (t: PersonalizedContext) => void) => {
  return (ctx: Context) => {
    const context: PersonalizedContext = ctx as PersonalizedContext;

    return fn(context);
  }
};

const getComparison = async (query: object, auth: string): Promise<IComparison|null> => {
  const comparison = await Comparison.findOne(query);

  if (!comparison || comparison.finished) {
    return comparison;
  }

  if (!comparison.lockedAt || moment().isAfter(moment(comparison.lockedAt).add(1, 'day'))) {
    comparison.lockedAt = new Date();
    await comparison.save();
    await zaidel.triggerComparison({ id: comparison.id }, auth);
  }

  return comparison;
}

const extractExperimentParams = (ctx: PersonalizedContext) => ({
  baseResearchID: ctx.request.body.baseResearchID,
  experimentID: ctx.request.body.experimentID,
  ownerID: ctx.user.id,
  researchID: ctx.request.body.researchID,
});

router.use(koaBody({jsonLimit: '16mb'}));

router.post('/', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const auth = ctx.req.headers['authorization'] || '';
  const params = extractExperimentParams(ctx);

  const savedComparison = await (new Comparison(params)).save();
  const updateResult = await Research.updateOne({
    id: savedComparison.researchID,
  }, {
    comparisonID: savedComparison.id,
  });

  console.log('--- research update result ---', updateResult);

  sendResponse(ctx, 201, await getComparison({ id: savedComparison.id }, auth) || undefined);
}));

router.get('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const auth = ctx.req.headers['authorization'] || '';
  const id = ctx.params.id;
  const comparison = await getComparison({ id, ownerID: ctx.user.id}, auth);

  if (!comparison) {
    return sendError(ctx, 404, { message: 'Experiment not found' });
  }

  sendResponse(ctx, 200, comparison.toJSON({ virtuals: true }));
}));

router.delete('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;

  await Comparison.deleteOne({ id, ownerID: ctx.user.id });

  sendResponse(ctx, 204);
}));

export default router;
