import * as request from 'request-promise';

import config from '../config';

export type ZaidelSettings = {
  averageWindow: number
  calculateBackground: boolean
  deconvolutionIterations: number
  sigma: number
  smoothMarkov: boolean
  threshold: number
}

export type ZaidelFindPeaksRequest = {
  settings: ZaidelSettings
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

const requestOptions = {
  json: true,
}

class Zaidel {
  async getDefaultPeaksSettings(): Promise<ZaidelSettings> {
    const res = await request.get(`${config.zaidelServiceURL}/peaks/settings`, requestOptions);
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

    console.log(res);
    return res;
  }
}

const zaidel = new Zaidel();

export default zaidel;

