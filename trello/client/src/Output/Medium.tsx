import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import { TARGET_MEDIUM, fetchTitleAndCode } from '../Input'
import './Medium.css'

declare interface MediumBlog {
    id: string;
    name: string;
    token: string;
}

const saveMediumBlog = async (mediumBlog: MediumBlog) => {
    const t = window.TrelloPowerUp.iframe();
    const mediumBlogs = await listMediumBlogs(t)
    mediumBlogs[mediumBlog.id] = mediumBlog
    await t.storeSecret('Medium_mediumBlogs', JSON.stringify(mediumBlogs))
    return mediumBlogs
}

const removeMediumBlog = async (mediumBlog: MediumBlog) => {
    const t = window.TrelloPowerUp.iframe();
    const mediumBlogs = await listMediumBlogs(t)
    delete mediumBlogs[mediumBlog.id]
    await t.storeSecret('Medium_mediumBlogs', JSON.stringify(mediumBlogs))
    return mediumBlogs
}

const listMediumBlogs = async (t?: Trello.PowerUp.IFrame): Promise<{[id: string]: MediumBlog}> => {
    t = t || window.TrelloPowerUp.iframe();
    const mediumBlogs = JSON.parse((await t.loadSecret('Medium_mediumBlogs')) || '{}')
    return mediumBlogs
}

export const mediumPublishItems = async (t: Trello.PowerUp.IFrame) => {
    return Object.values(await listMediumBlogs(t)).map((m) => {
        return {
            text: `Medium ${m.name}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
                try {
                    const {code, title} = await fetchTitleAndCode(TARGET_MEDIUM, t)
                    if (!code) {
                        alert('Error getting content to publish')
                        return
                    }
                    const res = await fetch('/trello/output-medium/publish', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            blog: m,
                            title,
                            code,
                        }),
                    })
                    const j = await res.json();
                    t.closePopup()
                    t.attach({
                        name: 'Medium',
                        url: j.url,
                    });
                    t.alert({
                        message: 'Post published as draft',
                        duration: 6,
                        display: 'success'
                    });
                } catch (e) {
                    t.alert({
                        message: 'Post failed :(',
                        duration: 6,
                        display: 'error'
                    });
                }
            },
        }
    })
}

export const Settings = () => {
    const [mediumBlogs, setMediumBlogs] = useState<{[id: string]: MediumBlog}>({});
    const [input, setInput] = useState('');
    const [error, setError] = useState('')
    useState(async () => setMediumBlogs(await listMediumBlogs()))
    const addBlog = async () => {
        try {
            const req = await fetch('/trello/output-medium/add-blog', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({token: input}),
            });
            const mediumBlog = await req.json()
            if (!req.ok) {
                throw mediumBlog
            }
            setMediumBlogs(await saveMediumBlog(mediumBlog))
            setInput('')
        } catch (e) {
            setError(e.error ? e.error : 'failed to add blog')
        }
    }
    return (<>
        {error && <p className="error" style={{color: 'red'}}>{error}</p>}
        {Object.values(mediumBlogs).map((m: MediumBlog) => (
            <p key={m.id}>Medium {m.name}<button onClick={async () => {
                setMediumBlogs(await removeMediumBlog(m))
            }}>Remove account</button></p>
        ))}
        <p>
            Medium integration token
            <input value={input} onInput={e => setInput((e.target as HTMLInputElement).value)}/>
            <button onClick={addBlog}>Add blog</button>
        </p>
        </>
    )
}

export const Preview = ({title, code}: { title: string, code: string }) => {
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_MEDIUM, !!title && !!code)
    if (!code) {
        return <p style={{padding: 20}}>No output for Medium</p>
    }
    return <div className="preview">
        <h2>{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: code}}></div>
    </div>
}
