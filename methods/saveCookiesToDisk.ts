import fs from 'fs/promises'
import {IWebDriverCookie} from 'selenium-webdriver'

export default async (cookies: IWebDriverCookie[], path: string): Promise<void> => {
    return fs.writeFile(path, JSON.stringify(cookies))
}
