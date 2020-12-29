require('dotenv').config()
const compression = require('compression');
const express = require('express');
const port = process.env.SOCHUB_PORT || 3000
const trello = require('./trello');

const app = express();

app.use(compression());
app.use(express.json())
app.use(express.static('public'));
trello(app)

const listener = app.listen(port, function () {
  console.log(`Listening at http://localhost:${port}`)
});
