import promptLoginAndGetCookies from './methods/promptLoginAndGetCookies'
import checkCookiesValidity from './methods/checkCookiesValidity'
import uploadVideo, {VideoObj} from './methods/uploadVideo'
import saveCookiesToDisk from './methods/saveCookiesToDisk'
import loadCookiesFromDisk from './methods/loadCookiesFromDisk'
import {IWebDriverCookie} from 'selenium-webdriver'

export default class YoutubeUploader {
    private cookies: IWebDriverCookie[]

    async promptLoginAndGetCookies(): Promise<IWebDriverCookie[]> {
        this.cookies = await promptLoginAndGetCookies()
        return this.cookies
    }

    async checkCookiesValidity(): Promise<boolean> {
        return checkCookiesValidity(this.cookies)
    }

    async loadCookiesFromDisk(path: string): Promise<void> {
        this.cookies = await loadCookiesFromDisk(path)
    }

    async saveCookiesToDisk(path: string): Promise<void> {
        return saveCookiesToDisk(this.cookies, path)
    }

    async uploadVideo(videoObj: VideoObj, headlessMode?: boolean, onProgress?: (a: string) => any): Promise<void> {
        return uploadVideo(videoObj, this.cookies, headlessMode, onProgress)
    }
}
