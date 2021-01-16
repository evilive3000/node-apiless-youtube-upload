import promptLoginAndGetCookies from './methods/promptLoginAndGetCookies'
import checkCookiesValidity from './methods/checkCookiesValidity'
import uploadVideo, {VideoObj} from './methods/uploadVideo'
import saveCookiesToDisk from './methods/saveCookiesToDisk'
import loadCookiesFromDisk from './methods/loadCookiesFromDisk'
import {IWebDriverCookie } from 'selenium-webdriver'

export default class YoutubeUploader {
    cookies : IWebDriverCookie[]

    constructor() {
    }

    async promptLoginAndGetCookies() {
        this.cookies = await promptLoginAndGetCookies()
        return this.cookies
    }

    async checkCookiesValidity() {
        return await checkCookiesValidity(this.cookies)
    }

    async loadCookiesFromDisk(path : string) {
        this.cookies = await loadCookiesFromDisk(path)
    }

    async saveCookiesToDisk(path : string) {
        return await saveCookiesToDisk(this.cookies, path)
    }

    async uploadVideo(videoObj: VideoObj, headlessMode?: boolean, onProgress?: (a : string) => any) {
        return await uploadVideo(videoObj, this.cookies, headlessMode, onProgress)
    }
}