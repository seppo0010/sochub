import React, {useState} from 'react';
import FacebookLogin from 'react-facebook-login';
import './Facebook.css'
import twitter from 'twitter-text'

declare global {
    interface Window {
        fbAsyncInit: Function,
    }
}

const saveUser = async (user: {id: string, name: string, accessToken: string}) => {
}
export const Settings = () => {
    return (<div>
        <p>
            Facebook
            &nbsp;
            <FacebookLogin
                appId={process.env.REACT_APP_FACEBOOK_APP_ID || ''}
                textButton="Login"
                cssClass=""
                scope="pages_manage_posts,pages_show_list,pages_read_engagement"
                callback={(r) => console.log(r)} />
        </p>
    </div>)
}

export const Preview = ({input: {code}}: {input: {code: string}}) => {
    const [meta, setMeta] = useState(null);
    useState(async () => {
      setMeta(null);
      const matches = code && code.match(/https?:\/\/[-\w@:%_+.~#?,&//=]+/g);
      const url = matches && matches[0];
      if (url) {
          const json = await fetch("https://graph.facebook.com/?fields=og_object{image,title,description}&scrape=true&id=" + url);
          const data = await json.json();
          setMeta(data);
      }
    });
    console.log(meta)
    return (<div className="flex-auto">
      <div className="mb3 rounded shadow bg-white max-width-2">
          <header className="flex p2">
            <img src={process.env.REACT_APP_BASE_URL + "/facebook-default-figure.png"} className="circle h-40" alt="" style={{maxWidth: 60, maxHeight: 60}} />
            <div className="pl2">
              <div className="inline-block bold h5">My Page</div>
              <div className="h6 gray">Just now</div>
            </div>
          </header>
          <div className="h6 px2 py1" style={{whiteSpace: 'pre-line'}} dangerouslySetInnerHTML={{ __html: twitter.autoLink(twitter.htmlEscape(code)) }}></div>
          { /* meta.og_object && (<div className="border-gray border-top">
            <img className="col-12" src={ meta.og_object && meta.og_object.image[0].url } />
            <div className="p2">
              <div className="gray h6">{ meta.id }</div>
              <div className="bold h5">{ meta.og_object && meta.og_object.title }</div>
              <div className="gray h6">{ meta.og_object && meta.og_object.description }</div>
            </div>
          </div>) */}
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
