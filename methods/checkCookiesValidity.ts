import {ensureChromedriver} from 'node-chromedriver-downloader'
import {Builder, Capabilities, IWebDriverCookie, WebDriver} from 'selenium-webdriver'
import chrome, {Options} from 'selenium-webdriver/chrome'
import {URL} from '../helpers'

export default async (cookies: IWebDriverCookie[]): Promise<boolean> => {
    if (!cookies || !cookies.length) return false

    const chromeOptions = new Options()
    chromeOptions.addArguments('--headless')

    const webdriverPath = await ensureChromedriver()
    const service = new chrome.ServiceBuilder(webdriverPath).build()
    chrome.setDefaultService(service)

    const driver = new Builder()
        .withCapabilities(Capabilities.chrome())
        .setChromeOptions(chromeOptions)
        .build()

    return checker(driver, cookies)
        .catch(() => false)
        .finally(() => driver.quit())
}

const checker = async (driver: WebDriver, cookies: IWebDriverCookie[]): Promise<boolean> => {
    await driver.get(URL.GOOGLE)

    for (const cookie of cookies) await driver.manage().addCookie(cookie)

    await driver.get(URL.YOUTUBE_STUDIO)

    await driver.sleep(1000)

    // Check if url is still studio.youtube.com and not accounts.google.com
    // (which is the case if cookies are not valid / are expired)
    const url = await driver.getCurrentUrl()

    return url.includes(URL.YOUTUBE_STUDIO)
}
