import { Context } from 'koa';

export type UserClaims = {
  id: string,
  email: string,
  login: string,
  roles: string[],
}

export type Pagination = {
  limit: number,
  offset: number,
}

export interface PersonalizedContext extends Context {
  user: UserClaims
}
