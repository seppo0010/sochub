import React, { useState, useEffect } from 'react';
import { TARGET_INSTAGRAM } from '../Input'
import './Instagram.css'

declare interface User {
    username: string
}

export const Preview = ({code}: { code: string }) => {
    const [user, setUser] = useState({username: 'instagram'})
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
    useState(async () => {
        const user = await getPreviewAccount()
        if (user) {
            setUser(user);
        }
    })
    useEffect(() => { setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})) })
    return <div className="instagram">
        {canvaURL && <div>
            <iframe src={canvaURL + '?embed'} title="instagram-preview"></iframe>
            <ul>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-like.svg"} alt="Like" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-comment.svg"}alt="Comment" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-share.svg"} alt="Share" /></li>
                <li><img src={process.env.REACT_APP_BASE_URL + "/ig-bookmark.svg"} alt="Bookmark" /></li>
            </ul>
            <p><strong>45 likes</strong></p>
            <p><strong>{user.username}</strong> {code}</p>
        </div>}
    </div>
}

const updatePreviewAccount = async (user?: User) => {
    if (user) {
        const {username} = user
        window.TrelloPowerUp.iframe().set('board', 'shared', 'Output_' + TARGET_INSTAGRAM + '_preview', JSON.stringify({username}))
    } else {
        window.TrelloPowerUp.iframe().remove('board', 'shared', 'Output_' + TARGET_INSTAGRAM + '_preview')
    }
}

const getPreviewAccount = async (): Promise<User | undefined> => {
    const data = await window.TrelloPowerUp.iframe().get('board', 'shared', 'Output_' + TARGET_INSTAGRAM + '_preview')
    if (data) {
        return JSON.parse(data)
    }
}
export const Settings = () => {
    const [input, setInput] = useState('');
    useState(async () => {
        const account = await getPreviewAccount()
        if (account && input === '') {
            setInput(account.username)
        }
    })
    return (<>
        <p>
            Instagram preview username
            <input value={input} onInput={e => setInput((e.target as HTMLInputElement).value)}/>
            <button onClick={() => {
                updatePreviewAccount({username: input})
            }}>Set instagram preview</button>
        </p>
        </>
    )
}
