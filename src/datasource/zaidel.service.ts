import * as request from 'request-promise';
import * as _ from 'lodash';

import config from '../config';

export type ZaidelPeaksSettings = {
  averageWindow: number
  calculateBackground: boolean
  deconvolutionIterations: number
  sigma: number
  smoothMarkov: boolean
  threshold: number
}

export type ZaidelChemicalElementsSettings = {
  maxElementsPerPeak: number
  maxIntensity: number
  maxIonizationLevel: number
  minIntensity: number
  searchInMostSuitableGroup: boolean
  waveLengthRange: number
}

export type ZaidelFindPeaksRequest = {
  settings: ZaidelPeaksSettings
  fileID: string
  ownerID: string
}

export type Coordinate = {
  x: number
  y: number
}

export type Peak = {
  peak: Coordinate
  left: Coordinate
  right: Coordinate
  area: Number
}

export type ZaidelFindPeaksResponse = {
  peaks: Peak[]
}

export type ZaidelFindChemicalElementsRequest = {
  peaks: Peak[]
  settings: ZaidelChemicalElementsSettings
}

export type Element = {
  matched: boolean
  selected: boolean
  similarity: number
  intensity: number
  stage: number
  element: string
  waveLength: number
}

export type PeakWithElements = Peak & {
  elements: Element[]
  totalElementsCount: number
}

export type ZaidelAutoSuggestion = {
  peak: Peak
  element: Element
}

export type ElementWithPeak = ZaidelAutoSuggestion & {
  fromSuggestions: boolean
}

export type ZaidelFindChemicalElementsResponse = {
  peaksCount: number
  peaksWithElements: PeakWithElements[]
  autoSuggestions: ZaidelAutoSuggestion[]
}

const requestOptions = {
  json: true,
}

class Zaidel {
  async getDefaultPeaksSettings(): Promise<ZaidelPeaksSettings> {
    const res = await request.get(`${config.zaidelServiceURL}/peaks/settings`, requestOptions);
    return res;
  }

  async getDefaultChemicalElementsSettings(): Promise<ZaidelChemicalElementsSettings> {
    const res = await request.get(`${config.zaidelServiceURL}/spectrumlines/settings`, requestOptions);
    return res;
  }

  async findSpectrumPoints(data: ZaidelFindPeaksRequest, auth: string): Promise<ZaidelFindPeaksResponse> {
    const res = await request.post(`${config.zaidelServiceURL}/peaks`, {
      ...requestOptions,
      body: data,
      headers: {
        Authorization: auth
      }
    });

    return res;
  }

  async findMatchedChemicalElements(data: ZaidelFindChemicalElementsRequest, auth: string): Promise<ZaidelFindChemicalElementsResponse> {
    const res = await request.post(`${config.zaidelServiceURL}/spectrumlines`, {
      ...requestOptions,
      body: data,
      headers: {
        Authorization: auth
      }
    });

    return res;
  }
}

const zaidel = new Zaidel();

export default zaidel;

