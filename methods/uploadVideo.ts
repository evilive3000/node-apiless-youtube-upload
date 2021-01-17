import {ensureChromedriver} from 'node-chromedriver-downloader'
import webdriver, {Builder, Key, until, By, IWebDriverCookie, WebElement } from 'selenium-webdriver'
import chrome, { Options } from 'selenium-webdriver/chrome'
import fs from 'fs-extra'

const GOOGLE_URL = `https://google.com`;
const YOUTUBE_STUDIO_URL = `https://studio.youtube.com`;

export interface VideoObj {
    videoPath: string
    title: string
    thumbnailPath?: string
    description?: string
    monetization: boolean
    visibility?: 'private' | 'unlisted' | 'public'
}

const validateVideoObj = (videoObj : VideoObj) => {
    if (!videoObj.videoPath) throw new Error("VideoObj: missing required property videoPath")
    if (!videoObj.title) throw new Error("VideoObj: missing required property title")
    if (videoObj.title.length > 100) throw new Error("VideoObj: given title is longer than max 100 characters")
    if (videoObj.description.length > 5000) throw new Error("VideoObj: given description is longer than max 5000 characters")
    if (videoObj.visibility && !['private', 'unlisted', 'public'].includes(videoObj.visibility)) throw new Error(`VideoObj: given visibility value "${videoObj.visibility}" is not valid. Should be private, unlisted or public`)
    if (!fs.existsSync(videoObj.videoPath)) throw new Error(`VideoObj: given videoPath doesn't exist on disk (${videoObj.videoPath})`)
    if (videoObj.thumbnailPath && !fs.existsSync(videoObj.thumbnailPath)) throw new Error(`VideoObj: given thumbnailPath doesn't exist on disk (${videoObj.thumbnailPath})`)
}

