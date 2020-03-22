import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import {toString, omit, omitBy, isNil, split, isEqual} from 'lodash';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Experiment from '../datasource/experiments.mongo';
import zaidel from '../datasource/zaidel.service';

import {PersonalizedContext} from '../models';

const defaultProjection = {
  _id: 0,
  chemicalElementsSettings: 0,
  matchedElementsPerPeak: 0,
  peaks: 0,
  peaksSearchSettings: 0,
};

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
  chemicalElementsSettings: ctx.request.body.chemicalElementsSettings,
  description: ctx.request.body.description,
  fileID: ctx.request.body.fileID,
  matchedElementsPerPeak: ctx.request.body.matchedElementsPerPeak,
  name: ctx.request.body.name,
  ownerID: ctx.user.id,
  peaksSearchSettings: ctx.request.body.peaksSearchSettings,
  researchID: ctx.request.body.researchID,
})

router.use(koaBody({jsonLimit: '16mb'}));

router.post('/', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const auth = ctx.req.headers['authorization'] || '';

  const params = extractExperimentParams(ctx);
  params.peaksSearchSettings = await zaidel.getDefaultPeaksSettings();
  params.chemicalElementsSettings = await zaidel.getDefaultChemicalElementsSettings();

  const peaksResp = await zaidel.findSpectrumPoints({
    ownerID: params.ownerID,
    fileID: params.fileID,
    settings: params.peaksSearchSettings,
  }, auth);

  const matchedChemicalElementsResp = await zaidel.findMatchedChemicalElements({
    peaks: peaksResp.peaks,
    settings: params.chemicalElementsSettings
  }, auth);

  const experiment = new Experiment({
    ...params,
    peaks: peaksResp.peaks || [],
    matchedElementsPerPeak: matchedChemicalElementsResp.peaksWithElements
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

const isObjectChanged = (next?: object, current?: object): boolean => {
  if (!next) {
    return false;
  }
  next = JSON.parse(JSON.stringify(omitBy(next, isNil)));
  current = JSON.parse(JSON.stringify(omitBy(current, isNil)));
  return !isEqual(next, current);
}

router.patch('/:id', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;
  const auth = ctx.req.headers['authorization'] || '';

  const fields = omit(
    omitBy(extractExperimentParams(ctx), isNil),
    ['ownerID', 'fileID', 'researchID', 'peaks']
  );
  const query = { id, ownerID: ctx.user.id };

  const oldExperiment = await Experiment.findOne(query);
  if (!oldExperiment) {
    return sendError(ctx, 404, { message: 'Experiment not found' });
  }

  let forceUpdate = false;

  if (isObjectChanged(fields.peaksSearchSettings, oldExperiment.peaksSearchSettings)) {
    const peaksResp = await zaidel.findSpectrumPoints({
      ownerID: oldExperiment.ownerID,
      fileID: oldExperiment.fileID,
      settings: fields.peaksSearchSettings,
    }, auth);

    fields.peaks = peaksResp.peaks || [];
    forceUpdate = true;

    console.log('--- updating peaks ---');
  }

  if (forceUpdate || isObjectChanged(fields.chemicalElementsSettings, oldExperiment.chemicalElementsSettings)) {
    const matchedChemicalElementsResp = await zaidel.findMatchedChemicalElements({
      peaks: fields.peaks || oldExperiment.peaks,
      settings: fields.chemicalElementsSettings
    }, auth);

    fields.matchedElementsPerPeak = matchedChemicalElementsResp.peaksWithElements;

    console.log('--- updating matchedElementsPerPeak ---');
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
