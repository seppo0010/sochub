import React from "react";
import {
  BrowserRouter as Router,
  Route,
} from "react-router-dom";

import { Trello } from './types/TrelloPowerUp';
import {
    Page as GoogleDocsPage,
    Button as GoogleDocsButton,
    isLoggedIn as googleDocsIsLoggedIn,
    AttachmentSection as GoogleDocsAttachmentSection,
    AttachmentPreview as GoogleDocsAttachmentPreview,
} from './Input/GoogleDocs';
import Settings from './Settings';

function App() {
  return (
    <div className="App">
      <Router>
        <Route path="/trello/input-googledocs" exact>
          <GoogleDocsPage />
        </Route>
        <Route path="/trello/input-googledocs/preview" exact>
          <GoogleDocsAttachmentPreview />
        </Route>
        <Route path="/trello/settings" exact>
          <Settings />
        </Route>
        <Route path="/trello" exact>
          <h1>Hello world</h1>
        </Route>
      </Router>
    </div>
  );
}

window.TrelloPowerUp.initialize({
    'attachment-sections': async (t, options) => {
        const x = (await Promise.all([GoogleDocsAttachmentSection].map((x) => x(t, options)))).flat()
        console.log(x); return x;
    },
    'card-buttons': async (t: Trello.PowerUp.IFrame) => {
        return (await Promise.all([
            googleDocsIsLoggedIn(t).then((x) => { return {
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
    }
})

export default App;
