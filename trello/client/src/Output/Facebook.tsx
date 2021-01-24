import React, {useState} from 'react';
import { Trello } from '../types/TrelloPowerUp';
import FacebookLogin, { ReactFacebookLoginInfo } from 'react-facebook-login';
import './Facebook.css'
import { TARGET_FACEBOOK, fetchInputForTarget } from '../Input'
import twitter from 'twitter-text'

const FACEBOOK_URL_REGEX = /^https:\/\/(?:www.)?facebook.com\/(?:(?:[a-zA-Z0-9_]+\/posts\/([0-9]+))|(?:[0-9_]+))$/

declare global {
    interface Window {
        fbAsyncInit: Function,
    }
}

declare interface Account {
    id: string;
}
const saveUser = async (user: {id: string, name?: string, accessToken: string}) => {
    const t = window.TrelloPowerUp.iframe();
    await t.storeSecret('Facebook_user', JSON.stringify(user))
}

const loadUser = async (t?: Trello.PowerUp.IFrame): Promise<{id: string, name?: string, accessToken: string} | undefined> => {
    t = t || window.TrelloPowerUp.iframe();
    try {
        return JSON.parse(await t.loadSecret('Facebook_user'))
    } catch (e) {}
}

const fetchPages = async (t?: Trello.PowerUp.IFrame): Promise<undefined | {id: string, name: string, access_token: string}[]> => {
    const user = await loadUser(t)
    if (!user) return;
    try {
        const req = await fetch('/trello/output-facebook/list-pages', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                access_token: user.accessToken,
            }),
        })
        return await req.json()
    } catch (e) {
        console.error(e)
        return []
    }
}

const updatePreviewAccount = async (account?: Account) => {
    if (account) {
        const {id} = account
        window.TrelloPowerUp.iframe().set('board', 'shared', 'Output_' + TARGET_FACEBOOK + '_preview', JSON.stringify({id}))
    } else {
        window.TrelloPowerUp.iframe().remove('board', 'shared', 'Output_' + TARGET_FACEBOOK + '_preview')
    }
}

const getPreviewAccount = async (): Promise<Account | undefined> => {
    const data = await window.TrelloPowerUp.iframe().get('board', 'shared', 'Output_' + TARGET_FACEBOOK + '_preview')
    if (data) {
        return JSON.parse(data)
    }
}

