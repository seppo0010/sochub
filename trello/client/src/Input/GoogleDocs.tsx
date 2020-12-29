import { Trello } from '../types/TrelloPowerUp';
import React, {useState, useEffect} from 'react';
import { GoogleLogout, GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';

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
                onFailure={setUser}
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
            const prefix = process.env.REACT_APP_DOC_PREFIX || '/'
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
                            url: process.env.REACT_APP_DOC_PREFIX + fileId,
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
}) => {
    const prefix = process.env.REACT_APP_DOC_PREFIX || '/'
    return options.entries.filter(function (attachment) {
        return attachment.url.indexOf(prefix) === 0;
    }).map((attachment) => { return {
        id: attachment.url,
        claimed: [attachment],
        icon: '',
        title: () => 'GoogleDoc body',
        content: {
          type: 'iframe',
          url: t.signUrl(process.env.REACT_APP_DOC_PREFIX + 'preview', {
            fileId: attachment.url.substr(prefix.length)
          }),
          height: 230
        }
    } })
}

export const getHTML = async (fileId: string, t?: Trello.PowerUp.IFrame): Promise<string | null> => {
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
                const res = await gapi.client.drive.files.export({
                    fileId,
                    mimeType: "text/html",
                })
                resolve(res.body)
            })
        });
    })
}

export const getText = async (fileId: string, t?: Trello.PowerUp.IFrame): Promise<string | null> => {
    const html = await getHTML(fileId, t)
    if (html === null) {
        return null
    }
    const el = document.createElement('div')
    el.innerHTML = html;
    const imgs = el.getElementsByTagName('img');
    while (imgs.length) imgs[0].replaceWith('![](' + (imgs[0] as HTMLImageElement).src + ')')
    const ps = el.getElementsByTagName('p');
    for (let i = 0; i < ps.length; i++) ps[i].textContent += '\n'
    return el.innerText
}

export const AttachmentPreview = () => {
    const [preview, setPreview] = useState('')
    const t = window.TrelloPowerUp.iframe();
    useState(async () => {
        setPreview(await getHTML(t.arg('fileId', '')) || '')
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
