import fs from 'fs/promises'
import {IWebDriverCookie} from 'selenium-webdriver'

export default async (path: string): Promise<IWebDriverCookie[]> => {
    // no need to check if file exists, readFile throws if it is the case
    // no need to check for file extension, readFile throws if JSON is broken
    // in case of error the messages in terminal quite informative

    const jsonBuf = await fs.readFile(path)

    return JSON.parse(jsonBuf.toString('utf-8'))
}
