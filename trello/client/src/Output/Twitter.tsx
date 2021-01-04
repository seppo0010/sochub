import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import './Twitter.css'
import { TARGET_TWITTER, fetchTitleAndCode } from '../Input'
import twitter from 'twitter-text'

declare global {
    interface Window {
        callback: Function;
    }
}

declare interface UserToken {
    userToken: string;
    userTokenSecret: string;
}

declare interface User {
    id_str: string;
    name: string;
    screen_name: string;
    profile_image_url: string;
}

const TWEET_URL_REGEX = /^https:\/\/twitter.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)$/

const saveUser = async (user: User, token: UserToken) => {
    const t = window.TrelloPowerUp.iframe();
    await t.storeSecret('Twitter_user_' + user.id_str, JSON.stringify(token))
    const users = await listUsers(t)
    users[user.id_str] = user
    await t.set('board', 'shared', 'Twitter_users', JSON.stringify(users))
    return users
}

const removeUser = async (user: User) => {
    const t = window.TrelloPowerUp.iframe();
    await t.clearSecret('Twitter_user_' + user.id_str)
    const users = await listUsers(t)
    delete users[user.id_str]
    await t.set('board', 'shared', 'Twitter_users', JSON.stringify(users))
    return users
}

const listUsers = async (t?: Trello.PowerUp.IFrame): Promise<{[id: string]: User}> => {
    t = t || window.TrelloPowerUp.iframe();
    return JSON.parse((await t.get('board', 'shared', 'Twitter_users')) || '{}')
}

const getTweetsFromCode = (code: string) => {
    return code.split(/\n\s*\*{3,}\s*\n/g).map((text) => {
        const attachments: string[] = []
        while (true) {
          const m = text.match(/!\[(.*?)\]\((.*?)\)/)
          if (!m) break;
          attachments.push(m[2])
          text = text.replace(`![${m[1]}](${m[2]})`, '')
        }
        return {text, attachments}
    })
}

export const twitterPublishItems = async (t: Trello.PowerUp.IFrame) => {
    return Object.values(await listUsers(t)).map((u) => {
        return {
            text: `Twitter ${u.screen_name}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
                let token;
                try {
                    token = JSON.parse(await t.loadSecret('Twitter_user_' + u.id_str))
                } catch (e) {
                    t.alert({
                        message: 'Failed to get token, please add log in again in settings',
                        duration: 6,
                        display: 'error'
                    });
                    return
                }
                const {code} = await fetchTitleAndCode(TARGET_TWITTER, t)
                if (!code) {
                    t.alert({
                        message: 'Error getting content to publish',
                        duration: 6,
                        display: 'error',
                    })
                    return
                }
                const tweets = getTweetsFromCode(code)
                for (let i = 0; i < tweets.length; i++) {
                    const text = tweets[i].text
                    const {valid} = twitter.parseTweet(text)
                    if (!valid) {
                        t.alert({
                            message: `Invalid tweet number ${i+1} :(\n"${text.substr(0, 30)}"...` ,
                            duration: 10,
                            display: 'error',
                        })
                        return;
                    }
                }
                try {
                    const req = await fetch('/trello/output-twitter/twitter', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: token,
                            tweets,
                        }),
                    })
                    const res = await req.json()
                    if (res.error) {
                        throw new Error(res)
                    }
                    t.attach({
                        name: 'Tweet',
                        url: `https://twitter.com/${u.screen_name}/status/${res.id}`
                    });
                    t.alert({
                        message: 'Tweet published',
                        duration: 6,
                        display: 'success'
                    });
                } catch (e) {
                    t.alert({
                        message: 'Tweet failed :(',
                        duration: 6,
                        display: 'error'
                    });
                }
                t.closePopup()
            },
        }
    })
}

const updatePreviewAccount = async (user?: User) => {
    if (user) {
        const {screen_name, name, profile_image_url} = user
        window.TrelloPowerUp.iframe().set('board', 'shared', 'Output_' + TARGET_TWITTER + '_preview', JSON.stringify({screen_name, name, profile_image_url}))
    } else {
        window.TrelloPowerUp.iframe().remove('board', 'shared', 'Output_' + TARGET_TWITTER + '_preview')
    }
}

const getPreviewAccount = async (): Promise<User | undefined> => {
    const data = await window.TrelloPowerUp.iframe().get('board', 'shared', 'Output_' + TARGET_TWITTER + '_preview')
    if (data) {
        return JSON.parse(data)
    }
}

