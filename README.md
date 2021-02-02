# node-apiless-youtube-upload
Upload videos to Youtube in node.js, ts-node or electron, and on windows or linux without any Youtube API dependency! Chromedriver required by Selenium will be automatically downloaded during runtime (using [node-chromedriver-downloader](https://github.com/gladiatortoise/node-chromedriver-downloader)). Note: headless login is out of scope for this module, because it's difficult to maintain.

##### Installation
    npm install node-apiless-youtube-upload

##### Usage

###### ES6 Simple
```typescript
import {promptLoginAndGetCookies, uploadVideo} from 'node-apiless-youtube-upload'

promptLoginAndGetCookies().then(cookies => {
    uploadVideo({
        videoPath: 'C:/Users/gladiatortoise/Desktop/testVideo.mp4',
        title: '📡 Automatically Uploaded Video 📡',
        description: 'This is a placeholder description.',
        thumbnailPath: 'C:/Users/gladiatortoise/Desktop/TestThumbnail.jpg',
        visibility: 'unlisted',
        monetization: false
    }, cookies)
})
```

###### ES6 With Saving Cookies
```typescript
import YoutubeUploader from 'node-apiless-youtube-upload'

(async () => {
    const youtubeUploader = new YoutubeUploader()
    const cookiesPath = process.cwd() + '/cookies_saved.json'

    // Try loading cookies from disk
    try {
        await youtubeUploader.loadCookiesFromDisk(cookiesPath)

        if (!(await youtubeUploader.checkCookiesValidity())) {
            throw new Error('Cookies loaded from disk are not valid')
        }
    } catch(e) {
        console.log('Prompting Google login..')

        // Open a login window for Google account. Cookies will be stored in the youtubeUploader instance
        await youtubeUploader.promptLoginAndGetCookies()

        // Save cookies
        await youtubeUploader.saveCookiesToDisk(cookiesPath)
    }
    
    // Upload a video to youtube
    await youtubeUploader.uploadVideo({
        videoPath: 'C:/Users/gladiatortoise/Desktop/testVideo.mp4',
        title: '📡 Automatically Uploaded Video 📡',
        description: 'This is a placeholder description.',
        thumbnailPath: 'C:/Users/gladiatortoise/Desktop/TestThumbnail.jpg',
        visibility: 'unlisted',
        monetization: false
    })
})()
```

###### CommonJS Simple
```typescript
const {promptLoginAndGetCookies, uploadVideo} = require('node-apiless-youtube-upload')

promptLoginAndGetCookies().then(cookies => {
    uploadVideo({
        videoPath: 'C:/Users/gladiatortoise/Desktop/testVideo.mp4',
        title: '📡 Automatically Uploaded Video 📡',
        description: 'This is a placeholder description.',
        thumbnailPath: 'C:/Users/gladiatortoise/Desktop/TestThumbnail.jpg',
        visibility: 'unlisted',
        monetization: false
    }, cookies)
})
```

##### Requirements
At least node 7.6 for async/await support and a Chrome web browser. Unfortunately MacOs is not (yet) supported

##### Motivation
Recent changes in Youtube v3 API (2020, September) made it impossible to upload videos from unverified apps. Google does not verify apps for internal or private use. This module is intended to be an easy solution for programmatically uploading videos to Youtube.

Massive thanks to @Jaqen00 for helping with testing!
