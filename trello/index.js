const cors = require('cors');
const express = require('express');

module.exports = function sochubTrello(app) {
  app.use(cors({ origin: 'https://trello.com' }));
  app.use('/static/trello', express.static(__dirname + '/public'));
  app.get('/trello/', function (req, res) {
      res.sendFile(__dirname + '/public/index.html');
    });
};
