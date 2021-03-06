import { Trello } from '../types/TrelloPowerUp';
import React, {useState, useEffect} from 'react';
import { GoogleLogout, GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';
import {
    TARGET,
    TARGET_TWITTER,
    TARGET_MEDIUM,
    TARGET_INSTAGRAM,
    TARGET_TELEGRAM,
    TARGET_FACEBOOK
} from './index'
import escapeHtml from 'escape-html'
import { fetchOrCreate, remove } from '../Cache'

export const DOC_PREFIX = process.env.REACT_APP_BASE_URL + '/input-googledocs/'
const scope = 'profile email https://www.googleapis.com/auth/drive'

const saveSecret = (user: any) => {
    const t = window.TrelloPowerUp.iframe();
    const u = user as GoogleLoginResponse;
    try {
        t.storeSecret('GoogleDocs_userToken', u && u.accessToken ? u.accessToken : '')
    } catch (e) {}
}

export const LoginRefresh = () => {
    return <GoogleLogin
        clientId={process.env.REACT_APP_GOOGLE_DOCS_CLIENT_ID || ''}
        render={() => <></>}
        onSuccess={saveSecret}
        isSignedIn={true}
        scope={scope}
        />
}

export const Settings = () => {
    const [user, setUser] = useState<GoogleLoginResponse | GoogleLoginResponseOffline | undefined>();
    useEffect(() => saveSecret(user))
    return (
        <p>
            Google Docs
            &nbsp;
            {!!user || <GoogleLogin
                clientId={process.env.REACT_APP_GOOGLE_DOCS_CLIENT_ID || ''}
                render={renderProps => (
                  <button onClick={renderProps.onClick} disabled={renderProps.disabled}>Login</button>
                )}
                buttonText="Login"
                onSuccess={setUser}
                onFailure={(e) => {
                    console.error(e);
                    setUser(undefined);
                }}
                isSignedIn={true}
                cookiePolicy={'single_host_origin'}
                scope={scope}
                />}
            {!!user && <GoogleLogout
                clientId={process.env.REACT_APP_GOOGLE_DOCS_CLIENT_ID || ''}
                render={renderProps => (
                  <button onClick={renderProps.onClick} disabled={renderProps.disabled}>Logout</button>
                )}
                onLogoutSuccess={() => setUser(undefined) }
                onFailure={() => setUser(undefined) }
                />}
        </p>
    )
}

export const Button = {
    icon: '',
    text: 'Connect Google Doc',
    callback: (t: Trello.PowerUp.IFrame) => {
        return t.modal({
            url: '/trello/input-googledocs',
            fullscreen: true,
        })
    },
}

const loggedInToken = async (t?: Trello.PowerUp.IFrame) => {
    t = t || window.TrelloPowerUp.iframe();
    try {
        return await t.loadSecret('GoogleDocs_userToken')
    } catch (e) {
        return null
    }
}

export const isLoggedIn = async (t: Trello.PowerUp.IFrame) => {
    return !!(await loggedInToken(t));
}

export const buttonShouldDisplay = async (t: Trello.PowerUp.IFrame) => {
    const [loggedIn, hasAttachment] = await Promise.all([
        isLoggedIn(t),
        (async () => {
            const {attachments} = await t.card('attachments')
            const prefix = DOC_PREFIX
            return attachments.some(function (attachment) {
                return attachment.url.indexOf(prefix) === 0;
            })
        })(),
    ])
    return loggedIn && !hasAttachment
}

export const Page = () => {
    const t = window.TrelloPowerUp.iframe();
    const [loading, setLoading] = useState(true)
    const [needsLogin, setNeedsLogin] = useState(false)
    useState(() => gapi.load('picker', {
        callback: async () => {
            setLoading(false)
            const oauthToken = await loggedInToken(t)
            if (!oauthToken) {
                setNeedsLogin(true)
                return
            }
            new google.picker.PickerBuilder()
                .enableFeature(google.picker.Feature.NAV_HIDDEN)
                .setOAuthToken(oauthToken)
                .addView(new google.picker.View(google.picker.ViewId.DOCUMENTS))
                .addView(new google.picker.DocsUploadView())
                .setOrigin('https://trello.com')
                .setCallback(async (data:
                    { action: string, docs?: [{id: string}] }
                ) => {
                    if (data.action === google.picker.Action.CANCEL) {
                        t.closeModal()
                    }
                    if (data.action === google.picker.Action.PICKED && data.docs) {
                        const fileId = data.docs[0].id
                        await t.attach({
                            name: 'Text',
                            url: DOC_PREFIX + fileId,
                        })
                        t.closeModal()
                    }
                })
                .build()
                .setVisible(true)
        },
    }))
    return (
        <div style={{padding: 20}}>
            {loading && 'Loading...'}
            {!loading && needsLogin && 'Go to settings to log in to google docs'}
        </div>
    )
}

export const loadDrive = async (t: Trello.PowerUp.IFrame): Promise<void> => {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            const oauthToken = await loggedInToken(t)
            if (!oauthToken) {
                reject('not logged in')
                return;
            }
            gapi.client.init({
                apiKey: process.env.REACT_APP_GOOGLE_DOCS_API_KEY,
                clientId: process.env.REACT_APP_GOOGLE_DOCS_CLIENT_ID,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
            gapi.client.setToken({access_token: oauthToken})

            gapi.client.load('drive', 'v3', () => {
                resolve()
            })
        });
    })
}

