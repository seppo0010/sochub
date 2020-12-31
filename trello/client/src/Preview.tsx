import React, { useState, useEffect } from 'react';
import { TARGET_TWITTER, TARGET_MEDIUM, getTitle, getCode } from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'

const PREVIEW_TWITTER = 'twitter'
const PREVIEW_MEDIUM = 'medium'

export default function Preview() {
    const [displayPreview, setDisplayPreview] = useState(PREVIEW_TWITTER)
    const [loaded, setLoaded] = useState(false)
    const [twitterCode, setTwitterCode] = useState('')
    const [mediumCode, setMediumCode] = useState('')
    const [title, setTitle] = useState('')
    useState(async () => {
        const [ct, cm, t] = await Promise.all([
            getCode(TARGET_TWITTER),
            getCode(TARGET_MEDIUM),
            getTitle(),
        ]);
        setTwitterCode(ct)
        setMediumCode(cm)
        setTitle(t)
        setLoaded(true)
    })
    useEffect(() => { setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})) })
    return <div style={{overflow: 'auto', maxHeight: '1500px'}}>
        {!loaded && <b>loading...</b>}
        {loaded && <div>
            <ul style={{display: 'flex', margin: 20,}}>
                <li><button onClick={() => setDisplayPreview(PREVIEW_TWITTER)}>Twitter</button></li>
                <li><button onClick={() => setDisplayPreview(PREVIEW_MEDIUM)}>Medium</button></li>
            </ul>
            {displayPreview === PREVIEW_TWITTER && <TwitterPreview code={twitterCode} />}
            {displayPreview === PREVIEW_MEDIUM && <MediumPreview title={title} code={mediumCode} />}
        </div>}
    </div>
}
