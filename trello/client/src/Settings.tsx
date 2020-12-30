import React from "react";
import { Settings as GoogleDocs } from './Input/GoogleDocs'
import { Settings as Twitter } from './Output/Twitter'
import { Settings as Medium } from './Output/Medium'

const Settings = () => {
    return (
        <div id="content" style={{padding: 20}}>
            <h1>Settings</h1>
            <GoogleDocs />
            <Twitter />
            <Medium />
        </div>
    )
}
export default Settings;
