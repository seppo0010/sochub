import React from "react";
import { Settings as GoogleDocs } from './Input/GoogleDocs'
import { Settings as Twitter } from './Output/Twitter'

const Settings = () => {
    return (
        <div id="content" style={{padding: 20}}>
            <h1>Settings</h1>
            <GoogleDocs />
            <Twitter />
        </div>
    )
}
export default Settings;
