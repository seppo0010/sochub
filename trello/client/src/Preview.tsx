import React, { useState, useEffect } from 'react';
import { TARGET_TWITTER, TARGET_MEDIUM, TARGET_INSTAGRAM, getCode } from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'
import { Preview as InstagramPreview } from './Output/Instagram'

const PREVIEW_TWITTER = 'twitter'
const PREVIEW_MEDIUM = 'medium'
const PREVIEW_INSTAGRAM = 'instagram'

export default function Preview() {
    const [displayPreview, setDisplayPreview] = useState(PREVIEW_TWITTER)
    const [loaded, setLoaded] = useState(false)
    const [twitterCode, setTwitterCode] = useState('')
    const [mediumCode, setMediumCode] = useState('')
    const [instagramCode, setInstagramCode] = useState('')
    const [title, setTitle] = useState('')
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        const card = await t.card('name', 'desc', 'attachments')
        const attachments = card.attachments
        setTitle(card.name)
        const [ct, cm, ig] = await Promise.all([
            getCode(card.desc, TARGET_TWITTER, attachments),
            getCode(card.desc, TARGET_MEDIUM, attachments),
            getCode(card.desc, TARGET_INSTAGRAM, attachments),
        ]);
        setTwitterCode(ct || '')
        setMediumCode(cm || '')
        setInstagramCode(ig || '')
        setLoaded(true)
    })
    useEffect(() => { setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})) })
    return <div style={{overflow: 'auto', maxHeight: '1500px'}}>
        {!loaded && <b>loading...</b>}
        {loaded && <div>
            <ul style={{display: 'flex', margin: 20,}}>
                <li><button onClick={() => setDisplayPreview(PREVIEW_TWITTER)}>Twitter</button></li>
                <li><button onClick={() => setDisplayPreview(PREVIEW_MEDIUM)}>Medium</button></li>
                <li><button onClick={() => setDisplayPreview(PREVIEW_INSTAGRAM)}>Instagram</button></li>
            </ul>
            {displayPreview === PREVIEW_TWITTER && <TwitterPreview code={twitterCode} />}
            {displayPreview === PREVIEW_MEDIUM && <MediumPreview title={title} code={mediumCode} />}
            {displayPreview === PREVIEW_INSTAGRAM && <InstagramPreview code={instagramCode} />}
        </div>}
    </div>
}
