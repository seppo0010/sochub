import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown'
import { Trello } from '../types/TrelloPowerUp';
import { getTitle, getCode } from '../Input'
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
                const [code, title] = await Promise.all([getCode(t), getTitle(t)])
                await fetch('/trello/output-medium/publish', {
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
                t.closePopup()
            },
        }
    })
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
            <input value={input} onInput={e => setInput((e.target as HTMLInputElement).value)}/>
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

export const Preview = ({title, code}: { title: string, code: string }) => {
    return <div className="preview">
        <h2>{title}</h2>
        <ReactMarkdown>{code.replace(/\n\s*\*{3,}\s*\n/g, '\n').replace(/\n/g, '\n\n')}</ReactMarkdown>
    </div>
}
