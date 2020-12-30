import React, { useState, useEffect } from 'react';
import { getTitle, getCode } from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'

const PREVIEW_TWITTER = 'twitter'
const PREVIEW_MEDIUM = 'medium'

export default function Preview() {
    const [displayPreview, setDisplayPreview] = useState(PREVIEW_TWITTER)
    const [loaded, setLoaded] = useState(false)
    const [code, setCode] = useState('')
    const [title, setTitle] = useState('')
    useState(async () => {
        const [c, t] = await Promise.all([getCode(), getTitle()])
        setCode(c)
        setTitle(t)
        setLoaded(true)
    })
    useEffect(() => setTimeout(() => window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {})))
    return <div style={{overflow: 'auto', maxHeight: '1500px'}}>
        {!loaded && <b>loading...</b>}
        {loaded && <div>
            <ul style={{display: 'flex', margin: 20,}}>
                <li><button onClick={() => setDisplayPreview(PREVIEW_TWITTER)}>Twitter</button></li>
                <li><button onClick={() => setDisplayPreview(PREVIEW_MEDIUM)}>Medium</button></li>
            </ul>
            {displayPreview === PREVIEW_TWITTER && <TwitterPreview code={code} />}
            {displayPreview === PREVIEW_MEDIUM && <MediumPreview title={title} code={code} />}
        </div>}
    </div>
}
