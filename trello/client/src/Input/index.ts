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
export const getInputForTarget = async (desc: string, target: TARGET, attachments: {url: string}[], labels: {name: string}[], t?: Trello.PowerUp.IFrame): Promise<InputForTarget> => {
    t = t || window.TrelloPowerUp.iframe();
    const prefix = DOC_PREFIX
    const att = attachments.find(
            (attachment) => attachment.url.indexOf(prefix) === 0)
    let code = '';
    if (att) {
        code = await getText(att.url.substring(prefix.length), target, t) || '';
    } else {
        code = desc;
    }
    if (code && target !== TARGET_TWITTER) {
        code = code.replace(/\n\*{3}\n/, '\n')
    }
    const tags = labels
        .filter((l) => l.name.split(':')[0].replace(/\s*/g, '')
                .toLowerCase().split(',').includes(target))
        .map((l) => l.name.split(':').slice(1).join(':').trim())
    return {
        code,
        target,
        tags,
    };
}
