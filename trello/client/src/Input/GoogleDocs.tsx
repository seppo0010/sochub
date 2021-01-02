import { Trello } from '../types/TrelloPowerUp';
import React, {useState, useEffect} from 'react';
import { GoogleLogout, GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';
import { TARGET, TARGET_TWITTER, TARGET_MEDIUM, TARGET_INSTAGRAM } from './index'
import unzip from 'unzip-js'

export const DOC_PREFIX = process.env.REACT_APP_BASE_URL + '/input-googledocs/'

const wordNS = (p: string | null) => {
    if (!p) return null
    var ns: {[key: string]: string} = {
        'w' : 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    };
    return ns[p] || null;
}

const getZipEntry = async (blob: Blob, paths: string[]): Promise<(string | undefined)[]> => {
    return await new Promise((resolve, reject) => {
        const result = new Array(paths.length)
        unzip(blob, (err: any, zipFile: any) => {
            if (err) {
                reject(err)
                return
            }
            zipFile.readEntries(async (err: any, entries: { name: string }[]) => {
                if (err) {
                    reject(err)
                    return
                }
                entries.forEach(function (entry: any) {
                    const index = paths.indexOf(entry.name)
                    if (index === -1) {
                        return
                    }
                    result[index] = new Promise((resolve, reject) => {
                        zipFile.readEntryData(entry, false, function (err: any, readStream: any) {
                            if (err) {
                                reject(err)
                                return
                            }
                            let data = ''
                            readStream.on('data', function (chunk: any) { data += chunk })
                            readStream.on('error', function (err: any) { reject(err) })
                            readStream.on('end', function () { resolve(data) })
                        })
                    })
                })
                resolve(await Promise.all(result))
            })
        })
    })
}

const findComments = (commentsXML: string): {[id: string]: string} => {
    const parser = new DOMParser();
    const dom = parser.parseFromString(commentsXML, "application/xml");
    const iterator = dom.evaluate('//w:comment', dom, wordNS,
            XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    const results: {[id: string]: string} = {}
    let node = iterator.iterateNext();
    while (node) {
        if (node instanceof Element) {
            let text = ''
            const lineInterator = dom.evaluate('.//w:t', node, wordNS,
                    XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
            let lineNode = lineInterator.iterateNext();
            while (lineNode) {
                text += lineNode.textContent
                lineNode = lineInterator.iterateNext();
                if (lineNode) text += '\n'
            }
            results[node.getAttribute('w:id') || ''] = text
        }
        node = iterator.iterateNext();
    }
    return results
}

declare type Comment = {
    id: string;
    text?: string;
}

const findCommentsForTarget = (commentsXML: string, target: TARGET): Comment[] => {
    return Object.entries(findComments(commentsXML)).filter(([id, value]) => {
        const selectedTargets = value.toLowerCase().split(':')[0].replace(/[^a-z,]+/g, '')
        return selectedTargets.split(',').includes(target);
    }).map(([id, value]) => {
        let text = value.split(':')[1];
        if (text && text.substr(-3) === '***') {
            text += '\n'
        }
        return { id, text }
    })
}

const applyCommentsToDocument = (comments: Comment[], document: string, useMarkdown: boolean): string => {
    let result = ''
    const parser = new DOMParser();
    const dom = parser.parseFromString(document, "application/xml");
    const iterator = dom.evaluate('//w:r|//w:commentRangeStart|//w:commentRangeEnd',
            dom, wordNS, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    let node = iterator.iterateNext();
    let openComments = []
    let appendToBuffer = false;
    let wasBold = false;
    while (node) {
        if (node instanceof Element) {
            const id = node.getAttribute('w:id') || ''
            const comment = comments.find((c) => c.id === id)
            if (node.tagName === 'w:commentRangeStart' && comment) {
                if (comment) {
                    openComments.push(comment)
                    appendToBuffer = comment.text === undefined
                }
            }
            if (node.tagName === 'w:r' && appendToBuffer) {
                const isBold = useMarkdown && dom.evaluate('count(.//w:b)', node, wordNS, XPathResult.NUMBER_TYPE, null).numberValue > 0
                if (isBold !== wasBold) result += '**'
                result += node.textContent
                wasBold = isBold
            }
            if (node.tagName === 'w:commentRangeEnd' && comment) {
                const index = openComments.indexOf(comment)
                if (index !== -1) {
                    openComments.splice(index, 1)
                    if (openComments.length === 0) {
                        appendToBuffer = false;
                    } else {
                        appendToBuffer = openComments[openComments.length - 1].text === undefined
                    }
                }
                if (comment.text && (openComments.length === 0 || openComments[openComments.length - 1].text === undefined)) {
                    result += comment.text
                }
            }
        }
        node = iterator.iterateNext();
    }
    return result
}

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
                scope="https://www.googleapis.com/auth/drive.file"
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
    return await t.loadSecret('GoogleDocs_userToken')
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


export const AttachmentSection = async (t: Trello.PowerUp.IFrame, options: {
    entries: Trello.PowerUp.Attachment[];
}): Promise<Trello.PowerUp.LazyAttachmentSection[]> => {
    const prefix = DOC_PREFIX || '/'
    return options.entries.filter(function (attachment) {
        return attachment.url.indexOf(prefix) === 0;
    }).map((attachment) => { return {
        id: attachment.url,
        claimed: [attachment],
        icon: '',
        title: () => 'GoogleDoc body',
        content: {
          type: 'iframe',
          url: t.signUrl(DOC_PREFIX + 'preview', {
            fileId: attachment.url.substr(prefix.length)
          }),
          height: 230
        }
    } })
}

export const getContent = async (fileId: string, t?: Trello.PowerUp.IFrame, mimeType: string = 'text/html'): Promise<string> => {
    t = t || window.TrelloPowerUp.iframe();
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            const oauthToken = await loggedInToken(t)
            gapi.client.init({
                apiKey: process.env.REACT_APP_GOOGLE_DOCS_API_KEY,
                clientId: process.env.REACT_APP_GOOGLE_DOCS_CLIENT_ID,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            });
            gapi.client.setToken({access_token: oauthToken})
            gapi.client.load('drive', 'v2', async () => {
                const [content] = await Promise.all([
                    gapi.client.drive.files.export({
                        fileId,
                        mimeType,
                    }),
                ]);
                resolve(content.body)
            })
        });
    })
}

export const getText = async (fileId: string, target: TARGET, t?: Trello.PowerUp.IFrame): Promise<string | null> => {
    const str = await getContent(fileId, t, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    const bytes = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) {
        bytes[i] = str.charCodeAt(i);
    }
    const [comments, document] = await getZipEntry(new Blob([bytes]), [
        'word/comments.xml',
        'word/document.xml',
    ])
    if (!comments) {
        return Promise.resolve(null)
    }
    if (!document) {
        return Promise.reject('no document')
    }
    return applyCommentsToDocument(findCommentsForTarget(comments, target), document, ({
        [TARGET_MEDIUM]: true,
        [TARGET_TWITTER]: false,
        [TARGET_INSTAGRAM]: false,
    }[target]))
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
