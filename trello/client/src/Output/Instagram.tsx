import React, { useState, useEffect } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import { TARGET_INSTAGRAM, fetchTitleAndCode } from '../Input'
import './Instagram.css'

export const Preview = ({code}: { code: string }) => {
    const [canvaURL, setCanvaURL] = useState('')
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_INSTAGRAM, !!canvaURL)
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        const card = await t.card('attachments')
        const attachments = card.attachments.filter((attachment) => {
            return (attachment.name === 'instagram' &&
                    attachment.url.match(/^https:\/\/www.canva.com\/design\/[A-Za-z0-9]+\/view$/))
        })
        if (attachments[0]) {
            setCanvaURL(attachments[0].url)
        }
    })
    useEffect(() => { setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})) })
    return <div className="instagram">
        {canvaURL && <div>
            <iframe src={canvaURL + '?embed'}></iframe>
            <ul>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-like.svg"} alt="Like" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-comment.svg"}alt="Comment" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-share.svg"} alt="Share" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-bookmark.svg"} alt="Bookmark" /></li>
            </ul>
            <p><strong>45 likes</strong></p>
            <p><strong>myuser</strong> code</p>
        </div>}
    </div>
}

