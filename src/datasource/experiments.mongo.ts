import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

import {
  ElementWithPeak,
  Peak,
  PeakWithElements,
  ZaidelAutoSuggestion,
  ZaidelChemicalElementsSettings,
  ZaidelPeaksSettings,
} from './zaidel.service';

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

const chemicalElementsSettingsDefinition = new mongoose.Schema({
  maxElementsPerPeak: {
    type: Number,
    required: true
  },
  maxIntensity: {
    type: Number,
    required: true
  },
  maxIonizationLevel: {
    type: Number,
    required: true
  },
  minIntensity: {
    type: Number,
    required: true
  },
  searchInMostSuitableGroup: {
    type: Boolean,
    required: true
  },
  waveLengthRange: {
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
}, { _id : false });

const sharedPeakDefinition = {
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
};

const peakDefinition = new mongoose.Schema(sharedPeakDefinition);

const elementDefinition = new mongoose.Schema({
  matched: {
    type: Boolean,
    required: true
  },
  selected: {
    type: Boolean,
    required: true,
    default: false
  },
  similarity: {
    type: Number,
    required: true
  },
  intensity: {
    type: Number,
    required: true
  },
  stage: {
    type: Number,
    required: true
  },
  element: {
    type: String,
    required: true
  },
  waveLength: {
    type: Number,
    required: true
  }
});

const peakWithElementsDefinition = new mongoose.Schema({
  ...sharedPeakDefinition,
  elements: {
    type: [elementDefinition],
    required: true,
    default: []
  },
  totalElementsCount: {
    type: Number,
    required: true
  }
});

const elementWithPeak = {
  peak: {
    type: sharedPeakDefinition,
    required: true
  },
  element: {
    type: elementDefinition,
    required: true
  },
}

const elementWithPeakDefinition = new mongoose.Schema(elementWithPeak);

const experimentResultDefinition = new mongoose.Schema({
  ...elementWithPeak,
  fromSuggestions: {
    type: Boolean,
    required: true,
    default: false,
  }
})

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
  peaksSearchSettings: {
    type: settingsDefinition,
    required: true
  },
  chemicalElementsSettings: {
    type: chemicalElementsSettingsDefinition,
    required: true
  },
  peaks: {
    type: [peakDefinition],
    required: true,
    default: []
  },
  matchedElementsPerPeak: {
    type: [peakWithElementsDefinition],
    required: true,
  },
  autoSuggestions: {
    type: [elementWithPeakDefinition],
    required: true,
    default: []
  },
  experimentResults: {
    type: [experimentResultDefinition],
    required: true,
    default: []
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
  autoSuggestions: ZaidelAutoSuggestion[]
  chemicalElementsSettings: ZaidelChemicalElementsSettings
  description: string
  fileID: string
  matchedElementsPerPeak: PeakWithElements[]
  name: string
  ownerID: string
  peaks: Peak[]
  peaksSearchSettings: ZaidelPeaksSettings
  researchID: string
  results: ElementWithPeak[]
  type: string
  createdAt: Date
  updatedAt: Date
}

const Experiments = mongoose.model<IExperiment>('experiments', experimentDefinition);

export default Experiments;
