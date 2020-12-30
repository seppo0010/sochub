import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import { getCode } from '../Input'

declare interface MediumBlog {
    name: string;
    token: string;
}

const saveMediumBlog = async (mediumBlog: MediumBlog) => {
    const t = window.TrelloPowerUp.iframe();
    const mediumBlogs = await listMediumBlogs(t)
    mediumBlogs[mediumBlog.mediumBlogId] = mediumBlog
    await t.storeSecret('Medium_mediumBlogs', JSON.stringify(mediumBlogs))
    return mediumBlogs
}

const removeMediumBlog = async (mediumBlog: MediumBlog) => {
    const t = window.TrelloPowerUp.iframe();
    const mediumBlogs = await listMediumBlogs(t)
    delete mediumBlogs[mediumBlog.mediumBlogId]
    await t.storeSecret('Medium_mediumBlogs', JSON.stringify(mediumBlogs))
    return mediumBlogs
}

const listMediumBlogs = async (t?: Trello.PowerUp.IFrame): Promise<{[id: string]: MediumBlog}> => {
    t = t || window.TrelloPowerUp.iframe();
    const mediumBlogs = JSON.parse((await t.loadSecret('Medium_mediumBlogs')) || '{}')
    return mediumBlogs
}

export const publishAction = {
    text: 'Publish',
    callback: async (t: Trello.PowerUp.IFrame) => {
        return t.popup({
            title: 'Publish!',
            items: Object.values(await listMediumBlogs(t)).map((m) => {
                return {
                    text: m.mediumBlogName,
                    callback: async () => {
                        const code = await getCode(t)
                        await fetch('/trello/output-medium/publish', {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                blog: m,
                                code,
                            }),
                        })
                    },
                }
            })
        })
    },
}

export const Settings = () => {
    const [mediumBlogs, setMediumBlogs] = useState<{[id: string]: MediumBlog}>({});
    const [input, setInput] = useState('');
    useState(async () => setMediumBlogs(await listMediumBlogs()))
    return (<>
        {Object.values(mediumBlogs).map((m: MediumBlog) => (
            <p key={m.id}>Medium {m.name}<button onClick={async () => {
                setMediumBlogs(await removeMediumBlog(m))
            }}>Remove account</button></p>
        ))}
        <p>
            Medium integration token
            <input value={input} onInput={e => setInput(e.target.value)}/>
            <button onClick={async () => {
                const req = await fetch('/trello/output-medium/add-blog', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({token: input}),
                });
                const mediumBlog = await req.json()
                setMediumBlogs(await saveMediumBlog(mediumBlog))
                setInput('')
            }}>Add blog</button>
        </p>
        </>
    )
}

export const Preview = ({code}: { code: string }) => {
    return <p>Medium preview</p>
}
