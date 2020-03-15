import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

import {ZaidelSettings, Peak} from './zaidel.service';

const settingsDefinition = new mongoose.Schema({
  averageWindow: {
    type: Number,
    required: true
  },
  calculateBackground: {
    type: Boolean,
    required: true,
    default: false
  },
  deconvolutionIterations: {
    type: Number,
    required: true
  },
  sigma: {
    type: Number,
    required: true
  },
  smoothMarkov: {
    type: Boolean,
    required: true,
    default: false
  },
  threshold: {
    type: Number,
    required: true
  }
}, { _id : false });

const coordinatesDefinition = new mongoose.Schema({
  x: {
    type: Number,
    required: true
  },
  y: {
    type: Number,
    required: true
  }
}, { _id : false })

const peakDefinition = new mongoose.Schema({
  peak: {
    type: coordinatesDefinition,
    required: true
  },
  left: {
    type: coordinatesDefinition,
    required: true
  },
  right: {
    type: coordinatesDefinition,
    required: true
  },
  area: {
    type: Number,
    required: true
  }
}, { _id : false });

const experimentResults = new mongoose.Schema({
  
});

const experimentDefinition = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: shortID,
  },
  __v: {
    type: Number,
    select: false,
  },
  name: {
    type: String
  },
  description: {
    type: String
  },
  ownerID: {
    type: String,
    required: true
  },
  researchID: {
    type: String,
    required: true
  },
  fileID: {
    type: String,
    required: true
  },
  settings: {
    type: settingsDefinition,
    required: true
  },
  peaks: {
    type: [peakDefinition],
    required: true,
    default: []
  },
  results: {
    type: experimentResults,
    required: false
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

experimentDefinition.virtual('type').get(() => 'experiment');
experimentDefinition.index({ ownerID: 1 });
experimentDefinition.index({ fileID: 1 });
experimentDefinition.index({ researchID: 1 });

export interface IExperiment extends mongoose.Document {
  id: string
  description: string
  fileID: string
  name: string
  ownerID: string
  researchID: string
  settings: ZaidelSettings
  peaks: Peak[]
  type: string
  createdAt: Date
  updatedAt: Date
}

const Experiments = mongoose.model<IExperiment>('experiments', experimentDefinition);

export default Experiments;
