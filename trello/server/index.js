const sqlite3 = require('sqlite3');
const TrelloNodeAPI = require('trello-node-api')

const db = new sqlite3.Database('./trello.db');

db.run("CREATE TABLE IF NOT EXISTS users_token (user VARCHAR(255) PRIMARY KEY, token VARCHAR(255))");

function isValidTimestamp(
  sentAtSeconds,
  receivedAtSeconds,
  leniencyInSeconds = 300,
) {
  return (
    Math.abs(Number(sentAtSeconds) - Number(receivedAtSeconds)) <
    Number(leniencyInSeconds)
  );
}

module.exports = function trello(app) {
    app.get('/trello/input-canva/trello-return', async (request, response) => {
        // is this the worst code I've ever written? probably not
        response.send(`
        <script>
        location.href = location.href.replace('#', '&').replace('trello-return', 'trello-return2')
        </script>
        `)
        response.end()
    });
    app.get('/trello/input-canva/trello-return2', async (request, response) => {
        const stmt = db.prepare(`
            INSERT INTO users_token (user, token) VALUES(?, ?)
            ON CONFLICT(user) DO UPDATE SET token = ?;
        `)
        stmt.run(request.query.user, request.query.token, request.query.token);
        stmt.finalize();
        response.redirect(`https://canva.com/apps/configured?success=true` +
                `&state=${request.query.state}`)
    });
    app.get('/trello/input-canva/redirect', async (request, response) => {
        const sentAtSeconds = request.query.time;
        const receivedAtSeconds = new Date().getTime() / 1000;
        if (!isValidTimestamp(sentAtSeconds, receivedAtSeconds)) {
          response.sendStatus(401);
          return;
        }
        const host = request.header('host')
        const secret = process.env.CANVA_CLIENT_SECRET;
        const key = Buffer.from(secret, 'base64');
        const version = 'v1';
        const { time, user, brand, extensions, state } = request.query;
        const message = `${version}:${time}:${user}:${brand}:${extensions}:${state}`;
        const { createHmac } = require('crypto');
        const signature = createHmac('sha256', key).update(message).digest('hex');
        if (!request.query.signatures.includes(signature)) {
          response.sendStatus(401);
          return;
        }
        response.redirect('https://trello.com/1/authorize?'+
                'expiration=never&name=sochub&response_type=token' +
                `&callback_method=fragment&key=${process.env.TRELLO_API_KEY}` +
                '&scope=read,write' +
                `&return_url=https://${host}/trello/input-canva/trello-return` +
                `?state=${request.query.state}%26user=${request.query.user}` +
                '')
    })
    app.post('/trello/input-canva/configuration', async (request, response) => {
        response.json({
            "type": "ERROR",
            "errorCode": "CONFIGURATION_REQUIRED"
        })
    })
    app.post('/trello/input-canva/publish/resources/find', async (request, response) => {
        const host = request.header('host')
        const stmt = db.prepare("SELECT token FROM users_token WHERE user = ? LIMIT 1");
        const {token} = await new Promise((resolve, reject) => stmt.get(request.body.user, (err, row) => {
            if (err) reject(err)
            else resolve(row)
        }));
        stmt.finalize();

        const Trello = new TrelloNodeAPI();
        Trello.setApiKey(process.env.TRELLO_API_KEY);
        Trello.setOauthToken(token);

        let path = null;
        if (!request.body.containerId) {
            const boards = await Trello.member.searchBoards('me')
            if (boards.length === 1) {
                path = [boards[0].id]
            } else {
                response.json({
                    "resources": boards.map((b) => { return {
                        "id": JSON.stringify([b.id]),
                        "name": b.name,
                        "type": "CONTAINER",
                        isOwner: true,
                        readOnly: false,
                    }}),
                    "type": "SUCCESS",
                })
                return
            }
        }
        path = path || JSON.parse(request.body.containerId)
        if (path.length === 1) {
            const cards = await Trello.board.searchCards(path[0])
            cards.sort((c0, c1) => -c0.dateLastActivity.localeCompare(c1.dateLastActivity))
            response.json({
                "resources": cards.map((c) => { return {
                    "id": JSON.stringify(path.concat([c.id])),
                    "name": c.name,
                    "type": "CONTAINER",
                    isOwner: true,
                    readOnly: false,
                }}),
                "type": "SUCCESS",
            })
            return
        }
        if (path.length === 2) {
            response.json({
                "resources": [],
                "type": "SUCCESS",
            })
            return
        }
    });
    app.post('/trello/input-canva/publish/resources/upload', async (request, response) => {
      console.log(request.body)
      response.end()
    });
}
