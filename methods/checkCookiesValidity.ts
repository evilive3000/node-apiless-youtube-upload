import {ensureChromedriver} from 'node-chromedriver-downloader'
import webdriver, {IWebDriverCookie, ThenableWebDriver} from 'selenium-webdriver'
import chrome, {Options} from 'selenium-webdriver/chrome'

const GOOGLE_URL = 'https://google.com'
const YOUTUBE_STUDIO_URL = 'https://studio.youtube.com'

export default async (cookies: IWebDriverCookie[]): Promise<boolean> => {
    if (!cookies || !cookies.length) return false

    const chromeOptions = new Options()
    chromeOptions.addArguments('--headless')

    const webdriverPath = await ensureChromedriver()
    const service = new chrome.ServiceBuilder(webdriverPath).build()
    chrome.setDefaultService(service)

    const driver = new webdriver.Builder()
        .withCapabilities(webdriver.Capabilities.chrome())
        .setChromeOptions(chromeOptions)
        .build()

    return checker(driver, cookies)
        .catch(() => false)
        .finally(() => driver.quit())
}

const checker = async (driver: ThenableWebDriver, cookies: IWebDriverCookie[]): Promise<boolean> => {
    // Load google page to set up cookies
    await driver.get(GOOGLE_URL)

    // Add cookies
    for (const cookie of cookies) await driver.manage().addCookie(cookie)

    // Open Youtube Studio page
    await driver.get(YOUTUBE_STUDIO_URL)

    // Wait 1000ms
    await driver.sleep(1000)

    // Check if url is still studio.youtube.com and not accounts.google.com
    // (which is the case if cookies are not valid / are expired)
    const url = await driver.getCurrentUrl()

    return url.includes('studio.youtube.com/')
}
