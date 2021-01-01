import { Trello } from '../types/TrelloPowerUp';

export const AttachmentSection = async (t: Trello.PowerUp.IFrame, options: {
    entries: Trello.PowerUp.Attachment[];
}): Promise<Trello.PowerUp.LazyAttachmentSection[]> => {
    return options.entries.filter(function (attachment) {
        return !!attachment.url.match(/^https:\/\/www.canva.com\/design\/[A-Za-z0-9]+\/view$/)
    }).map((attachment) => {
        return {
            id: attachment.url,
            claimed: [attachment],
            icon: '',
            title: () => 'Canva',
            content: {
              type: 'iframe',
              url: attachment.url + '?embed',
              height: 460
            }
        }
    })
}
