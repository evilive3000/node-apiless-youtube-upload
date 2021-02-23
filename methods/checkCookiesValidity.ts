import {WebDriver} from 'selenium-webdriver'
import {URL, makeWebDriver, Cookies} from '../helpers'

export default async (cookies: Cookies): Promise<boolean> => {
    if (!cookies || !cookies.length) return false

    const driver = await makeWebDriver({headless: true})

    return checker(driver, cookies)
        .catch(() => false)
        .finally(() => driver.quit())
}

const checker = async (driver: WebDriver, cookies: Cookies): Promise<boolean> => {
    await driver.get(URL.GOOGLE)

    for (const cookie of cookies) await driver.manage().addCookie(cookie)

    await driver.get(URL.YOUTUBE_STUDIO)

    await driver.sleep(1000)

    // Check if url is still studio.youtube.com and not accounts.google.com
    // (which is the case if cookies are not valid / are expired)
    const url = await driver.getCurrentUrl()

    return url.includes(URL.YOUTUBE_STUDIO)
}
