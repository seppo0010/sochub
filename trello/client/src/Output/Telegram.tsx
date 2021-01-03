import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import './Telegram.css'
import { TARGET_TELEGRAM, fetchTitleAndCode } from '../Input'

declare interface TelegramBotChannel {
    id: string;
    botToken: string;
    botFirstName: string;
    botImageURL: string | null;
    channel: string;
}

const saveTelegramBotChannel = async (telegramBotChannel: TelegramBotChannel) => {
    const t = window.TrelloPowerUp.iframe();
    const telegramBotChannels = await listTelegramBotChannels(t)
    telegramBotChannels[telegramBotChannel.id] = telegramBotChannel
    await t.storeSecret('Telegram_telegramBotChannels', JSON.stringify(telegramBotChannels))
    return telegramBotChannels
}

const removeTelegramBotChannel = async (telegramBotChannel: TelegramBotChannel) => {
    const t = window.TrelloPowerUp.iframe();
    const telegramBotChannels = await listTelegramBotChannels(t)
    delete telegramBotChannels[telegramBotChannel.id]
    await t.storeSecret('Telegram_telegramBotChannels', JSON.stringify(telegramBotChannels))
    return telegramBotChannels
}

const ALLOWED_TAGS = ['b', 'strong', 'i', 'u', 'em', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre'];

const usurp = (p: Element) => {
    if (!p.parentNode) return;
    let last = p;
    for (let i = p.childNodes.length - 1; i >= 0; i--) {
        const e = p.removeChild(p.childNodes[i]);
        p.parentNode.insertBefore(e, last);
        last = e as Element;
    }
    (p.parentNode as Element).removeChild(p);
}

const cleanCode = (text: string) => {
    const el = document.createElement('div')
    el.innerHTML = text
    const tags = Array.prototype.slice.apply(el.getElementsByTagName("*"), [0]);
    for (let i = 0; i < tags.length; i++) {
        const nodeName = tags[i].nodeName.toLowerCase()
        if (ALLOWED_TAGS.indexOf(nodeName) === -1) {
            usurp(tags[i]);
            if (nodeName === 'p') {
                tags[i].innerText += '\n';
            }
        }
    }
    return el.innerHTML
}

const listTelegramBotChannels = async (t?: Trello.PowerUp.IFrame): Promise<{[id: string]: TelegramBotChannel}> => {
    t = t || window.TrelloPowerUp.iframe();
    const telegramBotChannels = JSON.parse((await t.loadSecret('Telegram_telegramBotChannels')) || '{}')
    return telegramBotChannels
}

const updatePreviewAccount = async (botChannel?: TelegramBotChannel) => {
    if (botChannel) {
        window.TrelloPowerUp.iframe().set('board', 'shared', 'Output_' + TARGET_TELEGRAM + '_preview', JSON.stringify(botChannel))
    } else {
        window.TrelloPowerUp.iframe().remove('board', 'shared', 'Output_' + TARGET_TELEGRAM + '_preview')
    }
}

const getPreviewAccount = async (): Promise<TelegramBotChannel | undefined> => {
    const data = await window.TrelloPowerUp.iframe().get('board', 'shared', 'Output_' + TARGET_TELEGRAM + '_preview')
    if (data) {
        return JSON.parse(data)
    }
}
export const publishItems = async (t: Trello.PowerUp.IFrame) => {
    return Object.values(await listTelegramBotChannels(t)).map((b) => {
        return {
            text: `Telegram ${b.botFirstName} - ${b.channel}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
                try {
                    const {code} = await fetchTitleAndCode(TARGET_TELEGRAM, t)
                    if (!code) {
                        alert('Error getting content to publish')
                        return
                    }
                    const res = await fetch('/trello/output-telegram/publish', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            botChannel: b,
                            code: cleanCode(code),
                        }),
                    })
                    await res.json();
                    t.closePopup()
                    t.alert({
                        message: 'Message sent',
                        duration: 6,
                        display: 'success'
                    });
                } catch (e) {
                    t.alert({
                        message: 'Message failed :(',
                        duration: 6,
                        display: 'error'
                    });
                }
            },
        }
    })
}

export const Settings = () => {
    const [telegramBotChannels, setTelegramBotChannels] = useState<{[id: string]: TelegramBotChannel}>({});
    const [inputBotToken, setInputBotToken] = useState('');
    const [inputChannel, setInputChannel] = useState('');
    const [previewAccount, setPreviewAccount] = useState<string>('');
    const [error, setError] = useState('')
    useState(async () => setTelegramBotChannels(await listTelegramBotChannels()))
    const addBot = async () => {
        try {
            const req = await fetch('/trello/output-telegram/add-bot', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({botToken: inputBotToken, channel: inputChannel}),
            });
            const telegramBotChannel = await req.json()
            if (!req.ok) {
                throw telegramBotChannel
            }
            setTelegramBotChannels(await saveTelegramBotChannel(telegramBotChannel))
            setInputBotToken('')
            setInputChannel('')
        } catch (e) {
            setError(e.error ? e.error : 'failed to add blog')
        }
    }
    useState(async () => {
        const pAccount = await getPreviewAccount()
        if (pAccount) {
            setPreviewAccount(pAccount.id)
        }
    })
    return (<>
        {error && <p className="error" style={{color: 'red'}}>{error}</p>}
        {Object.values(telegramBotChannels).map((b: TelegramBotChannel) => (
            <p key={b.id}>
            Telegram {b.botFirstName} - {b.channel}
            {previewAccount === b.id && <button onClick={async () => {
                setPreviewAccount('')
                updatePreviewAccount()
            }}>Unset as preview account</button>}
            {previewAccount !== b.id && <button onClick={async () => {
                setPreviewAccount(b.id)
                updatePreviewAccount(b)
            }}>Set as preview account</button>}
            <button onClick={async () => {
                setTelegramBotChannels(await removeTelegramBotChannel(b))
            }}>Remove account</button></p>
        ))}
        <p>
            Telegram bot token
            <input value={inputBotToken} onInput={e => setInputBotToken((e.target as HTMLInputElement).value)} placeholder="1234567:abcdef"/>
            Telegram channel
            <input value={inputChannel} onInput={e => setInputChannel((e.target as HTMLInputElement).value)} placeholder="@mychannel" />
            <button onClick={addBot}>Add bot</button>
        </p>
        </>
    )
}

export const Preview = ({code}: { code: string }) => {
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_TELEGRAM, !!code)
    const [user, setUser] = useState<TelegramBotChannel>({
        id: '',
        botToken: '',
        botFirstName: 'myBot',
        botImageURL: process.env.REACT_APP_BASE_URL + '/telegram_default.png',
        channel: 'mychannel',
    })
    useState(async () => {
        const u = await getPreviewAccount();
        if (u) {
            if (!u.botImageURL) {
                u.botImageURL = user.botImageURL;
            }
            setUser(u)
        }
    })
    if (!code) {
        return <p style={{padding: 20}}>No output for Telegram</p>
    }
    setTimeout(() => {
        const t = window.TrelloPowerUp.iframe();
        const imgs = document.images;
        t.sizeTo(document.body).catch(() => {});
        Array.prototype.slice.call(imgs).forEach((img) => {
            img.addEventListener('load', () => t.sizeTo(document.body).catch(() => {}), false );
        });
    })
    return <div className="telegramPreview">
        {user.botImageURL && <img className="avatar" src={user.botImageURL} alt='' />}
        <div className="message">
            <div dangerouslySetInnerHTML={{ __html: cleanCode(code).replace(/\n/g, '<br />')}}></div>
            <div className="time">12:34</div>
        </div>
    </div>
}
