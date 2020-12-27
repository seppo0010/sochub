import React, {useState, useEffect} from 'react';
import { GoogleLogout, GoogleLogin, GoogleLoginResponse, GoogleLoginResponseOffline } from 'react-google-login';


const GoogleDocs = () => {
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

export default GoogleDocs;
