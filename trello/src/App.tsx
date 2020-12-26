import { Trello } from './types/TrelloPowerUp';
import Input from './Input'

function App() {
  return (
    <div className="App">
      <h1>Hello world</h1>
    </div>
  );
}

window.TrelloPowerUp.initialize({
    'card-buttons': function(t: Trello.PowerUp.IFrame) {
        return Promise.resolve([Input.GoogleDocs])
    },
})

export default App;
