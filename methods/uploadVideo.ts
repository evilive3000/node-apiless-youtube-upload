import {path} from 'chromedriver'
import webdriver, {Builder, until, By, IWebDriverCookie } from 'selenium-webdriver'
import chrome, { Options } from 'selenium-webdriver/chrome'
import fs from 'fs-extra'

const GOOGLE_URL = `https://google.com`;
const YOUTUBE_STUDIO_URL = `https://studio.youtube.com`;

export interface VideoObj {
    videoPath: string
    title: string
    thumbnailPath?: string
    description?: string
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

export default async (videoObj : VideoObj, cookies : IWebDriverCookie[], headlessMode = true, onProgress = console.log, customWebdriverPath = undefined) => {
    if (!cookies || !cookies.length) throw new Error("Can't upload video: cookies not set.")

    validateVideoObj(videoObj)

    // Fill default values
    videoObj = {
        visibility: 'public',
        ...videoObj
    }

    let chromeOptions = new Options()
    if (headlessMode) chromeOptions.addArguments('--headless')

    var service = new chrome.ServiceBuilder(customWebdriverPath ? customWebdriverPath : path).build();
    chrome.setDefaultService(service);

    var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .setChromeOptions(chromeOptions)
    .build();

    try {
        onProgress('Settings cookies..')

        // Load google page to set up cookies
        await driver.get(GOOGLE_URL)

        // Add cookies
        for (let cookie of cookies) await driver.manage().addCookie(cookie)

        onProgress('Opening Youtube Studio..')

        // Open Youtube Studio page
        await driver.get(YOUTUBE_STUDIO_URL);

        // Wait 1000ms
        await driver.sleep(1000)

        // Check if url is still studio.youtube.com and not accounts.google.com (which is the case if cookies are not valid / are expired)
        var url = (await driver.getCurrentUrl())
        if (!url.includes('studio.youtube.com/')) {
            throw new Error(`Cookies are expired or not valid. (tried to upload, was redirected to ${url}`)
        }

        // Click upload
        await driver.findElement(By.css("#upload-icon > .remove-defaults")).click()

        // Wait for file input to appear
        await driver.wait(until.elementsLocated(By.css("input[type=file]")))

        onProgress('Initializing video..')

        // Enter file path
        await driver.findElement(By.css("input[type=file]")).sendKeys(videoObj.videoPath)
        
        // Wait for file to upload
        await driver.wait(until.elementsLocated(By.css("#textbox")))

        // Wait for random javascript garbage to load
        await driver.sleep(7000)

        onProgress('Entering title..')

        // Enter title
        var titleBox = (await driver.findElements(By.css("#textbox")))[0]
        await titleBox.click()
        await titleBox.clear()
        await titleBox.sendKeys(videoObj.title)
        
        onProgress('Entering description..')

        // Enter Description
        var descriptionBox = (await driver.findElements(By.css("#textbox")))[1]
        await descriptionBox.click()
        await descriptionBox.clear()
        if (videoObj.description) {
            await descriptionBox.sendKeys(videoObj.description)
        }

        onProgress('Entering custom thumbnail..')

        // Enter custom thumbnail
        if (videoObj.thumbnailPath) {
            var thumbnailBox = await driver.findElement(By.css("#file-loader"))
            await thumbnailBox.sendKeys(videoObj.thumbnailPath)
        }

        // Wait for thumbnail to load
        await driver.sleep(5000)

        onProgress('Setting visibility options..')

        // Go to visibility tab
        await (await driver.findElement(By.css("#step-title-2"))).click()

        // Wait for it to load
        await driver.wait(until.elementsLocated(By.css("#privacy-radios")))
        
        // Select proper visibility setting
        var [hiddenButton, unlistedButton, publicButton] = await driver.findElements(By.css("#privacy-radios > paper-radio-button"))
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
                var progressEl = await driver.findElement(By.css("ytcp-video-upload-progress > .progress-label"))
                var innerHTML = (await progressEl.getAttribute("innerHTML")).replace(/&nbsp/g, ' ')
                onProgress(innerHTML)

                // String that indicate uploading: "Uploading 57% ... 2 minutes left", "Uploading..", "Uploading 100% ..."
                // String that indicate finishing: "Processing HD version, SD complete", "Finished processing", "Upload complete ... Processing will begin shortly"
                if (/\D \.\.\. \D/.test(innerHTML) || /^[^\.]+$/.test(innerHTML)) {
                    clearInterval(int)

                    // Click Publish on the video
                    await (await driver.findElement(By.css("#done-button"))).click()

                    onProgress('Done! (video may still be processing, but it is uploaded)')

                    return resolve()
                }


            }, 4000)
        
        })

        return null
    } finally {
        await driver.quit();
    }

}