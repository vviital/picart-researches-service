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

const requestOptions = {
  json: true,
}

class Zaidel {
  async getDefaultPeaksSettings(): Promise<ZaidelSettings> {
    const res = await request.get(`${config.zaidelServiceURL}/peaks/settings`, requestOptions);
    return res;
  }
}

const zaidel = new Zaidel();

export default zaidel;

