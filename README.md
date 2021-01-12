# node-apiless-youtube-upload
Upload videos to Youtube in Node.js without any Youtube API dependency. With types.

##### Installation
    npm install node-apiless-youtube-upload

##### Usage
```typescript
(async () => {
    const youtubeUploader = new YoutubeUploader()

    // Open a login window for Google account. Cookies will be stored in the youtubeUploader instance
    await youtubeUploader.promptLoginAndGetCookies()
    
    // Check if cookies are valid
    if (await youtubeUploader.checkCookiesValidity()) {
        // Upload a video to youtube
        await youtubeUploader.uploadVideo({
            videoPath: 'C:/Users/gladiatortoise/Desktop/testVideo.mp4',
            title: '📡 Automatically Uploaded Video 📡',
            description: 'This is a placeholder description.',
            thumbnailPath: 'C:/Users/gladiatortoise/Desktop/TestThumbnail.jpg',
            visibility: 'unlisted',
            monetization: false
        })
    }

    // save cookies for later usage
    await youtubeUploader.saveCookiesToDisk(process.cwd() + '/cookies_saved.json')

    // later, cookies can be loaded like this so there's no need to repeatedly call promptLogin
    await youtubeUploader.loadCookiesFromDisk(process.cwd() + '/cookies_saved.json')

})()
```

##### Requirements
At least node 7.6 for async/await support. Chrome web browser.

##### Motivation
Recent changes in Youtube v3 API (2020, September) made it impossible to upload videos from unverified apps. Google does not verify apps for internal or private use. This module is intended to be an easy solution for programmatically uploading videos to Youtube.

Massive thanks to @Jaqen00 for helping with testing!
