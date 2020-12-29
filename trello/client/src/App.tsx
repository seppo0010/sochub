import React, {useState} from 'react';
import {
  BrowserRouter as Router,
  Route,
} from "react-router-dom";

import { Trello } from './types/TrelloPowerUp';
import {
    Page as GoogleDocsPage,
    Button as GoogleDocsButton,
    buttonShouldDisplay as googleDocsButtonShouldDisplay,
    AttachmentSection as GoogleDocsAttachmentSection,
    AttachmentPreview as GoogleDocsAttachmentPreview,
    LoginRefresh as GoogleDocsLoginRefresh,
} from './Input/GoogleDocs';
import { tweetAction } from './Output/Twitter'
import Preview from './Preview';
import Settings from './Settings';

function App() {
  return (
    <div className="App">
      <Router>
        <Route path="/trello/input-googledocs" exact>
          <GoogleDocsLoginRefresh />
          <GoogleDocsPage />
        </Route>
        <Route path="/trello/input-googledocs/preview" exact>
          <GoogleDocsLoginRefresh />
          <GoogleDocsAttachmentPreview />
        </Route>
        <Route path="/trello/output/preview" exact>
          <GoogleDocsLoginRefresh />
          <Preview />
        </Route>
        <Route path="/trello/settings" exact>
          <GoogleDocsLoginRefresh />
          <Settings />
        </Route>
        <Route path="/trello" exact>
          <Connector />
        </Route>
      </Router>
    </div>
  );
}

const Connector = () => {
    useState(() => {
        window.TrelloPowerUp.initialize({
            'attachment-sections': async (t, options) => {
                return (await Promise.all([GoogleDocsAttachmentSection].map((x) => x(t, options)))).flat()
            },
            'card-back-section': async (t) => {
                return {
                    icon: '',
                    title: 'Preview',
                    action: tweetAction,
                    content: {
                        type: 'iframe',
                        url: t.signUrl(process.env.REACT_APP_BASE_URL + '/trello/output/preview'),
                        height: 230,
                    }
                };
            },
            'card-buttons': async (t: Trello.PowerUp.IFrame) => {
                return (await Promise.all([
                    googleDocsButtonShouldDisplay(t).then((x) => { return {
                        shouldDisplay: x,
                        button: GoogleDocsButton
                    }}),
                ])).filter((x) => x.shouldDisplay).map((x) => x.button)
            },
            'show-settings': function(t: Trello.PowerUp.IFrame) {
                return t.modal({
                    title: 'Settings',
                    url: './settings',
                });
            },
        })
    })
    return <></>
}

export default App;
