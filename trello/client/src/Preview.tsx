import React, {useState} from 'react';
import { getText } from './Input/GoogleDocs'
import { Preview as TwitterPreview } from './Output/Twitter'

export default function Preview() {
    const [loaded, setLoaded] = useState(false)
    const [code, setCode] = useState('')
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        const card = await t.card('desc', 'attachments')
        const prefix = process.env.REACT_APP_DOC_PREFIX || '/'
        const att = card.attachments.find(
                (attachment) => attachment.url.indexOf(prefix) === 0)
        if (att) {
            let text = await getText(att.url.substring(prefix.length))
            if (text) {
                setLoaded(true);
                setCode(text);
                return
            }
        }
        setLoaded(true);
        setCode(card.desc)
    })
    return <div>
        {!loaded && <b>loading...</b>}
        {loaded && <TwitterPreview code={code} />}
    </div>
}
