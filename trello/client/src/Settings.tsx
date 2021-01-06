import React from "react";
import { Settings as GoogleDocs } from './Input/GoogleDocs'
import { Settings as Twitter } from './Output/Twitter'
import { Settings as Medium } from './Output/Medium'
import { Settings as Instagram } from './Output/Instagram'
import { Settings as Telegram } from './Output/Telegram'
import { Settings as Facebook } from './Output/Facebook'

const Settings = () => {
    return (
        <div id="content" style={{padding: 20}}>
            <h1>Settings</h1>
            <GoogleDocs />
            <Twitter />
            <Medium />
            <Instagram />
            <Telegram />
            <Facebook />
        </div>
    )
}
export default Settings;
