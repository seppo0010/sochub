import React, {useState} from 'react';
import { getCode } from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'
import { Preview as MediumPreview } from './Output/Medium'

export default function Preview() {
    const [loaded, setLoaded] = useState(false)
    const [code, setCode] = useState('')
    useState(async () => {
        setCode(await getCode())
        setLoaded(true)
    })
    return <div style={{overflow: 'auto', maxHeight: '1500px'}}>
        {!loaded && <b>loading...</b>}
        {loaded && <TwitterPreview code={code} />}
        {loaded && <MediumPreview code={code} />}
    </div>
}
