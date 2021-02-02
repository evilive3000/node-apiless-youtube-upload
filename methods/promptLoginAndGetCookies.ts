import chromeLocation from 'chrome-location'
import rimraf from 'rimraf'
import * as Path from 'path'
import * as fse from 'fs-extra'
import * as fs from 'fs/promises'
import * as os from 'os'
import {spawn} from 'child_process'
import {promisify} from 'util'
import {pid2title, URL, makeWebDriver} from '../helpers'
import {IWebDriverCookie, until, WebDriver} from 'selenium-webdriver'

const rimrafAsync = promisify(rimraf)
const delayAsync = (ms: number) => new Promise((res) => setTimeout(res, ms))
const isRunning = (pid: number): boolean => {
    try {
        // @see https://nodejs.org/api/process.html#process_process_kill_pid_signal
        return process.kill(pid, 0)
    } catch (error) {
        return error.code === 'EPERM'
    }
}

interface ITempDirectory {
    path: string
    remove: () => Promise<void>
}

const createTmpDir = async (prefix: string): Promise<ITempDirectory> => {
    const path = await fs.mkdtemp(Path.join(os.tmpdir(), prefix))
    const remove = () => fs.rm(path, {recursive: true, force: true, maxRetries: 3})
    return {path, remove}
}

// "Chrome didn't shut down correctly" dialog is caused by their
// crash handler detecting the process was killed. This might be confusing
// to the end user, so we remove it by editing profile preferences
const chromePreventCrashDialog = async (profilePath: string): Promise<void> => {
    const preferencesPath = Path.join(profilePath, 'Default', 'Preferences')
    const json = await fse.readJSON(preferencesPath)
    json.profile.exit_type = 'Normal'
    await fse.writeJSON(preferencesPath, json)
}

const hasNotLoggedIn = async (pid: number): Promise<boolean> => {
    return (
        pid2title(pid)
            // The final destination title after a succesfull login includes '- YouTube Studio' regardless of language
            .then((title) => !title.includes('- YouTube Studio'))
            .catch((e) => {
                console.error(e)
                return true
            })
    )
}

const runUncontrolledChrome = async (userDataDir: string): Promise<void> => {
    // Spawn a chrome WITHOUT automation features like --remote-debugging-port or --enable automation because they disable google login in most cases
    // This uncontrolled chrome instance saves cookies to the tempDir. Login status is tracked on windows by process title.
    const chromeProcess = spawn(chromeLocation, [
        'https://studio.youtube.com',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-translate',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-zero-browsers-open-for-tests',
        `--user-data-dir=${userDataDir}`,
        // possibly confusing "save password" prompt is not possible to
        // hide because it's only possible by "--enable-automation"
    ])

    const pid = chromeProcess.pid
    do {
        await delayAsync(1000)
    } while (isRunning(pid) && (await hasNotLoggedIn(pid)))

    chromeProcess.kill()
    await delayAsync(1000)
    await chromePreventCrashDialog(userDataDir)
}

const makeLoggedInChromeProfile = async (): Promise<ITempDirectory> => {
    const modulePrefix = 'node-apiless-youtube-upload-'
    const tempDir = await createTmpDir(modulePrefix)

    // Adding a removal exit hook for tempDir is a bad idea, because it cant be
    // done synchronously for EBUSY reasons (and no async hooks I tried did not
    // work). Therefore we do a cleanup of previous runs rather than trying to
    // clean up the current one on exit
    const {base: tmpBase, dir} = Path.parse(tempDir.path)
    for (const file of await fse.readdir(dir)) {
        if (file === tmpBase || !file.startsWith(modulePrefix)) continue

        const prevProfilePath = Path.join(dir, file)
        console.log('Removing temp profile from previous run', prevProfilePath)
        await rimrafAsync(prevProfilePath).catch(console.error)
    }

    return runUncontrolledChrome(tempDir.path)
        .then(() => tempDir)
        .catch((err) => tempDir.remove().then(() => Promise.reject(err)))
}

const fetchCookies = async (driver: WebDriver): Promise<IWebDriverCookie[]> => {
    // go to google.com to trigger the saved profile to load faster
    await driver.get(URL.LOADER)
    await driver.sleep(4000)
    await driver.get(URL.GOOGLE)
    // Open youtube studio to test if the login is valid
    await driver.get(URL.YOUTUBE_STUDIO)

    // If cookies are valid, user is now either in Youtube Studio at studio.youtube.com,
    // or User select page at youtube.com
    const currentUrl = await driver.getCurrentUrl()
    const isLoggedIn = [URL.YOUTUBE, URL.YOUTUBE_STUDIO].some((link) => currentUrl.startsWith(link))
    if (!isLoggedIn) {
        throw new Error(
            'The login session could not be loaded (either user never logged in, ' +
                "random lag or google account doesn't have a youtube attached)",
        )
    }

    // Select youtube account (one google account might have many brand accounts)
    await driver.get(URL.SELECT_ACCOUNT_YOUTUBE)
    // Wait until url matches exactly URL.YOUTUBE. Note that account selection url includes URL.YOUTUBE, which we don't want to match.
    await driver.wait(until.urlIs(URL.YOUTUBE), 60 * 1000)

    return driver.manage().getCookies()
}

export default async (): Promise<IWebDriverCookie[]> => {
    let profilePath: ITempDirectory
    let webDriver: WebDriver

    try {
        profilePath = await makeLoggedInChromeProfile()
        webDriver = await makeWebDriver({automation: true, userDataDir: profilePath.path})
        return await fetchCookies(webDriver)
    } finally {
        if (webDriver) await webDriver.quit()
        if (profilePath) await profilePath.remove()
    }
}

export {IWebDriverCookie}
