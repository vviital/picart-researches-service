import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import {toString, omit, omitBy, isNil, split, isEqual} from 'lodash';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Experiment from '../datasource/experiments.mongo';
import zaidel from '../datasource/zaidel.service';

import {PersonalizedContext} from '../models';

const defaultProjection = { peaks: 0, settings: 0, _id: 0 };

const router = new Router({
  prefix: '/experiments',
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
    offset: +ctx.query['offset'] || 0,
    researchIDs: split(ctx.query['researchID'], ',')
  };

  const regex = new RegExp(options.query.split('').map((s) => `.*${s}`).join(''), 'gmi');

  const experiments = await Experiment
    .find({
      $or: fieldsToSearch.map((field) => ({[field]: {$regex: regex}})),
      ownerID: ctx.user.id,
      researchID: {
        $in: options.researchIDs
      }
    }, defaultProjection)
    .sort({createdAt: -1})
    .skip(options.offset)
    .limit(options.limit);
  sendResponse(ctx, 200, {
    items: experiments.map(x => x.toJSON({ virtuals: true })),
    limit: options.limit,
    offset: options.offset,
    totalCount: experiments.length,
    type: 'collection',
  });
}));

const extractExperimentParams = (ctx: PersonalizedContext) => ({
  description: ctx.request.body.description,
  fileID: ctx.request.body.fileID,
  name: ctx.request.body.name,
  ownerID: ctx.user.id,
  researchID: ctx.request.body.researchID,
  settings: ctx.request.body.settings,
})

router.use(koaBody());

router.post('/', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const params = extractExperimentParams(ctx);
  params.settings = params.settings || await zaidel.getDefaultPeaksSettings();

  const peaksResp = await zaidel.findSpectrumPoints({
    ownerID: params.ownerID,
    fileID: params.fileID,
    settings: params.settings,
  }, ctx.req.headers['authorization'] || '');

  const experiment = new Experiment({
    ...params,
    peaks: peaksResp.peaks || []
  });

  const result = await experiment.save();
  sendResponse(ctx, 201, result.toJSON({ virtuals: true }));
}));

router.get('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;
  const experiment = await Experiment.findOne({ id, ownerID: ctx.user.id});

  if (!experiment) {
    return sendError(ctx, 404, { message: 'Experiment not found' });
  }

  sendResponse(ctx, 200, experiment.toJSON({ virtuals: true }));
}));

router.patch('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;
  const fields = omit(omitBy(extractExperimentParams(ctx), isNil), ['ownerID', 'fileID', 'researchID']);
  const query = { id, ownerID: ctx.user.id };

  const oldExperiment = await Experiment.findOne(query);
  if (!oldExperiment) {
    return sendError(ctx, 404, { message: 'Experiment not found' });
  }

  if (fields.settings && !isEqual(fields.settings, oldExperiment.settings)) {
    const peaksResp = await zaidel.findSpectrumPoints({
      ownerID: oldExperiment.ownerID,
      fileID: oldExperiment.fileID,
      settings: fields.settings,
    }, ctx.req.headers['authorization'] || '');

    fields.peaks = peaksResp.peaks || [];
  }

  await Experiment.updateOne(query, { $set: fields });
  const experiment = await Experiment.findOne(query);

  if (experiment) {
    return sendResponse(ctx, 200, experiment.toJSON({ virtuals: true }));
  }

  sendResponse(ctx, 200, {});
}));

router.delete('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;

  await Experiment.deleteOne({ id, ownerID: ctx.user.id });

  sendResponse(ctx, 204);
}));

export default router;
