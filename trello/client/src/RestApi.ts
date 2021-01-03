const getToken = async () => {
    const t = window.TrelloPowerUp.iframe({
        appName: process.env.REACT_APP_TRELLO_APP_NAME,
        appKey: process.env.REACT_APP_TRELLO_APP_KEY,
    });
    const restApi = t.getRestApi()
    try {
        if (!(await restApi.isAuthorized())) {
            await t.getRestApi().authorize({scope: 'read,write'})
        }
        return await restApi.getToken()
    } catch (e) {
        console.error(e)
        return ''
    }
}
export default getToken;
