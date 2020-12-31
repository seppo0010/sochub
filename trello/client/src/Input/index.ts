import { getText } from './GoogleDocs'
import { Trello } from '../types/TrelloPowerUp';

export const TARGET_TWITTER = 'twitter'
export type TARGET_TWITTER = 'twitter'
export const TARGET_MEDIUM = 'medium'
export type TARGET_MEDIUM = 'medium'
export type TARGET = TARGET_TWITTER | TARGET_MEDIUM


export const getTitle = async (t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    const card = await t.card('name')
    return card.name
}

export const getCode = async (target: TARGET, t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    const card = await t.card('desc', 'attachments')
    const prefix = process.env.REACT_APP_DOC_PREFIX || '/'
    const att = card.attachments.find(
            (attachment) => attachment.url.indexOf(prefix) === 0)
    if (att) {
        const text = await getText(att.url.substring(prefix.length), target, t)
        t.set('card', 'shared', 'Output_' + target, !!text)
        return text || ''
    }
    return card.desc
}
