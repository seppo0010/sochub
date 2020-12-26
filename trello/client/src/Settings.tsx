import React from "react";
// import { Trello } from './types/TrelloPowerUp';

const Settings = () => {
    return (
        <div id="content" style={{padding: 20}}>
            <h1>Settings</h1>
            <p>
                Google Docs
                &nbsp;
                <button onClick={() => alert(1)}>Login</button>
            </p>
            <button id="save" className="mod-primary">Save</button>
        </div>
    )
}
export default Settings;
