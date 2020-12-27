import { Trello } from '../types/TrelloPowerUp';
import React, {useState, useEffect} from 'react';
import { GoogleLogout, GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';


export const Settings = () => {
    const [user, setUser] = useState<GoogleLoginResponse | GoogleLoginResponseOffline | undefined>();
    const t = window.TrelloPowerUp.iframe();
    useEffect(() => {
        const u = user as GoogleLoginResponse;
        t.storeSecret('GoogleDocs_userToken', u && u.accessToken ? u.accessToken : '')
    })
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
    text: 'Import from Google Docs',
    callback: (t: Trello.PowerUp.IFrame) => {
        return t.modal({
            url: '/trello/input-googledocs',
            fullscreen: true,
        })
    },
}

export const Page = () => {
    const [loading, setLoading] = useState(true)
    const [needsLogin, setNeedsLogin] = useState(() => gapi.load('picker', {
        callback: async () => {
            setLoading(false)
            const t = window.TrelloPowerUp.iframe();
            const oauthToken = await t.loadSecret('GoogleDocs_userToken')
            if (!oauthToken) {
                setNeedsLogin(true)
                return
            }
            var view = new google.picker.View(google.picker.ViewId.DOCS);
            view.setMimeTypes("image/png,image/jpeg,image/jpg");
            var picker = new google.picker.PickerBuilder()
                .enableFeature(google.picker.Feature.NAV_HIDDEN)
                .setOAuthToken(oauthToken)
                .addView(view)
                .addView(new google.picker.DocsUploadView())
                .setCallback((data: any) => {
                    if (data.action == google.picker.Action.PICKED) {
                        var fileId = data.docs[0].id;
                        alert(fileId)
                        t.closeModal()
                    }
                })
                .build();
            picker.setVisible(true);
        },
    }))
    return (
        <div style={{padding: 20}}>
            {loading && 'Loading...'}
            {!loading && needsLogin && 'Go to settings to log in to google docs'}
        </div>
    )
}
