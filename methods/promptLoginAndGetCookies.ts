import {path} from 'chromedriver'
import webdriver, {Builder, until, By, IWebDriverCookie } from 'selenium-webdriver'
import chrome, { Options } from 'selenium-webdriver/chrome'

// Google sign in url that has to be "proxied" through their API Playground, because otherwise it will complain about "unsecure browser/app"
// Credits: https://gist.github.com/ikegami-yukino/51b247080976cb41fe93#gistcomment-3455633
const GOOGLE_SIGN_IN_PROXIED_URL = `https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?redirect_uri=https%3A%2F%2Fdevelopers.google.com%2Foauthplayground&prompt=consent&response_type=code&client_id=407408718192.apps.googleusercontent.com&scope=email&access_type=offline&flowName=GeneralOAuthFlow`;
const GOOGLE_SIGN_IN_SUCC_URL = `https://developers.google.com/oauthplayground/`
const SELECT_ACCOUNT_YOUTUBE_URL = `https://www.youtube.com/signin?action_prompt_identity=true&app=desktop&next=%2F`;
const YOUTUBE_URL = `https://www.youtube.com/`;

export default async (customWebdriverPath = undefined) : Promise<IWebDriverCookie[]> => {
    var service = new chrome.ServiceBuilder(customWebdriverPath ? customWebdriverPath : path).build();
    chrome.setDefaultService(service);

    var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

    try {
        // Login to youtube using a proxy
        await driver.get(GOOGLE_SIGN_IN_PROXIED_URL);
        await driver.wait(until.urlContains(GOOGLE_SIGN_IN_SUCC_URL), 5 * 60 * 1000);

        // Select youtube account (one google account might have many brand accounts)
        await driver.get(SELECT_ACCOUNT_YOUTUBE_URL)
        await driver.wait(until.urlIs(YOUTUBE_URL), 60 * 1000);
        
        // Get cookeis
        var cookies = await driver.manage().getCookies()

        return cookies
    } finally {
        await driver.quit();
    }
}

export {IWebDriverCookie}