export const publishItems = async (t: Trello.PowerUp.IFrame) => {
    const [pages, pagesList, list] = await Promise.all([
        fetchPages(t),
        getPagesList(t),
        t.card('idList'),
    ])
    if (!pages) {
        const user = await loadUser(t)
        if (!user) {
            return []
        }
        return [{
            text: 'Login back to facebook to post',
            callback: () => {
                t.modal({
                    url: t.signUrl(process.env.REACT_APP_BASE_URL + '/settings', ),
                    title: 'Settings',
                })
            },
        }]
    }
    return pages.filter((p) => {
        return !pagesList[p.id] || pagesList[p.id] === list.idList
    }).map((p) => {
        return {
            text: `Facebook ${p.name}`,
            callback: async (t: Trello.PowerUp.IFrame) => {
                t.alert({
                    message: 'Publishing...',
                    duration: 6,
                });
                const {code} = await fetchInputForTarget(TARGET_FACEBOOK, t)
                if (!code) {
                    t.alert({
                        message: 'Error getting content to publish',
                        duration: 6,
                        display: 'error',
                    })
                    return
                }
                try {
                    const req = await fetch('/trello/output-facebook/publish', {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            id: p.id,
                            access_token: p.access_token,
                            message: code,
                        }),
                    })
                    const res = await req.json()
                    if (res.error) {
                        throw new Error(res)
                    }
                    t.attach({
                        name: 'Facebook Post',
                        url: `https://facebook.com/${res.id}`
                    });
                    t.alert({
                        message: 'Post published',
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
                t.closePopup()
            },
        }
    })
}

const getPagesList = async (t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    return JSON.parse(await t.get('board', 'shared', 'Facebook_pagesList') || '{}')
}

const setPageList = async (id: string, list: string) => {
    const t = window.TrelloPowerUp.iframe();
    const pagesList = await getPagesList()
    pagesList[id] = list
    await t.set('board', 'shared', 'Facebook_pagesList', JSON.stringify(pagesList))
    return pagesList
}

export const Settings = () => {
    const [loggedIn, setLoggedIn] = useState(false)
    const [accounts, setAccounts] = useState<{id: string, name: string, access_token: string}[]>([]);
    const [previewAccount, setPreviewAccount] = useState<string>('');
    const [lists, setLists] = useState<{id: string, name: string}[]>([])
    const [pagesList, setPagesList] = useState<{[key: string]: string}>({});
    useState(async () => {
        setPagesList(await getPagesList())
    })

    useState(async () => {
        const t = window.TrelloPowerUp.iframe();
        setLists(await t.lists('id', 'name'))
    })

    useState(async () => {
        const pAccount = await getPreviewAccount()
        if (pAccount) {
            setPreviewAccount(pAccount.id)
        }
    })

    const logIn = async () => {
        const accs = await fetchPages()
        if (accs) {
            setAccounts(accs)
            setLoggedIn(true)
        }
    }
    useState(async () => await loadUser() && logIn());
    return (<div>
        <p>
            Facebook
            &nbsp;
            <FacebookLogin
                appId={process.env.REACT_APP_FACEBOOK_APP_ID || ''}
                textButton={loggedIn ? 'Settings' : 'Login'}
                cssClass=""
                scope="pages_manage_posts,pages_show_list,pages_read_engagement"
                callback={async (r) => {
                    if ((r as ReactFacebookLoginInfo).id) {
                        await saveUser(r as ReactFacebookLoginInfo)
                        logIn()
                    }
                }}/>
            {accounts && (<ul>
                {accounts.map((a) => (
                    <li key={a.id}>
                        {a.name}
                        {previewAccount === a.id && <button onClick={async () => {
                            setPreviewAccount('')
                            updatePreviewAccount()
                        }}>Unset as preview account</button>}
                        {previewAccount !== a.id && <button onClick={async () => {
                            setPreviewAccount(a.id)
                            updatePreviewAccount(a)
                        }}>Set as preview account</button>}
                        Show in list:
                        <select onChange={async (e) => {
                            setPagesList(await setPageList(a.id, e.target.value))
                        }} value={pagesList[a.id] || ''}>
                            <option value="">All</option>
                            {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </li>
                ))}
            </ul>)}
        </p>
    </div>)
}

export const Preview = ({input: {code}}: {input: {code: string}}) => {
    window.TrelloPowerUp.iframe().set('card', 'shared', 'Output_' + TARGET_FACEBOOK, !!code)
    const t = window.TrelloPowerUp.iframe();
    const [meta, setMeta] = useState<{id: string, og_object: {title: string, description: string, image: {url: string}[]}} | null>(null);
    const [previewAccount, setPreviewAccount] = useState<{name: string, image_url: string}>(() => {
        return {
            name: 'My Page',
            image_url: process.env.REACT_APP_BASE_URL + "/facebook-default-figure.png",
        }
    });
    useState(async () => {
        const [pAccount, user] = await Promise.all([getPreviewAccount(), loadUser()])
        if (!user || !pAccount) return;
        const page = (await fetchPages(t) || []).filter((p: {id: string}) => p.id === pAccount.id)
        if (!page) return
        const req = await fetch('/trello/output-facebook/me', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                id: page[0].id,
                access_token: page[0].access_token,
            }),
        })
        const res = await req.json()
        setPreviewAccount({
            name: res.me.name,
            image_url: res.picture.location,
        })
    })
    useState(async () => {
      setMeta(null);
      try {
          const user = await loadUser()
          if (!user) return;
          const matches = code && code.match(/https?:\/\/[-\w@:%_+.~#?,&//=]+/g);
          const url = matches && matches[0];
          if (url) {
              const req = await fetch(`https://graph.facebook.com/?fields=og_object{image,title,description}&scrape=true&access_token=${user.accessToken}&id=${url}`)
              setMeta(await req.json())
          }
      } catch (e) {
        console.error(e)
      }
    });
    if (!code) {
        return <p style={{padding: 20}}>No output for Facebook</p>
    }
    setTimeout(() => {
        const imgs = document.images;
        t.sizeTo(document.body).catch(() => {});
        Array.prototype.slice.call(imgs).forEach((img) => {
            img.addEventListener('load', () => t.sizeTo(document.body).catch(() => {}), false );
        });
    })
    return (<div className="flex-auto">
      <div className="mb3 rounded shadow bg-white max-width-2">
          <header className="flex p2">
            <img src={previewAccount.image_url} className="circle h-40" alt="" style={{width: 50, height: 50}} />
            <div className="pl2">
              <div className="inline-block bold h5">{previewAccount.name}</div>
              <div className="h6 gray">Just now</div>
            </div>
          </header>
          <div className="h6 px2 py1" style={{whiteSpace: 'pre-line'}} dangerouslySetInnerHTML={{ __html: twitter.autoLink(twitter.htmlEscape(code)) }}></div>
          { meta && meta.og_object && (<div className="border-gray border-top">
            { meta.og_object.image && <img className="col-12" src={ meta.og_object && meta.og_object.image[0].url } alt="" /> }
            <div className="p2">
              <div className="gray h6">{ meta.id }</div>
              <div className="bold h5">{ meta.og_object.title }</div>
              <div className="gray h6">{ meta.og_object.description }</div>
            </div>
          </div>) }
          <footer className="border-gray border-top">
            <div className="px2 py1">
              <svg width="16" height="16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" fill="#5890FF"/>
                <path d="M6.4 10.7a.4.4 0 0 1-.1-.2V7.8v-.3l.2-.3L7.7 5a1 1 0 0 0 .2-.5l-.1-1c0-.2 0-.3.2-.3.5 0 1 .8 1 1.4V5l-.3 1.3h2.6l.4.2a.6.6 0 0 1 .2.4c0 .2 0 .4-.2.5l-.3.2.3.1a.6.6 0 0 1-.1 1l-.3.1.2.3a.6.6 0 0 1-.4.9H11v.3a.6.6 0 0 1-.4.8H7.2a1.2 1.2 0 0 1-.8-.3zm-2-4c-.2 0-.4.2-.4.4v4c0 .2.1.4.3.4h1.1c.2 0 .3-.2.3-.3V7c0-.2-.1-.3-.3-.3h-1z" fill="#fff"/>
              </svg>
              <span className="pl1 gray h5">Chuck Norris</span>
            </div>
            <div className="flex px2 py1 border-gray border-top">
              <div className="self-center flex-auto h6 bold">
                <svg width="20" height="20">
                  <path stroke="#616770" strokeWidth="1.3" fill="none" d="M17.4 10.2c0-.6-.3-1-.8-1.3.4-.3.6-.7.6-1.2 0-.8-.7-1.4-1.5-1.4H11c.8-4.3-1.3-5.2-2.2-5-.5.1-.6 0-.5 1v1.6a1.6 1.6 0 0 1-.2 1L6 8v8h8c.9 0 1.5-.7 1.5-1.5l-.1-.6c.7-.2 1.2-.8 1.2-1.5 0-.3-.1-.6-.3-.8.6-.2 1-.8 1-1.4zM1 16.5h5v-10H1v10z" />
                </svg>
                <span className="pl1">Like</span>
              </div>
              <div className="self-center flex-auto h6 bold">
                <svg width="20" height="20">
                  <path stroke="#616770" strokeWidth="1.3" fill="none" d="M2.5 12a3 3 0 0 0 3 3h1v3l4-3h4a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3v7z" />
                </svg>
                <span className="pl1">Comment</span>
              </div>
              <div className="self-center flex-auto h6 bold">
                <svg width="20" height="20">
                  <path d="M10.5 13.7v3.6c0 .4.5.7.9.3l7.2-7.2c.2-.2.2-.6 0-.8l-7.2-7.2a.5.5 0 0 0-.9.3v3.8c-4.7 0-9 7-9 10.5 0 3.1 1.6-2.1 9-3.3z" stroke="#616770" strokeWidth="1.3" fill="none" />
                </svg>
                <span className="pl1">Share</span>
              </div>
            </div>
          </footer>
      </div>
    </div>)
}

export const AttachmentSection = async (t: Trello.PowerUp.IFrame, options: {
    entries: Trello.PowerUp.Attachment[];
}): Promise<Trello.PowerUp.LazyAttachmentSection[]> => {
    const user = await loadUser(t)
    if (!user || !user.accessToken) return []
    return await Promise.all(options.entries.filter(function (attachment) {
        return attachment.url.match(FACEBOOK_URL_REGEX)
    }).map(async (attachment) => {
        return {
            id: attachment.url,
            claimed: [attachment],
            icon: '',
            title: () => 'Post',
            content: {
              type: 'iframe',
              url: t.signUrl(`${process.env.REACT_APP_BASE_URL}/output-facebook/preview-post?access_token=${encodeURIComponent(user.accessToken)}&url=${encodeURIComponent(attachment.url)}`),
              height: 230
            }
        }
    }))
}
