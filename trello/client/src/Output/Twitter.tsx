import React, { useState } from 'react';
import { Trello } from '../types/TrelloPowerUp';
import './Twitter.css'
import { getCode } from '../Input'
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

export const tweetAction = {
    text: 'Tweet',
    callback: async (t: Trello.PowerUp.IFrame) => {
        return t.popup({
            title: 'Tweet!',
            items: Object.values(await listUsers(t)).map((u) => {
                return {
                    text: u.userName,
                    callback: async () => {
                        const code = await getCode(t)
                        const tweets = getTweetsFromCode(code)
                        await fetch('/trello/output-twitter/twitter', {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                from: u,
                                tweets,
                            }),
                        })
                    },
                }
            })
        })
    },
}

export const Settings = () => {
    const [users, setUsers] = useState<{[id: string]: User}>({});
    useState(async () => setUsers(await listUsers()))
    return (<>
        {Object.values(users).map((u: User) => (
            <p key={u.userId}>Twitter {u.userName}<button onClick={async () => {
                setUsers(await removeUser(u))
            }}>Remove account</button></p>
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
                    <img src="/twitter-default-figure.png" alt="" />
                    <div className="info">
                        <strong>Nombre <span>@arroba</span></strong>
                        {showTweet(t.text.trim())}
                        {t.attachments && (<ul className={'attachments attachments' + t.attachments.length}>
                            {t.attachments.map((a, i) => <li key={i}><img src={a} alt="" /></li>)}
                        </ul>)}
                        <div className="actions">
                            <a href="#"><img src="/comments.svg" alt="Comments" /> 3 </a>
                            <a href="#"><img src="/retweet.svg" alt="Retweet" /> 4 </a>
                            <a href="#"><img src="/like.svg" alt="Like" /> 5 </a>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    </section>
}
