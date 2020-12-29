import React, {useState} from 'react';
import { getCode } from './Input'
import { Preview as TwitterPreview } from './Output/Twitter'

export default function Preview() {
    const [loaded, setLoaded] = useState(false)
    const [code, setCode] = useState('')
    useState(async () => {
        setCode(await getCode())
        setLoaded(true)
    })
    return <div>
        {!loaded && <b>loading...</b>}
        {loaded && <TwitterPreview code={code} />}
    </div>
}
