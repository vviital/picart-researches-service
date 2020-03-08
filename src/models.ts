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