export const getModifiedTime = async (fileId: string, t: Trello.PowerUp.IFrame): Promise<string | undefined> => {
    await loadDrive(t)
    const data = await gapi.client.drive.files.get({
        fileId,
        fields: 'modifiedTime',
    });
    return data.result.modifiedTime
}

export const getContent = async (fileId: string, t: Trello.PowerUp.IFrame, mimeType: string = 'text/html'): Promise<string> => {
    await loadDrive(t)
    return (await gapi.client.drive.files.export({
        fileId,
        mimeType,
    })).body;
}

declare type Comment = {
    include: boolean;
    text?: string;
}


const parseCommentsForTarget = (value: string, target: TARGET): Comment => {
    const selectedTargets = value.toLowerCase().split(':')[0].replace(/[^a-z,]+/g, '')
    let text = value.split(':').slice(1).join(':');
    if (text && text.substr(-3) === '***') {
        text = '\n' + text + '\n'
    }
    return {
        include: selectedTargets.includes(target),
        text,
    }
}

function dfs(root: Node, keep: (node: Node) => boolean) {
    let stack: Node[] = [root]
    while (stack){
        let currentNode = stack.pop()
        if (!currentNode) break;
        if (!keep(currentNode)) {
            if (currentNode instanceof Element) {
                currentNode.innerHTML = ''
            }
            if (currentNode.parentNode) {
                currentNode.parentNode.removeChild(currentNode)
            }
            continue
        }
        if(currentNode && currentNode.childNodes && currentNode.childNodes.length > 0){
            for(let i = currentNode.childNodes.length - 1; i >= 0; i--){
                stack.push(currentNode.childNodes[i]);
            }
        }
    }
}

