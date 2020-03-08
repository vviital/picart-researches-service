FROM node:12.13.0

RUN apt-get update
RUN npm i -g yarn

WORKDIR /home/app

COPY package.json .
COPY yarn.lock .

RUN yarn

COPY . .

RUN yarn build

EXPOSE 3000

CMD yarn start
