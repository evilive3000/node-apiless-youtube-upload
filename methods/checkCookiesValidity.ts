import {ensureChromedriver} from 'node-chromedriver-downloader'
import webdriver, {Builder, IWebDriverCookie } from 'selenium-webdriver'
import chrome, { Options } from 'selenium-webdriver/chrome'

const GOOGLE_URL = `https://google.com`;
const YOUTUBE_STUDIO_URL = `https://studio.youtube.com`;

export default async (cookies : IWebDriverCookie[]) => {
    if (!cookies || !cookies.length) return false

    let chromeOptions = new Options()
    chromeOptions.addArguments('--headless')

    var webdriverPath = await ensureChromedriver()
    var service = new chrome.ServiceBuilder(webdriverPath).build();
    chrome.setDefaultService(service);

    var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .setChromeOptions(chromeOptions)
    .build();

    try {
        // Load google page to set up cookies
        await driver.get(GOOGLE_URL)

        // Add cookies
        for (let cookie of cookies) await driver.manage().addCookie(cookie)

        // Open Youtube Studio page
        await driver.get(YOUTUBE_STUDIO_URL);

        // Wait 1000ms
        await driver.sleep(1000)

        // Check if url is still studio.youtube.com and not accounts.google.com (which is the case if cookies are not valid / are expired)
        var url = (await driver.getCurrentUrl())
        if (!url.includes('studio.youtube.com/')) {
            return false
        }
        
        return true
    } finally {
        await driver.quit();
    }

}