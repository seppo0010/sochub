FROM node:15 AS ui-build
WORKDIR /usr/src/app
COPY trello/client/ ./trello-client/
RUN cd trello-client && npm install && npm run build

FROM node:15 AS server-build
WORKDIR /root/
COPY --from=ui-build /usr/src/app/trello-client/build ./trello/client/build
COPY server/ ./server/
RUN cd server && npm install
COPY server/index.js ./server/

EXPOSE 3000

CMD ["node", "./server/index.js"]
