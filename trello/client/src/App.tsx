import React from "react";
import {
  BrowserRouter as Router,
  Route,
} from "react-router-dom";

import { Trello } from './types/TrelloPowerUp';
import { Page as GoogleDocsPage, Button as GoogleDocsButton } from './Input/GoogleDocs';
import Settings from './Settings';

function App() {
  return (
    <div className="App">
      <Router>
        <Route path="/trello/input-googledocs" exact>
          <GoogleDocsPage />
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
    'card-buttons': function(t: Trello.PowerUp.IFrame) {
        return Promise.resolve([GoogleDocsButton])
    },
    'show-settings': function(t: Trello.PowerUp.IFrame) {
        return t.modal({
            title: 'Settings',
            url: './settings',
        });
    }
})

export default App;
