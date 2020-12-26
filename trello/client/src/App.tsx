import React from "react";
import {
  BrowserRouter as Router,
  Route,
} from "react-router-dom";

import { Trello } from './types/TrelloPowerUp';
import Input from './Input';
import Settings from './Settings';

function App() {
  return (
    <div className="App">
      <Router>
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
        return Promise.resolve([Input.GoogleDocs])
    },
    'show-settings': function(t: Trello.PowerUp.IFrame) {
        return t.modal({
            title: 'Settings',
            url: './settings',
        });
    }
})

export default App;
