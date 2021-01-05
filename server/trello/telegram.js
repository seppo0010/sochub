const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto')
const axios = require('axios')
const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('./trello.db');

db.run("CREATE TABLE IF NOT EXISTS telegram_avatars (id CHAR(40) PRIMARY KEY, image BLOB)");

module.exports = function (app) {
    app.post('/trello/output-telegram/add-bot', async (req, res) => {
        const { botToken, channel } = req.body
        try {
            const bot = new TelegramBot(botToken)
            const [me, channelInfo] = await Promise.all([bot.getMe(), bot.getChat(channel)])
            const shasum = crypto.createHash('sha1')
            shasum.update(`${botToken+channel}`)
            const id = shasum.digest('hex')
            const profilePhotos = await bot.getUserProfilePhotos(me.id)
            const botImageURL = process.env.SOCHUB_BASE_URL + '/trello/output-telegram/bot-image/' + id;
            if (profilePhotos.photos) {
                const botImageId = profilePhotos.photos[0][0].file_id
                const botImageFile = await bot.getFileLink(botImageId)
                const response = await axios.get(botImageFile, { responseType: 'arraybuffer' })
                const imageData = response.data
                const stmt = db.prepare(`
                    INSERT INTO telegram_avatars (id, image) VALUES(?, ?)
                    ON CONFLICT(id) DO UPDATE SET image = ?;
                `)
                stmt.run(id, imageData, imageData)
                stmt.finalize();
            }
            res.json({
                id,
                botUsername: me.odiaasocbot,
                botFirstName: me.first_name,
                botImageURL,
                channel,
            })
        } catch (e) {
            console.error(e)
            res.status(400)
            res.json({error: 'could not verify token/channel'})
        }
    });
    app.post('/trello/output-telegram/publish', async (req, res) => {
        const {botChannel, botToken, code} = req.body;
        const bot = new TelegramBot(botToken)
        try {
            bot.sendMessage(botChannel.channel, code, {
                parse_mode: 'html',
            })
        } catch (e) {
            console.error(e)
            res.writeHead(400)
            res.json({error: 'Unable to publish'})
            return
        }
        res.json({})
    })
    app.get('/trello/output-telegram/bot-image/:id', async (req, res) => {
        const stmt = db.prepare("SELECT image FROM telegram_avatars WHERE id = ? LIMIT 1");
        const obj = await new Promise((resolve, reject) => stmt.get(req.params.id, (err, row) => {
            if (err) reject(err)
            else resolve(row)
        }));
        stmt.finalize();
        res.writeHead(200, [['Content-Type', 'image/jpeg']]);
        res.end(obj.image)
    })
}
