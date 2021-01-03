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
import {
    AttachmentSection as CanvaAttachmentSection,
} from './Input/Canva';
import { TARGET_TWITTER, TARGET_MEDIUM, TARGET_INSTAGRAM } from './Input'
import {
    twitterPublishItems,
    AttachmentSection as TwitterAttachmentSection
} from './Output/Twitter'
import { mediumPublishItems } from './Output/Medium'
import { publishItems as telegramPublishItems } from './Output/Telegram'
import Preview from './Preview';
import Schedule from './Schedule';
import Settings from './Settings';

function App() {
  return (
    <div className="App">
      <Router>
        <Route path="/trello/schedule" exact>
            <Schedule />
        </Route>
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
            'attachment-sections': async (t, options): Promise<Trello.PowerUp.LazyAttachmentSection[]> => {
                return (await Promise.all([
                    TwitterAttachmentSection,
                    GoogleDocsAttachmentSection,
                    CanvaAttachmentSection,
                ].map((x) => x(t, options)))).flat()
            },
            'board-buttons': async (t) => {
                return [
                    {
                        icon: { dark: '', light: '' },
                        text: 'Schedule',
                        condition: 'always',
                        callback: async () => {
                            t.modal({
                                fullscreen: true,
                                url: t.signUrl(process.env.REACT_APP_BASE_URL + '/schedule', ),
                                args: {initialView: 'listMonth'},
                                title: 'Schedule',
                            })
                        }
                    },
                    {
                        icon: { dark: '', light: '' },
                        text: 'Calendar',
                        condition: 'always',
                        callback: async () => {
                            t.modal({
                                fullscreen: true,
                                url: t.signUrl(process.env.REACT_APP_BASE_URL + '/schedule'),
                                args: {initialView: 'dayGridMonth'},
                                title: 'Calendar',
                            })
                        }
                    },
                ]
            },
            'card-back-section': async (t) => {
                return {
                    icon: '',
                    title: 'Preview',
                    action: {
                        text: 'Publish',
                        callback: async (t: Trello.PowerUp.IFrame) => {
                            return t.popup({
                                title: 'Publish this!',
                                items: (await Promise.all([
                                    twitterPublishItems(t),
                                    mediumPublishItems(t),
                                    telegramPublishItems(t),
                                ])).flat()
                            })
                        },
                    },
                    content: {
                        type: 'iframe',
                        url: t.signUrl(process.env.REACT_APP_BASE_URL + '/output/preview'),
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
                    height: 800,
                });
            },
            'card-badges': async (t: Trello.PowerUp.IFrame): Promise<Trello.PowerUp.CardBadge[]> => {
                const [tw, m, ig] = await Promise.all([
                    t.get('card', 'shared', 'Output_' + TARGET_TWITTER),
                    t.get('card', 'shared', 'Output_' + TARGET_MEDIUM),
                    t.get('card', 'shared', 'Output_' + TARGET_INSTAGRAM),
                ])
                const result: Trello.PowerUp.CardBadge[] = []
                if (tw) {
                    result.push({
                        text: 'Twitter',
                        icon: process.env.REACT_APP_BASE_URL + '/twitter.svg',
                        color: 'light-gray',
                    })
                }
                if (m) {
                    result.push({
                        text: 'Medium',
                        icon: process.env.REACT_APP_BASE_URL + '/medium.svg',
                        color: 'light-gray',
                    })
                }
                if (ig) {
                    result.push({
                        text: 'Instagram',
                        icon: process.env.REACT_APP_BASE_URL + '/instagram.svg',
                        color: 'light-gray',
                    })
                }
                return result
            },
        },
        {
            appName: process.env.REACT_APP_TRELLO_APP_NAME,
            appKey: process.env.REACT_APP_TRELLO_APP_KEY,
        })
    })
    return <></>
}

export default App;
