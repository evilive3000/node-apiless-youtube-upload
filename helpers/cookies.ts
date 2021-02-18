import {IWebDriverCookie} from 'selenium-webdriver'
import fs from 'fs'

export class Cookies {
    private readonly items: IWebDriverCookie[]

    constructor(cookies: IWebDriverCookie[] = []) {
        this.items = cookies
    }

    toString(): string {
        return JSON.stringify(this.items)
    }

    saveToFileSync(path: string): void {
        return fs.writeFileSync(path, JSON.stringify(this.items))
    }

    static fromJSONString(jsonString: string): Cookies {
        return new Cookies(JSON.parse(jsonString))
    }

    static fromJSONFileSync(jsonFilePath: string): Cookies {
        const jsonBuf = fs.readFileSync(jsonFilePath)

        return Cookies.fromJSONString(jsonBuf.toString('utf-8'))
    }

    *[Symbol.iterator]() {
        for (const item of this.items) yield item
    }

    get length(): number {
        return this.items.length
    }
}