export default async (videoObj : VideoObj, cookies : IWebDriverCookie[], headlessMode = true, onProgress = console.log) => {
    if (!cookies || !cookies.length) throw new Error("Can't upload video: cookies not set.")

    validateVideoObj(videoObj)

    // Fill default values
    videoObj = {
        visibility: 'public',
        monetization: false,
        description: '',
        ...videoObj
    }

    let chromeOptions = new Options()
    if (headlessMode) chromeOptions.addArguments('--headless', '--log-level=3')

    var webdriverPath = await ensureChromedriver()
    var service = new chrome.ServiceBuilder(webdriverPath).build();
    chrome.setDefaultService(service);

    var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .setChromeOptions(chromeOptions)
    .build();

    const enterEmojiString = async (webElement : WebElement, string : string) => {
        // sendKeys(string) doesn't support emojis (causes a crash)
        // youtube custom input elements don't have "value" property (but webEl.clear() still works)
        // clipboard hack works but not in headless mode
        // also editing innerHTML causes racing conditions with the underlying javascript mechanism
        // solution is to use an obsolete method document.execCommand('insreText')
        await driver.sleep(500)
        webElement.click()
        await driver.sleep(250)
        webElement.clear()
        await driver.sleep(250)
        await driver.executeScript(`
        arguments[0].focus();
        document.execCommand('insertText', false, arguments[1]);
        `, webElement, string)
    }

    const ensureNoSecurityWarning = async () => {
        await driver.executeScript("if (document.querySelector('ytcp-auth-confirmation-dialog')) document.querySelector('ytcp-auth-confirmation-dialog').remove()")
    }

    const findElements = async (cssSelector : string) => {
        var webEls = await driver.findElements(By.css(cssSelector))
        if (webEls[0]) await driver.executeScript('arguments[0].scrollIntoViewIfNeeded()', webEls[0])
        return webEls
    }

    const findElement = async (cssSelector : string) => {
        var els = await findElements(cssSelector)
        if (els.length === 0) throw new Error(`Element was not found with selector '${cssSelector}'`)
        return els[0]
    }

    const tryFindElement = async (cssSelector : string) => {
        var els = await findElements(cssSelector)
        if (els.length == 0) return false
        return els[0]
    }

    const tryMonetization = async () => {
        const monetizationTabButton = await tryFindElement('button[test-id=MONETIZATION]')
        if (!monetizationTabButton) return onProgress('Monetization options are not available on this channel. Continuing..')

        onProgress("Applying monetization settings..")

        await monetizationTabButton.click()
        await driver.sleep(500)
        await (await findElement('ytcp-icon-button[class~=ytcp-video-monetization]')).click()
        await driver.sleep(500)

        var isAlreadyOff = (await (await findElement('paper-radio-button[id=radio-off][class~=ytcp-video-monetization-edit-dialog]')).getAttribute('aria-selected')) === "true" ? true : false

        if (isAlreadyOff && videoObj.monetization) {
            onProgress('Setting monetization on...');
            await (await findElement('paper-radio-button[id=radio-on][class~=ytcp-video-monetization-edit-dialog]')).click();
            await driver.sleep(500)
            await (await findElement('ytcp-button[id=save-button][class~=ytcp-video-monetization-edit-dialog]')).click();
        } else if (!isAlreadyOff && !videoObj.monetization) {
            onProgress('Setting monetization off...');
            await (await findElement('paper-radio-button[id=radio-off][class~=ytcp-video-monetization-edit-dialog]')).click();
            await driver.sleep(500)
            await (await findElement('ytcp-button[id=save-button][class~=ytcp-video-monetization-edit-dialog]')).click()
        } else {
            onProgress(`Monetization is already the desired value (${isAlreadyOff ? 'off' : 'on'})...`);
            await (await findElement('iron-overlay-backdrop[opened]')).click()
        }

        await driver.sleep(500)
    }

    var securityIgnoreInterval = null

    try {
        onProgress('Settings cookies..')

        // Load google page to set up cookies
        await driver.get(GOOGLE_URL)

        // Add cookies
        for (let cookie of cookies) await driver.manage().addCookie(cookie)

        onProgress('Opening Youtube Studio..')

        // Open Youtube Studio page
        await driver.get(YOUTUBE_STUDIO_URL);

        // Wait for stuff to fully load
        await driver.sleep(1000)

        securityIgnoreInterval = setInterval(() => {
            ensureNoSecurityWarning()
        }, 500)

        // Check if url is still studio.youtube.com and not accounts.google.com (which is the case if cookies are not valid / are expired)
        var url = (await driver.getCurrentUrl())
        if (!url.includes('studio.youtube.com/')) {
            throw new Error(`Cookies are expired or not valid. (tried to upload, was redirected to ${url}`)
        }

        // Click upload
        await (await findElement("#upload-icon > .remove-defaults")).click()

        // Wait for file input to appear
        await driver.wait(until.elementsLocated(By.css("input[type=file]")), 10000)

        onProgress('Initializing video..');

        // Enter file path
        await (await findElement("input[type=file]")).sendKeys(videoObj.videoPath)
        
        // Wait for file to upload
        await driver.wait(until.elementsLocated(By.css("#textbox")), 50000)

        // Wait for random javascript garbage to load
        await driver.sleep(10000)

        var editBoxes = await findElements("#textbox")

        onProgress('Initializing title and description..')

        // Enter title and description
        var titleBox = editBoxes[0]
        var descriptionBox = editBoxes[1]
        await enterEmojiString(titleBox, videoObj.title)
        await enterEmojiString(descriptionBox, videoObj.description)
        await driver.sleep(1000)

        // Youtube has some weird draft mechanism that auto fills the title and description.
        // There is already 10s sleep before this, but it seems like sometimes the draft mechanism only triggers
        // after text is entered into the field. That's why we enter title and description twice.
        onProgress('Confirming title and description..')
        await enterEmojiString(titleBox, videoObj.title)
        await enterEmojiString(descriptionBox, videoObj.description)

        onProgress('Entering custom thumbnail..')

        // Enter custom thumbnail
        if (videoObj.thumbnailPath) {
            var thumbnailBox = await findElement("#file-loader")
            await thumbnailBox.sendKeys(videoObj.thumbnailPath)
        }

        // Wait for thumbnail to load
        await driver.sleep(5000)

        onProgress('Setting "not made for kids" (the only supported options right now)..')
        await (await findElement('[name=NOT_MADE_FOR_KIDS]')).click()

        await driver.sleep(1000)

        await tryMonetization()

        onProgress(`Setting visibility option to ${videoObj.visibility}..`)

        // Go to visibility tab
        await (await findElement('button[test-id=REVIEW]')).click()

        // Wait for it to load
        await driver.wait(until.elementsLocated(By.css("#privacy-radios")), 10000)
        
        // Select proper visibility setting
        var [hiddenButton, unlistedButton, publicButton] = await findElements("#privacy-radios > paper-radio-button")
        switch (videoObj.visibility) {
            case 'private':
                hiddenButton.click()
                break;
            case 'unlisted':
                unlistedButton.click()
                break;
            case 'public':
                publicButton.click()
                break;
            default:
                throw new Error("Unrecognized visibility option")
        }

        onProgress('Uploading..')

        // Wait for uploading to finish
        await new Promise((resolve, reject) => {
            // Poll progress updates
            var int = setInterval(async () => {
                var progressEl = await findElement("ytcp-video-upload-progress > .progress-label")
                var innerHTML = (await progressEl.getText()).replace(/&nbsp/g, ' ')
                onProgress(innerHTML)

                // String that indicate uploading: "Uploading 57% ... 2 minutes left", "Uploading..", "Uploading 100% ..."
                // String that indicate finishing: "Processing HD version, SD complete", "Finished processing", "Upload complete ... Processing will begin shortly"
                if (/\D \.\.\. \D/.test(innerHTML) || /^[^\.]+$/.test(innerHTML)) {
                    clearInterval(int)

                    onProgress("Publishing..")

                    // Click Publish on the video
                    await (await findElement("#done-button")).click()
                    
                    await driver.sleep(2000)

                    // There is an additional confirmation, if the video is set public and monetization is enabled
                    var confirmationMaybe = await tryFindElement('ytcp-button[id=publish-button][class~=ytcp-prechecks-warning-dialog]')
                    if (confirmationMaybe) confirmationMaybe.click()

                    await driver.sleep(1000)

                    onProgress('Done! (video may still be processing, but it is uploaded)')

                    return resolve(undefined)
                }


            }, 4000)
        
        })

        return null
    } finally {
        clearInterval(securityIgnoreInterval)
        await driver.quit();
    }

}