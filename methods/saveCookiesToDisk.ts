import fs from 'fs-extra'
import {IWebDriverCookie} from 'selenium-webdriver'

export default async (cookies: IWebDriverCookie[], path: string): Promise<void> => {
    return fs.writeJSON(path, cookies)
}
