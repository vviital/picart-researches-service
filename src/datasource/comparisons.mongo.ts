import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

const comparisonResultDefinition = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: shortID,
  },
  total: {
    type: Number,
    default: 0
  },
  processed: {
    type: Number,
    default: 0
  },
  lockedAt: {
    type: Date,
  },
  finished: {
    type: Boolean,
    default: false
  },
  finishedAt: {
    type: Date,
  },
  similarities: {
    type: [Object],
    default: []
  },
  researchID: {
    type: String,
    required: true
  },
  baseResearchID: {
    type: String,
    required: true
  },
  experimentID: {
    type: String,
    required: true
  },
  ownerID: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

comparisonResultDefinition.index({ ownerID: 1 });
comparisonResultDefinition.index({ researchID: 1 });
comparisonResultDefinition.index({ experimentID: 1 });

export interface IComparison extends mongoose.Document {
  id: string
  ownerID: string
  researchID: string
  experimentID: string
  active: boolean
  finished: boolean
  lockedAt: Date
  total: Number
  processed: Number
  similarities: {
    p: number
    eID: string
    eName: string
    rID: string
    rName: string
  }[]
  createdAt: Date
  updatedAt: Date
  finishedAt: Date
}

const Comparisons = mongoose.model<IComparison>('comparisons', comparisonResultDefinition);

export default Comparisons;