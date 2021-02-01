import fs from 'fs-extra'
import {IWebDriverCookie} from 'selenium-webdriver'

export default async (path: string): Promise<IWebDriverCookie[]> => {
    // no need to check if file exists, readJSON throws if it is the case
    // no need to check for file extension, readJSON throws if JSON is broken
    // in case of error the messages in terminal quite informative

    return fs.readJSON(path)
}
