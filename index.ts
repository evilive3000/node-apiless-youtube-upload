import promptLoginAndGetCookies from './methods/promptLoginAndGetCookies'
import checkCookiesValidity from './methods/checkCookiesValidity'
import uploadVideo, {VideoObj} from './methods/uploadVideo'
import saveCookiesToDisk from './methods/saveCookiesToDisk'
import loadCookiesFromDisk from './methods/loadCookiesFromDisk'
import YoutubeUploader from './YoutubeUploader'

export default YoutubeUploader
export {
    promptLoginAndGetCookies,
    checkCookiesValidity,
    uploadVideo,
    VideoObj,
    saveCookiesToDisk,
    loadCookiesFromDisk,
}
