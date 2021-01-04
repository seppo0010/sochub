import { DOC_PREFIX, getText } from './GoogleDocs'
import { Trello } from '../types/TrelloPowerUp';

export const TARGET_TWITTER = 'twitter'
export type TARGET_TWITTER = 'twitter'
export const TARGET_MEDIUM = 'medium'
export type TARGET_MEDIUM = 'medium'
export const TARGET_INSTAGRAM = 'instagram'
export type TARGET_INSTAGRAM = 'instagram'
export const TARGET_TELEGRAM = 'telegram'
export type TARGET_TELEGRAM = 'telegram'
export type TARGET = TARGET_TWITTER | TARGET_MEDIUM | TARGET_INSTAGRAM | TARGET_TELEGRAM


export const fetchTitleAndCode = async (target: TARGET, t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    const card = await t.card('name', 'desc', 'attachments')
    return {
        title: card.name,
        code: await getCode(card.desc, target, card.attachments, t),
    }
}
export const getCode = async (desc: string, target: TARGET, attachments: {url: string}[], t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    console.log(target)
    const prefix = DOC_PREFIX
    const att = attachments.find(
            (attachment) => attachment.url.indexOf(prefix) === 0)
    let text;
    if (att) {
        text = await getText(att.url.substring(prefix.length), target, t)
    } else {
        text = desc;
    }
    if (text && target !== TARGET_TWITTER) {
        text = text.replace(/\n\*{3}\n/, '\n')
    }
    return text;
}