export const Settings = () => {
    const [users, setUsers] = useState<{[id: string]: User}>({});
    const [previewAccount, setPreviewAccount] = useState<string>('');
    useState(async () => {
        const pAccount = await getPreviewAccount()
        if (pAccount) {
            setPreviewAccount(pAccount.id_str)
        }
    })
    useState(async () => setUsers(await listUsers()))
    return (<>
        {Object.values(users).map((u: User) => (
            <p key={u.id_str}>
                Twitter {u.screen_name}
                {previewAccount === u.id_str && <button onClick={async () => {
                    setPreviewAccount('')
                    updatePreviewAccount()
                }}>Unset as preview account</button>}
                {previewAccount !== u.id_str && <button onClick={async () => {
                    setPreviewAccount(u.id_str)
                    updatePreviewAccount(u)
                }}>Set as preview account</button>}
                <button onClick={async () => {
                    setUsers(await removeUser(u))
                }}>Remove account</button>
            </p>
        ))}
        <p>
            Twitter
            &nbsp;
            <button onClick={async () => {
                const req = await fetch('/trello/output-twitter/add-account');
                const {url, tokenSecret} = await req.json();
                const w = 600;
                const h = 600;
                const y = window.outerHeight / 2 + window.screenY - (h / 2);
                const x = window.outerWidth / 2 + window.screenX - (w / 2);
                const myWindow = window.open(url, `toolbar=no, ` +
                        `location=no, directories=no, status=no, menubar=no,` +
                        ` scrollbars=no, resizable=yes, copyhistory=no,` +
                        ` width=${w}, height=${h}, top=${y}, left=${x}`);
                window.callback = async (oauthToken: string, oauthVerifier: string) => {
                    const req = await fetch('/trello/output-twitter/add-account-ready', {
                        method: 'POST',
                        headers: {'content-type': 'application/json'},
                        body: JSON.stringify({
                            oauthToken,
                            oauthVerifier,
                            tokenSecret: tokenSecret,
                        }),
                    })
                    const {user, token} = await req.json()
                    setUsers(await saveUser(user, token))
                    if (myWindow) {
                        myWindow.close()
                    }
                }
            }}>Add account</button>
        </p>
        </>
    )
}

const showTweet = (text: string) => {
    const {valid, validRangeEnd} = twitter.parseTweet(text)
    const urls = twitter.extractUrls(text)
    let qt = <></>
    for (let i = urls.length - 1; i >= 0; i--) {
        const url = urls[i];
        if (url.match(TWEET_URL_REGEX)) {
            qt = <iframe src={process.env.REACT_APP_BASE_URL + '/output-twitter/preview-tweet?url=' + encodeURIComponent(url)}
                onLoad={(e) => {
                    // I'm sorry!
                    let attempts = 10
                    let interval = setInterval(() => {
                        const iFrame = e.target as any
                        if (attempts-- === 0) {
                            clearInterval(interval)
                        }
                        if (!iFrame.contentWindow) return
                        iFrame.width  = iFrame.contentWindow.document.body.scrollWidth;
                        iFrame.height = iFrame.contentWindow.document.body.scrollHeight;
                        window.TrelloPowerUp.iframe().sizeTo(document.body).catch(() => {});
                    }, 1000)
                }}
                title={url}></iframe>
            if (text.substr(text.length - url.length) === url) {
                text = text.substr(0, text.length - url.length)
            }
        }
    }
    return <p>
        {valid && <span dangerouslySetInnerHTML={{ __html: twitter.autoLink(twitter.htmlEscape(text)) }}></span>}
        {!valid && text.substr(0, validRangeEnd)}
        {!valid && <span className='error'>{text.substr(validRangeEnd)}</span>}
        {qt}
    </p>
}
export const Preview = ({code}: { code: string }) => {
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_TWITTER, !!code)
    const [user, setUser] = useState({screen_name: 'twitter', name: 'Twitter', profile_image_url: process.env.REACT_APP_BASE_URL + "/twitter-default-figure.png"})
    useState(async () => {
        const account = await getPreviewAccount()
        if (account) {
            setUser(account)
        }
    })
    if (!code) {
        return <p style={{padding: 20}}>No output for Twitter</p>
    }
    const tweets = getTweetsFromCode(code)
    setTimeout(() => {
        const t = window.TrelloPowerUp.iframe();
        const imgs = document.images;
        t.sizeTo(document.body).catch(() => {});
        Array.prototype.slice.call(imgs).forEach((img) => {
            img.addEventListener('load', () => t.sizeTo(document.body).catch(() => {}), false );
        });
    })
    return <section className="timeline">
        <ul className="tweets">
            {tweets.map((t, i) => (
                <li key={i}>
                    <img src={user.profile_image_url} alt="" />
                    <div className="info">
                        <strong>{user.name} <span>@{user.screen_name}</span></strong>
                        {showTweet(t.text.trim())}
                        {t.attachments && (<ul className={'attachments attachments' + t.attachments.length}>
                            {t.attachments.map((a, i) => <li key={i}><img src={a} alt="" /></li>)}
                        </ul>)}
                        <div className="actions">
                            <a href="#"><img src={process.env.REACT_APP_BASE_URL + "/comments.svg"} alt="Comments" /> 3 </a>
                            <a href="#"><img src={process.env.REACT_APP_BASE_URL + "/retweet.svg"} alt="Retweet" /> 4 </a>
                            <a href="#"><img src={process.env.REACT_APP_BASE_URL + "/like.svg"} alt="Like" /> 5 </a>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </section>
}

export const AttachmentSection = async (t: Trello.PowerUp.IFrame, options: {
    entries: Trello.PowerUp.Attachment[];
}): Promise<Trello.PowerUp.LazyAttachmentSection[]> => {
    return await Promise.all(options.entries.filter(function (attachment) {
        return attachment.url.match(TWEET_URL_REGEX)
    }).map(async (attachment) => {
        return {
            id: attachment.url,
            claimed: [attachment],
            icon: '',
            title: () => 'Tweet',
            content: {
              type: 'iframe',
              url: t.signUrl(process.env.REACT_APP_BASE_URL + '/output-twitter/preview-tweet?url=' + encodeURIComponent(attachment.url)),
              height: 230
            }
        }
    }))
}
