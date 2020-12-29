import { getText } from './GoogleDocs'
import { Trello } from '../types/TrelloPowerUp';

export const getCode = async (t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    const card = await t.card('desc', 'attachments')
    const prefix = process.env.REACT_APP_DOC_PREFIX || '/'
    const att = card.attachments.find(
            (attachment) => attachment.url.indexOf(prefix) === 0)
    if (att) {
        let text = await getText(att.url.substring(prefix.length), t)
        if (text) {
            return text
        }
    }
    return card.desc
}
