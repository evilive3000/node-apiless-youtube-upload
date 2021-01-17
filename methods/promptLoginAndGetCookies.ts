import {ensureChromedriver} from 'node-chromedriver-downloader'
import path from 'path'
import webdriver, {Builder, until, By, IWebDriverCookie } from 'selenium-webdriver'
import chrome, { Options } from 'selenium-webdriver/chrome'
import {spawn, execSync} from 'child_process'
import { createTempDirectory, ITempDirectory } from 'create-temp-directory'
import fs from 'fs-extra'
import chromeLocation from 'chrome-location'
import rimraf from 'rimraf'

const SELECT_ACCOUNT_YOUTUBE_URL = `https://www.youtube.com/signin?action_prompt_identity=true&app=desktop&next=%2F`;
const YOUTUBE_URL = `https://www.youtube.com/`;
const YOUTUBE_STUDIO_URL = `https://studio.youtube.com/`;

const chromePreventCrashDialog = async (profilePath) => {
    // "Chrome didn't shut down correctly" dialog is caused by their crash handler detecting the process was killed
    // This might be confusing to the end user, so we remove it by editing profile preferences
    var preferencesPath = path.join(profilePath, 'Default', 'Preferences')
    var json = await fs.readJSON(preferencesPath)
    json.profile.exit_type = "Normal"
    await fs.writeJSON(preferencesPath, json)
}

const makeLoggedInChromeProfile = async () => {
    const modulePrefix = 'node-apiless-youtube-upload-'
    const tempDir = await createTempDirectory(modulePrefix)
    var chromeProcess;
    var closed = false

    // Adding a removal exit hook for tempDir is a bad idea, because it cant be done synchonously for EBUSY reasons (and no async hooks I tried didn't work)
    // Therefore we do a cleanup of previous runs rather than trying to clean up the current one on exit
    for (var x of (await fs.readdir(path.dirname(tempDir.path)))) {
        if (x.startsWith(modulePrefix) && x !== path.basename(tempDir.path)) {
            var tempProfilePath = path.join(path.dirname(tempDir.path), x)
            console.log('Removing temp profile from previous run', tempProfilePath)
            try {
                await rimraf.sync(tempProfilePath)
            } catch(e) {
                console.log('Error: ', e)
            }
        }
    }

    try {
        await new Promise((resolve, reject) => {

            // Spawn a chrome WITHOUT automation features like --remote-debugging-port or --enable automation becasue they disable google login in most cases
            // This uncontrolled chrome instance saves cookies to the tempDir. Login status is tracked on windows by process title.
            chromeProcess = spawn(chromeLocation, [
                'https://studio.youtube.com',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-translate',
                '--disable-default-apps',
                '--disable-popup-blocking',
                '--disable-zero-browsers-open-for-tests',
                '--user-data-dir=' + tempDir.path
                // possibly confusing "save password" prompt is not possible to hide becasue it's only possible by "--enable-automation"
            ])

            var success, cancel

            // Poll youtube login status in the uncontrolled chrome instance
            var pollStatus = setInterval(() => {
                // Currently getting the process title (which exposes html document.title in chrome -> if youtube studio was opened succesfully)
                // is only supported in windows. In OSX and Linux, the login window needs to be closed by user. PRs are welcome!
                if (process.platform !== "win32") return;

                var title = execSync(`powershell.exe (Get-Process -id ${chromeProcess.pid} -ErrorAction SilentlyContinue).MainWindowTitle`).toString('utf8')
                
                if (title.includes('- YouTube Studio')) return success()
                // ^^ This string in title should indicate a sucesfull login regardless of client language. A few examples:
                // "لوحة البيانات الخاصة بالقناة - YouTube Studio"
                // "Papan pemuka saluran - YouTube Studio"
                // "Channel dashboard - YouTube Studio" 
            }, 1000)

            cancel = (e) => {
                if (closed) return
                closed = true

                clearInterval(pollStatus)
                reject(e)
            }

            success = async () => {
                if (closed) return
                closed = true

                clearInterval(pollStatus)

                if (chromeProcess.pid) {
                    chromeProcess.kill()
                    await new Promise((resolve,reject) => setTimeout(resolve, 1000))
                    await chromePreventCrashDialog(tempDir.path)
                }

                resolve(tempDir)
            }

            chromeProcess.on('error', cancel)
            chromeProcess.on('close', success)
        })
    } catch(e) {
        await tempDir.remove()
        throw new Error(e)
    }

    return tempDir
}

export default async () : Promise<IWebDriverCookie[]> => {
    var driver;
    var profilePath : ITempDirectory

    try {
        try {
            profilePath = await makeLoggedInChromeProfile()

            let chromeOptions = new Options()

            // Load the logged in profile
            chromeOptions.addArguments('--enable-automation', '--log-level=3', '--user-data-dir='+profilePath.path)

            var webdriverPath = await ensureChromedriver()
            var service = new chrome.ServiceBuilder(webdriverPath).build();
            chrome.setDefaultService(service);

            driver = new webdriver.Builder()
            .withCapabilities(webdriver.Capabilities.chrome())
            .setChromeOptions(chromeOptions)
            .build();

            // go to google.com to trigger the saved profile to load faster
            await driver.get('https://google.com');
            // Open youtube studio to test if the login is valid
            await driver.get(YOUTUBE_STUDIO_URL);

            if (!(await driver.getCurrentUrl()).includes('studio.youtube.com/')) {
                throw new Error("The login session could not be loaded (either user never logged in, random lag or google account doesn't have a youtube attached)")
            }

            // Select youtube account (one google account might have many brand accounts)
            await driver.get(SELECT_ACCOUNT_YOUTUBE_URL)
            await driver.wait(until.urlIs(YOUTUBE_URL), 60 * 1000);

            // Get cookeis
            var cookies = await driver.manage().getCookies()

            return cookies
        } finally {
            if (driver) await driver.quit()
        }
    } finally {
        if (profilePath) await profilePath.remove()
    }
}

export {IWebDriverCookie}