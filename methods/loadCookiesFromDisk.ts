import fs from 'fs-extra'
import { IWebDriverCookie } from 'selenium-webdriver'

export default async (path : string) : Promise<IWebDriverCookie[]> => {
    if (!path.match(/\.json$/)) throw new Error("Tried to load cookies from file but it's not JSON format")
    if (!fs.existsSync(path)) throw new Error("Tried to load cookies from path that doesn't exist") 

    let json = await fs.readJSON(path)
    if (!json.length) throw new Error("Tried to load cookies but the file doesn't have data")

    return json
}