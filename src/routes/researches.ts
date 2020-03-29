import { Context } from 'koa';
import * as Router from 'koa-router';
import * as koaBody from 'koa-body';
import * as _ from 'lodash';

import { sendResponse, sendError } from '../senders';
import { auth } from '../middlewares';
import Research, {Types} from '../datasource/researches.mongo';
import Experiment from '../datasource/experiments.mongo';
import Comparison from '../datasource/comparisons.mongo';
import {PersonalizedContext} from '../models';

const defaultProjection = { _id: 0 };

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
  const fieldsToSearch = ['name', 'description', 'researchType'];
  const options = {
    query: _.toString(ctx.query['query']),
    limit: +ctx.query['limit'] || 100,
    offset: +ctx.query['offset'] || 0,
    withExperiments: ctx.query['withExperiments'] ? true : false
  };

 
  const fullTextQuery: any = {};
  if (options.query) {
    const regex = new RegExp(options.query.split('').map((s) => `.*${s}`).join(''), 'gmi');
    fullTextQuery['$or'] = fieldsToSearch.map((field) => ({[field]: {$regex: regex}}));
  }

  const researches = await Research
    .find({
      ...fullTextQuery,
      ownerID: ctx.user.id,
    }, { _id: 0, researchType: 1, name: 1, id: 1, type: 1, description: 1 })
    .sort({createdAt: -1})
    .skip(options.offset)
    .limit(options.limit);

  sendResponse(ctx, 200, {
    items: researches,
    limit: options.limit,
    offset: options.offset,
    totalCount: _.size(researches),
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
  const fields = _.omit(_.omitBy(extractResearchParams(ctx), _.isNil), 'ownerID');
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

  const deletedExperiments = await Experiment.deleteMany({ researchID: id, ownerID: ctx.user.id });
  console.log('Deleted experiments: ', deletedExperiments);

  const deletedComparisons = await Comparison.deleteMany({ researchID: id, ownerID: ctx.user.id });
  console.log('Deleted comparisons: ', deletedComparisons);

  sendResponse(ctx, 204);
}));

router.post('/:id/copy', auth, toPersonalizedHandler(async (ctx: PersonalizedContext) => {
  const id = ctx.params.id;

  const research = await Research.findOne({ id });
  if (!research) {
    return sendError(ctx, 404, { message: 'Research not found' });
  }

  const nextResearch = _.omit(research.toJSON(), ['_id', 'id', 'createdAt', 'updatedAt']);
  const savedResearch = await (new Research(nextResearch).save());

  const query = { researchID: research.id };
  const fetchedExperiments = await Experiment.find(query, {_id: 0, id: 0, createdAt: 0, updatedAt: 0});

  const experiments = _.map(fetchedExperiments, (experiment) => {
    return {
      ...experiment.toJSON(),
      researchID: savedResearch.id,
    };
  });

  const experimentResults = await Experiment.insertMany(experiments);

  sendResponse(ctx, 200, savedResearch);
}))

export default router;
