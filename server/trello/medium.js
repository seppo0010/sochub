const axios = require('axios');

function Medium(auth) {
    this.auth = auth;
    const config = {
        headers: {
            "Host": "api.medium.com",
            "Content-type": "application/json",
            "Authorization": `Bearer ${this.auth}`,
            "Accept": "application/json",
            "Accept-Charset": "utf-8",
        },
    };

    this.getProfile = async () => {
        const res = await axios.get("https://api.medium.com/v1/me", config)
        return res.data.data;
    };

    this.addPost = async (title, content, options) => {
        const userData = await this.getProfile()
        return await axios.post(`https://api.medium.com/v1/users/${userData.id}/posts`, {
            title,
            content,
            contentFormat: options.contentFormat || 'html',
            canonicalUrl: options.canonicalUrl,
            tags: options.tags,
            publishStatus: options.publishStatus
        }, config)
    }
}

module.exports = function (app) {
    app.post('/trello/output-medium/add-blog', async (req, res) => {
        const { token } = req.body
        try {
            const profile = await new Medium(token).getProfile()
            res.json({token, ...profile})
        } catch (e) {
            console.error(e)
            res.end()
        }
    });
    app.post('/trello/output-medium/publish', async (req, res) => {
        const {blog: {token}, code, title} = req.body;
        try {
            await (new Medium(token)).addPost(title, code, {
                contentFormat: 'html',
                publishStatus: 'draft',
            })
            res.json({})
        } catch (e) {
            console.error(e)
            res.end()
        }
    })
}