const applyCommentsToDocument = (html: string, target: TARGET): string => {
    const root = document.createElement('body');
    root.innerHTML = html
    let maxCommentId = 0;
    let iterator = document.evaluate(
        `//span[@class="comment-start"]`, root, null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let n = iterator.iterateNext() as (Element | undefined);
    while (n) {
        maxCommentId = Math.max(maxCommentId, parseInt(n.getAttribute('id') || '0', 10))
        n = iterator.iterateNext() as (Element | undefined);
    }

    // first we are gonna apply all replacements in comments (e.g.: "twitter: write this")
    for (let commentId = 0; commentId <= maxCommentId; commentId++) {
        let iterator = document.evaluate(
            `//span[@class="comment-start"][@id=${commentId}]`, root, null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let n = iterator.iterateNext() as (Element | undefined);
        iterator = document.evaluate(
            `//span[@class="comment-end"][@id=${commentId}]`, root, null,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let n2 = iterator.iterateNext() as (Element | undefined);

        if (!n) {
            if (n2) {
                n2.remove()
            }
            continue
        }

        const comment = parseCommentsForTarget(n.textContent || '', target);
        if (!comment.include) {
            n.remove()
            if (n2) {
                n2.remove()
            }
            continue;
        }

        if (comment.text) {
            if (!n2) {
                continue;
            }

            const myHtml = root.innerHTML
            const start = myHtml.indexOf(n.outerHTML) + n.outerHTML.length
            const end = myHtml.indexOf(n2.outerHTML)
            root.innerHTML = myHtml.substr(0, start) + comment.text + myHtml.substr(end)
        }
    }

    // now we are going to keep all the nodes that are between a comment-start
    // and a comment-end, or that have a comment-start or comment-end as descendant
    let inComment:string[] = [];
    dfs(root, (node) => {
        if (node instanceof Element) {
            const klass = node.getAttribute('class')
            const id = node.getAttribute('id')
            if (node.tagName === 'SPAN' && id && klass) {
                if (klass === 'comment-start') {
                    inComment.push(id)
                    return false
                }
                if (klass === 'comment-end') {
                    const index = inComment.indexOf(id)
                    if (index !== -1) {
                        inComment.splice(index, 1)
                    }
                    return false
                }
            }
        }
        return inComment.length > 0 || document.evaluate(
            'count(.//span[@class="comment-start"]|.//span[@class="comment-end"])',
            node, null, XPathResult.NUMBER_TYPE, null).numberValue > 0
    })

    const format = {
        [TARGET_TWITTER]: 'textContent',
        [TARGET_FACEBOOK]: 'textContent',
        [TARGET_MEDIUM]: 'innerHTML',
        [TARGET_TELEGRAM]: 'innerHTML',
        [TARGET_INSTAGRAM]: 'textContent',
    }[target]
    let value = (root as any)[format]
    if (format === 'innerHTML') {
        value = value.replace(/!\[(.*?)\]\((.*?)\)/g, (match: any, alt: string, url: string) => {
            return `<img src="${escapeHtml(encodeURI(url))}" alt="${escapeHtml(alt)}" />`
        })
    }
    return value
}

const getCacheKey = async (fileId: string, target: TARGET, t: Trello.PowerUp.IFrame): Promise<{fileId: string, modifiedTime: string, target: TARGET} | null> => {
    try {
        const modifiedTime = await getModifiedTime(fileId, t)
        if (!modifiedTime) {
            return null
        }
        return {fileId, modifiedTime, target}
    } catch (e) {
        console.error(e)
        return null;
    }
}

export const deleteCache = async (fileId: string, target: TARGET, t: Trello.PowerUp.IFrame) => {
    const cacheKey = await getCacheKey(fileId, target, t)
    if (cacheKey) {
        return remove(cacheKey)
    }
}

export const getText = async (fileId: string, target: TARGET, t?: Trello.PowerUp.IFrame): Promise<string | null> => {
    t = t || window.TrelloPowerUp.iframe();
    const fetchText = async () => {
        t = t || window.TrelloPowerUp.iframe();
        const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const str = await getContent(fileId, t, mimeType)
        const body = new Uint8Array(str.length)
        for (let i = 0; i < str.length; i++) {
            body[i] = str.charCodeAt(i) & 0xFF
        }

        try {
            const request = await fetch(process.env.REACT_APP_BASE_URL + '/../pandoc', {
                method: 'POST',
                body,
                headers: new Headers({
                    'Content-Type': 'application/x.docx+empty_paragraphs',
                    'Accept': 'text/html',
                    'X-track-changes': 'all'
                }),
            })
            if (!request.ok) throw new Error('not ok')
            const document = await request.text()
            return applyCommentsToDocument(document, target)
        } catch (e) {
            console.error(e)
            return null
        }
    }
    const cacheKey = await getCacheKey(fileId, target, t)
    if (!cacheKey) {
        return await fetchText()
    }
    return fetchOrCreate(cacheKey, 3600, fetchText);
}

export const AttachmentPreview = () => {
    const [preview, setPreview] = useState('')
    const t = window.TrelloPowerUp.iframe();
    useState(async () => {
        const html = await getContent(t.arg('fileId', ''), t);
        setPreview(html)
    })
    setTimeout(() => {
        const imgs = document.images;
        t.sizeTo(document.body).catch(() => {});
        Array.prototype.slice.call(imgs).forEach((img) => {
            img.addEventListener('load', () => t.sizeTo(document.body).catch(() => {}), false );
        });
    })
    return <div dangerouslySetInnerHTML={{ __html: preview }}></div>
}
