import React, { useState, useEffect } from 'react';
import {
    TARGET_TWITTER,
    TARGET_MEDIUM,
    TARGET_INSTAGRAM,
    TARGET_TELEGRAM,
    TARGET_FACEBOOK,
    getInputForTarget,
    InputForTarget,
} from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'
import { Preview as InstagramPreview } from './Output/Instagram'
import { Preview as TelegramPreview } from './Output/Telegram'
import { Preview as FacebookPreview } from './Output/Facebook'

export default function Preview() {
    const defaultInput: InputForTarget = {title: '', code: '', tags: [], target: TARGET_TWITTER};
    const [displayPreview, setDisplayPreview] = useState(TARGET_TWITTER)
    const [loaded, setLoaded] = useState(false)
    const [twitterInput, setTwitterInput] = useState({...defaultInput, target: TARGET_TWITTER})
    const [mediumInput, setMediumInput] = useState({...defaultInput, target: TARGET_MEDIUM})
    const [telegramInput, setTelegramInput] = useState({...defaultInput, target: TARGET_TELEGRAM})
    const [instagramInput, setInstagramInput] = useState({...defaultInput, target: TARGET_INSTAGRAM})
    const [facebookInput, setFacebookInput] = useState({...defaultInput, target: TARGET_FACEBOOK})
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        const card = await t.card('name', 'desc', 'attachments', 'labels')
        const attachments = card.attachments
        const [ct, cm, ig, tg, fb] = await Promise.all([
            getInputForTarget(card.desc, TARGET_TWITTER, attachments, card.labels),
            getInputForTarget(card.desc, TARGET_MEDIUM, attachments, card.labels),
            getInputForTarget(card.desc, TARGET_INSTAGRAM, attachments, card.labels),
            getInputForTarget(card.desc, TARGET_TELEGRAM, attachments, card.labels),
            getInputForTarget(card.desc, TARGET_FACEBOOK, attachments, card.labels),
        ]);
        setTwitterInput(ct)
        setMediumInput(cm)
        setInstagramInput(ig)
        setTelegramInput(tg)
        setFacebookInput(fb)
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
                <li><button onClick={() => setDisplayPreview(TARGET_FACEBOOK)}>Facebook</button></li>
            </ul>
            {displayPreview === TARGET_TWITTER && <TwitterPreview input={twitterInput} />}
            {displayPreview === TARGET_MEDIUM && <MediumPreview input={mediumInput} />}
            {displayPreview === TARGET_INSTAGRAM && <InstagramPreview input={instagramInput} />}
            {displayPreview === TARGET_TELEGRAM && <TelegramPreview input={telegramInput} />}
            {displayPreview === TARGET_FACEBOOK && <FacebookPreview input={facebookInput} />}
        </div>}
    </div>
}
