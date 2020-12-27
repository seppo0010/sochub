import React from "react";
import GoogleDocs from './GoogleDocs'

const Settings = () => {
    return (
        <div id="content" style={{padding: 20}}>
            <h1>Settings</h1>
            <GoogleDocs />
            <button id="save" className="mod-primary">Save</button>
        </div>
    )
}
export default Settings;
