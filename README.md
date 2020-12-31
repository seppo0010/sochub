# Sochub

Sochub is a hub for social network. It simplifies the managing of media
accounts.

## Deploy

Set up configuration in ./.env and ./trello/client.env following the examples,
build the trello client and run the web server:

```
$ cp .env{.example,}
$ cp trello/client/.env{.example,}
$ vi .env trello/client/.env
$ pushd trello/client && npm run build && popd
$ forever ./index.js
```
