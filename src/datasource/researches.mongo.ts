import * as mongoose from 'mongoose';
import * as shortID from 'shortid';

const fileDefinition = new mongoose.Schema({
  id: {
    type: String
  },
  type: {
    type: String
  },
  title: {
    type: String
  },
  description: {
    type: String
  }
}, { _id : false });

const researchDefinition = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: shortID,
  },
  __v: {
    type: Number,
    select: false,
  },
  researchType: {
    type: String,
    default: 'zaidel'
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
  files: {
    type: [fileDefinition]
  },
  comparisonID: {
    type: String
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

researchDefinition.virtual('type').get(() => 'research');
researchDefinition.index({ ownerID: 1 });
researchDefinition.index({ ownerID: 1, createdAt: -1 });
researchDefinition.index({ ownerID: 1, updatedAt: -1 });
researchDefinition.index({ ownerID: 1, createdAt: -1, name: 1, researchType: 1, id: 1, type: 1 });

export interface IResearch extends mongoose.Document {
  id: string
  researchType: string
  name: string
  description: string
  ownerID: string
  files: {
    id: string
    description: string
    title: string
    type: string
  }[]
  createdAt: Date
  updatedAt: Date
}

const Researches = mongoose.model<IResearch>('researches', researchDefinition);

export const Types = {
  zaidel: 'zaidel',
  comparison: 'comparison',
};

export default Researches;
