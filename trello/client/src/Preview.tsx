import React, { useState, useEffect } from 'react';
import {
    TARGET_TWITTER,
    TARGET_MEDIUM,
    TARGET_INSTAGRAM,
    TARGET_TELEGRAM,
    getCode,
} from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'
import { Preview as InstagramPreview } from './Output/Instagram'
import { Preview as TelegramPreview } from './Output/Telegram'

export default function Preview() {
    const [displayPreview, setDisplayPreview] = useState(TARGET_TWITTER)
    const [loaded, setLoaded] = useState(false)
    const [twitterCode, setTwitterCode] = useState('')
    const [mediumCode, setMediumCode] = useState('')
    const [telegramCode, setTelegramCode] = useState('')
    const [instagramCode, setInstagramCode] = useState('')
    const [title, setTitle] = useState('')
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        const card = await t.card('name', 'desc', 'attachments')
        const attachments = card.attachments
        setTitle(card.name)
        const [ct, cm, ig, tg] = await Promise.all([
            getCode(card.desc, TARGET_TWITTER, attachments),
            getCode(card.desc, TARGET_MEDIUM, attachments),
            getCode(card.desc, TARGET_INSTAGRAM, attachments),
            getCode(card.desc, TARGET_TELEGRAM, attachments),
        ]);
        setTwitterCode(ct || '')
        setMediumCode(cm || '')
        setInstagramCode(ig || '')
        setTelegramCode(tg || '')
        setLoaded(true)
    })
    useEffect(() => { setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})) })
    return <div style={{overflow: 'auto', maxHeight: '1500px'}}>
        {!loaded && <b>loading...</b>}
        {loaded && <div>
            <ul style={{display: 'flex', margin: 20,}}>
                <li><button onClick={() => setDisplayPreview(TARGET_TWITTER)}>Twitter</button></li>
                <li><button onClick={() => setDisplayPreview(TARGET_MEDIUM)}>Medium</button></li>
                <li><button onClick={() => setDisplayPreview(TARGET_INSTAGRAM)}>Instagram</button></li>
                <li><button onClick={() => setDisplayPreview(TARGET_TELEGRAM)}>Telegram</button></li>
            </ul>
            {displayPreview === TARGET_TWITTER && <TwitterPreview code={twitterCode} />}
            {displayPreview === TARGET_MEDIUM && <MediumPreview title={title} code={mediumCode} />}
            {displayPreview === TARGET_INSTAGRAM && <InstagramPreview code={instagramCode} />}
            {displayPreview === TARGET_TELEGRAM && <TelegramPreview code={telegramCode} />}
        </div>}
    </div>
}
