import promptLoginAndGetCookies from './methods/promptLoginAndGetCookies'
import checkCookiesValidity from './methods/checkCookiesValidity'
import uploadVideo, {VideoObj} from './methods/uploadVideo'
import {Cookies} from './helpers'

export default class YoutubeUploader {
    private cookies: Cookies

    async promptLoginAndGetCookies(): Promise<Cookies> {
        this.cookies = await promptLoginAndGetCookies()
        return this.cookies
    }

    async checkCookiesValidity(): Promise<boolean> {
        return checkCookiesValidity(this.cookies)
    }

    async loadCookiesFromDisk(path: string): Promise<void> {
        this.cookies = Cookies.fromJSONFileSync(path)
    }

    async saveCookiesToDisk(path: string): Promise<void> {
        return this.cookies.saveToFileSync(path)
    }

    async uploadVideo(
        videoObj: VideoObj,
        headlessMode?: boolean,
        onProgress?: (a: string) => any,
    ): Promise<void> {
        return uploadVideo(videoObj, this.cookies, headlessMode, onProgress)
    }
}
