# Image renderer

**init(data)** - Initializes a renderer. Expects an object with the following properties:
  * **element** : Canvas DOM element (required)
  * **image** : Url string to main image (required)
  * **preview** : Url string to low res image for preload
  * **3D** : Bool if 3D
  * **360** : Bool if 360
  * **crop** : Object with cropper options. If omitted no cropper will appear

**loadImage(url, successCallback, progressCallback, errorCallback)** - Loads an image with callbacks
  * **successCallback** : On a successful load, return img element
  * **progressCallback** : On download progress, return an int 0-100 and a second param with a callback to abort the download
  * **errorCallback** : If error, return status

**subscribe(event, callback)** - Subscribe to an event. Currently there is only "statsUpdate" which will return an object of stats of the image such as pan, tilt, etc

**isFullscreen()** - Return a bool if the renderer is fullscreen

**toggleFullscreen()** - Toggles fullscreen

**cropper.init(element, options)** - Manually open the cropper tool. Pass in the canvas container element. Note it should have a position of relative. Options are minWdth:number and minHeight:number

**cropper.getCoordinates()** - Returns x, y, width, and height in pixels

**cropper.getRelativeCoordinates()** - Returns x, y, width, and height in percents

**cropper.screenshotData()** - Returns a base64 data url of the cropped area

**cropper.screenshotImage()** - Returns an img element of the cropped area

**cropper.screenshotCanvas()** - Returns a canvas element of the cropped area

**cropper.screenshotDownload()** - Downloads an image of the cropped area

**cropper.destroy()** - Destroys the cropper

**cropper.onUpdate(callback)** - Subscribe to when the cropper is updated
