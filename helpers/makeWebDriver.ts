import {Builder, Capabilities, WebDriver} from 'selenium-webdriver'
import chrome, {Options} from 'selenium-webdriver/chrome'
import {ensureChromedriver} from 'node-chromedriver-downloader'

type DriverArgs = {
    automation?: boolean
    userDataDir?: string
    headless?: boolean
    fullsize?: boolean
}

const argDefaults: DriverArgs = {
    automation: false,
    headless: false,
    fullsize: false,
}

export const makeWebDriver = async (args: DriverArgs = argDefaults): Promise<WebDriver> => {
    const chromeOptions = new Options()

    // chromeOptions.addArguments('--password-store=gnome')
    // fix linux not loading logged in profile properly (no idea why)
    chromeOptions.excludeSwitches('password-store')
    chromeOptions.addArguments('--log-leve=3')

    if (args.automation) {
        chromeOptions.addArguments('--enable-automation')
    }
    if (args.userDataDir) {
        chromeOptions.addArguments(`--user-data-dir=${args.userDataDir}`)
    }
    if (args.headless) {
        chromeOptions.headless()
    }
    if (args.fullsize) {
        // default size (sometimes) causes uploading page's "Done" button to be out of viewport,
        // causing "element not interactable" error therefore here make the window size large
        chromeOptions.windowSize({width: 1920, height: 1080})
    }

    const webdriverPath = await ensureChromedriver()
    chrome.setDefaultService(new chrome.ServiceBuilder(webdriverPath).build())

    return new Builder()
        .withCapabilities(Capabilities.chrome())
        .setChromeOptions(chromeOptions)
        .build()
}
