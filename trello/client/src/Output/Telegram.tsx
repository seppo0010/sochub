import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import './Telegram.css'
import { TARGET_TELEGRAM, fetchInputForTarget } from '../Input'

declare interface TelegramBotChannel {
    id: string;
    botFirstName: string;
    botImageURL: string | null;
    channel: string;
    list: undefined | string;
}

const saveTelegramBotChannel = async (tbc: TelegramBotChannel, token: string) => {
    const t = window.TrelloPowerUp.iframe();
    await t.storeSecret('Telegram_telegramBotChannels_' + tbc.id, token)
    const telegramBotChannels = await listTelegramBotChannels(t)
    telegramBotChannels[tbc.id] = tbc
    await t.set('board', 'shared', 'Telegram_telegramBotChannels', JSON.stringify(telegramBotChannels))
    return telegramBotChannels
}

const removeTelegramBotChannel = async (tbc: TelegramBotChannel) => {
    const t = window.TrelloPowerUp.iframe();
    await t.clearSecret('Telegram_telegramBotChannels_' + tbc.id)
    const telegramBotChannels = await listTelegramBotChannels(t)
    delete telegramBotChannels[tbc.id]
    await t.set('board', 'shared', 'Telegram_telegramBotChannels', JSON.stringify(telegramBotChannels))
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
    return JSON.parse((await t.get('board', 'shared', 'Telegram_telegramBotChannels')) || '{}')
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
    const list = (await t.card('idList')).idList
    return Object.values(await listTelegramBotChannels(t)).filter((b) => {
        return !b.list || b.list === list;
    }).map((b) => {
        return {
            text: `Telegram ${b.botFirstName} - ${b.channel}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
                let botToken;
                try {
                    botToken = await t.loadSecret('Telegram_telegramBotChannels_' + b.id)
                } catch (e) {
                    t.alert({
                        message: 'Failed to get token, please add it again in settings',
                        duration: 6,
                        display: 'error'
                    });
                    return
                }
                try {
                    const {code} = await fetchInputForTarget(TARGET_TELEGRAM, t)
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
                            botToken,
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

const setTelegramBotChannelList = async (u: TelegramBotChannel, list: string) => {
    const t = window.TrelloPowerUp.iframe();
    const telegramBotChannels = await listTelegramBotChannels(t)
    const telegramBotChannel = telegramBotChannels[u.id]
    if (telegramBotChannel) {
        telegramBotChannel.list = list
        await t.set('board', 'shared', 'Telegram_telegramBotChannels', JSON.stringify(telegramBotChannels))
    }
}

export const Settings = () => {
    const [telegramBotChannels, setTelegramBotChannels] = useState<{[id: string]: TelegramBotChannel}>({});
    const [inputBotToken, setInputBotToken] = useState('');
    const [inputChannel, setInputChannel] = useState('');
    const [previewAccount, setPreviewAccount] = useState<string>('');
    const [error, setError] = useState('')
    const [lists, setLists] = useState<{id: string, name: string}[]>([])
    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        setLists(await t.lists('id', 'name'))
    })
    useState(async () => setTelegramBotChannels(await listTelegramBotChannels()))
    const addBot = async () => {
        try {
            const token = inputBotToken
            const req = await fetch('/trello/output-telegram/add-bot', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({botToken: token, channel: inputChannel}),
            });
            const tbc = await req.json()
            if (!req.ok) {
                throw tbc
            }
            setTelegramBotChannels(await saveTelegramBotChannel(tbc, token))
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
                }}>Remove account</button>
                Show in list:
                <select onChange={async (e) => {
                    const _telegramBotChannels = JSON.parse(JSON.stringify(telegramBotChannels))
                    _telegramBotChannels[b.id].list = e.target.value
                    setTelegramBotChannels(_telegramBotChannels)
                    await setTelegramBotChannelList(b, e.target.value);
                }} value={b.list}>
                    <option value="">All</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
            </p>
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

export const Preview = ({ input: { code } }: { input: { code: string } }) => {
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_TELEGRAM, !!code)
    const [user, setUser] = useState<TelegramBotChannel>({
        id: '',
        botFirstName: 'myBot',
        botImageURL: process.env.REACT_APP_BASE_URL + '/telegram_default.png',
        channel: 'mychannel',
        list: undefined,
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
