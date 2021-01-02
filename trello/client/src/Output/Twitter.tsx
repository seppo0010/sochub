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

declare interface User {
    userId: string;
    userName: string;
    userToken: string;
    userTokenSecret: string;
    screen_name: string;
    name: string;
    profile_image_url: string;
}

const saveUser = async (user: User) => {
    const t = window.TrelloPowerUp.iframe();
    const users = await listUsers(t)
    users[user.userId] = user
    await t.storeSecret('Twitter_users', JSON.stringify(users))
    return users
}

const removeUser = async (user: User) => {
    const t = window.TrelloPowerUp.iframe();
    const users = await listUsers(t)
    delete users[user.userId]
    await t.storeSecret('Twitter_users', JSON.stringify(users))
    return users
}

const listUsers = async (t?: Trello.PowerUp.IFrame): Promise<{[id: string]: User}> => {
    t = t || window.TrelloPowerUp.iframe();
    const users = JSON.parse((await t.loadSecret('Twitter_users')) || '{}')
    return users
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
            text: `Twitter ${u.userName}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
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
                            from: u,
                            tweets,
                        }),
                    })
                    const res = await req.json()
                    if (res.error) {
                        throw new Error(res)
                    }
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
            setPreviewAccount(pAccount.userId)
        }
    })
    useState(async () => setUsers(await listUsers()))
    return (<>
        {Object.values(users).map((u: User) => (
            <p key={u.userId}>
                Twitter {u.userName}
                {previewAccount === u.userId && <button onClick={async () => {
                    setPreviewAccount('')
                    updatePreviewAccount()
                }}>Unset as preview account</button>}
                {previewAccount !== u.userId && <button onClick={async () => {
                    setPreviewAccount(u.userId)
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
                    const user = await req.json()
                    setUsers(await saveUser(user))
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
    return <p>
        {valid && <span dangerouslySetInnerHTML={{ __html: twitter.autoLink(twitter.htmlEscape(text)) }}></span>}
        {!valid && text.substr(0, validRangeEnd)}
        {!valid && <span className='error'>{text.substr(validRangeEnd)}</span>}
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
