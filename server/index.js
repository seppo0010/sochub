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

app.use('/pandoc', proxy(process.env.PANDOC_URL));

trello(app)
if (process.env.SOCHUB_DEV) {
    app.use('/', proxy('localhost:3001'));
} else {
    const build_path = path.join(__dirname, '../trello/client/build')
    app.use('/trello', express.static(build_path));
    app.get('/trello/*', function(req, res) {
        res.sendFile(path.join(build_path, 'index.html'));
    });
}

const listener = app.listen(port, function () {
  console.log(`Listening at http://localhost:${port}`)
});
