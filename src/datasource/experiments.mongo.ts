import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

import {ZaidelSettings} from './zaidel.service';

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
});

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
  type: string
  createdAt: Date
  updatedAt: Date
}

const Experiments = mongoose.model<IExperiment>('experiments', experimentDefinition);

export default Experiments;
