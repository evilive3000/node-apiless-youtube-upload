import fs from 'fs-extra'
import { IWebDriverCookie } from 'selenium-webdriver'

export default async (cookies : IWebDriverCookie[], path : string) : Promise<undefined>  => {
    await fs.writeJSON(path, cookies)
    return undefined
}