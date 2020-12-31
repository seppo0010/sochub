require('dotenv').config()
const compression = require('compression');
const express = require('express');
const port = process.env.SOCHUB_PORT || 3000
const trello = require('./trello');
const path = require('path');
const proxy = require('express-http-proxy');

const app = express();

app.use(compression());
app.use(express.json())
app.use(express.static('public'));

if (false) {
    app.use('/', proxy('localhost:3001'));
} else {
    app.use('/trello', express.static('trello/client/build'));
    app.get('/trello/*', function(req, res) {
        res.sendFile(path.join(__dirname, 'trello/client/build', 'index.html'));
    });
}

trello(app)
const listener = app.listen(port, function () {
  console.log(`Listening at http://localhost:${port}`)
});
