import { DOC_PREFIX, getText, deleteCache as googleDocsDeleteCache } from './GoogleDocs'
import { Trello } from '../types/TrelloPowerUp';

export const TARGET_TWITTER = 'twitter'
export type TARGET_TWITTER = 'twitter'
export const TARGET_MEDIUM = 'medium'
export type TARGET_MEDIUM = 'medium'
export const TARGET_INSTAGRAM = 'instagram'
export type TARGET_INSTAGRAM = 'instagram'
export const TARGET_TELEGRAM = 'telegram'
export type TARGET_TELEGRAM = 'telegram'
export const TARGET_FACEBOOK = 'facebook'
export type TARGET_FACEBOOK = 'facebook'
export type TARGET = TARGET_TWITTER | TARGET_MEDIUM | TARGET_INSTAGRAM | TARGET_TELEGRAM | TARGET_FACEBOOK


export interface InputForTarget {
    title?: string;
    code: string;
    target: TARGET;
    tags: string[];
}

export const fetchInputForTarget = async (target: TARGET, t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    const card = await t.card('name', 'desc', 'attachments', 'labels')
    const input = await getInputForTarget(card.desc, target, card.attachments, card.labels, t);
    return {title: card.name, ...input}
}

const getGoogleDocsFileId = (attachments: {url: string}[]): string | null => {
    const prefix = DOC_PREFIX
    const att = attachments.find(
            (attachment) => attachment.url.indexOf(prefix) === 0)
    if (att) {
        return att.url.substring(prefix.length)
    }
    return null
}
export const deleteCache = async (t: Trello.PowerUp.IFrame) => {
    const attachments = (await t.card('attachments')).attachments
    const fileId = getGoogleDocsFileId(attachments)
    if (!fileId) return;
    for (let target of [
        TARGET_TWITTER,
        TARGET_MEDIUM,
        TARGET_INSTAGRAM,
        TARGET_TELEGRAM,
        TARGET_FACEBOOK,
    ]) {
        googleDocsDeleteCache(fileId, target as TARGET, t)
    }
}

export const getInputForTarget = async (desc: string, target: TARGET, attachments: {url: string}[], labels: {name: string}[], t?: Trello.PowerUp.IFrame): Promise<InputForTarget> => {
    t = t || window.TrelloPowerUp.iframe();
    let code = '';
    const fileId = getGoogleDocsFileId(attachments)
    if (fileId) {
        code = await getText(fileId, target, t) || '';
    } else {
        code = desc;
    }
    if (code && target !== TARGET_TWITTER) {
        code = code.replace(/<p>\*{3,}<\/p>/, '')
    }
    const tags = labels
        .filter((l) => l.name[0] === '#' || l.name.split(':')[0].replace(/\s*/g, '')
                .toLowerCase().split(',').includes(target))
        .map((l) => l.name[0] === '#' ? l.name.substr(1) : l.name.split(':').slice(1).join(':').trim())
    return {
        code,
        target,
        tags,
    };
}
