if (!window.HTMLCanvasElement.prototype.toBlob) {
	Object.defineProperty(window.HTMLCanvasElement.prototype, 'toBlob', {
		value: function (callback, type, quality) {
			var canvas = this
			setTimeout(function () {

				var binStr = window.atob(canvas.toDataURL(type, quality).split(',')[1]),
					len = binStr.length,
					arr = new Uint8Array(len)

				for (var i = 0; i < len; i++) {
					arr[i] = binStr.charCodeAt(i)
				}

				callback(new window.Blob([arr], { type: type || 'image/png' }))
			})
		}
	})
}

window.imageRenderer.cropper = {
	ver: "2.0.0",
	element: null,
	options: {},
	data: {
		mousemove: false,
		positions: {
			y1: 5,
			y2: 5,
			x1: 5,
			x2: 5
		},
		elements: {}
	},

	onUpdateCallbacks: [],
	onUpdate: function (cb) {
		var self = window.imageRenderer.cropper
		self.onUpdateCallbacks.push(cb)
	},

	getCoordinates: function () {
		var self = window.imageRenderer.cropper
		var w = self.element.offsetWidth
		var h = self.element.offsetHeight

		var data = {
			x: (self.data.positions.x1 / 100) * w,
			y: (self.data.positions.y1 / 100) * h,
			width: w - (((self.data.positions.x1 + self.data.positions.x2) / 100) * w),
			height: h - (((self.data.positions.y1 + self.data.positions.y2) / 100) * h)
		}

		for (var p in data) {
			if (data[p]) {
				data[p] = data[p] * window.devicePixelRatio
			}
		}

		data.viewWidth = window.imageRenderer.stats.viewWidth
		data.viewHeight = window.imageRenderer.stats.viewHeight
		data.renderWidth = window.imageRenderer.stats.renderWidth
		data.renderHeight = window.imageRenderer.stats.renderHeight
		data.pan = window.imageRenderer.stats.x
		data.tilt = window.imageRenderer.stats.y
		data.zoom = window.imageRenderer.stats.z
		data.pixelRatio = window.devicePixelRatio

		return data
	},

	setOptions: function (options) {
		var self = window.imageRenderer.cropper
		if (options && typeof options === "object") {
			if (!self.options) {
				self.options = {}
			}
			for (var p in options) {
				if (options[p]) {
					self.options[p] = options[p]
				}
			}
		}
	},

	screenshotFile: function (cb, type, quality) {
		var self = window.imageRenderer.cropper

		if (!type) {
			type = "image/jpeg"
		}

		if (!quality) {
			quality = 0.92
		}

		self.screenshotCanvas().toBlob(cb, type, quality)
	},

	screenshotData: function (type, quality) {
		var self = window.imageRenderer.cropper
		if (!type) {
			type = "image/jpeg"
		}

		if (!quality) {
			quality = 0.92
		}

		return self.screenshotCanvas().toDataURL(type, quality)
	},

	screenshotImage: function (cb, type, quality) {
		var self = window.imageRenderer.cropper
		if (!type) {
			type = "image/jpeg"
		}

		if (!quality) {
			quality = 0.92
		}

		var img = new window.Image()
		img.onload = function () {
			cb(img)
		}
		img.src = self.screenshotData(type, quality)
	},

	screenshotDownload: function (type, quality) {
		var self = window.imageRenderer.cropper
		if (!type) {
			type = "image/jpeg"
		}

		if (!quality) {
			quality = 0.92
		}

		var a = window.document.createElement("a")
		a.download = true
		a.href = self.screenshotData(type, quality)
		a.click()
	},

	screenshotCanvas: function () {
		var self = window.imageRenderer.cropper
		var coords = self.getCoordinates();
		var ctx = window.document.createElement("canvas").getContext("2d")
		var w = coords.width
		var h = coords.height

		if (self.options && self.options.maxWidth && w > self.options.maxWidth) {
			h = h * (self.options.maxWidth / w)
			w = self.options.maxWidth
		}
		ctx.canvas.width = w
		ctx.canvas.height = h
		ctx.drawImage(self.canvas, coords.x, coords.y, coords.width, coords.height, 0, 0, w, h)
		return ctx.canvas
	},

	/* TODO THIS IS TERRIBLY COMPLICATED AND HARD TO READ, NEEDS REFACTOR */
	setPositions: function (x, y, mode, justBoundaries) {
		var self = window.imageRenderer.cropper
		var handleHeight = (window.document.getElementById('north-handle').offsetHeight / self.element.offsetHeight) * 100
		var handleWidth = (window.document.getElementById('west-handle').offsetWidth / self.element.offsetWidth) * 100

		var currentCoords = self.getCoordinates();
		var height = (((y - (handleHeight / 2)) - self.element.getBoundingClientRect().top) / self.element.offsetHeight) * 100 || 1
		var width = ((x - (handleWidth / 2) - self.element.getBoundingClientRect().left) / self.element.offsetWidth) * 100 || 1

		function checkHeight(y1, y2) {
			if (y1 < 1 || y2 < 1) {
				return false
			}

			if (!self.options || !self.options.minHeight) {
				return true
			}
			return self.element.offsetHeight - (((y1 + y2) / 100) * self.element.offsetHeight) > self.options.minHeight
		}

		function checkWidth(x1, x2) {
			if (x1 < 1 || x2 < 1) {
				return false
			}

			if (!self.options || !self.options.minWidth) {
				return true
			}
			return self.element.offsetWidth - (((x1 + x2) / 100) * self.element.offsetWidth) > self.options.minWidth
		}

		function checkNorth(_height) {
			var _y = (((_height * currentCoords.pixelRatio) / 100) * self.element.offsetHeight)
			var max = ((currentCoords.tilt / self.element.offsetHeight) * 100) / currentCoords.pixelRatio

			if (!max || isNaN(max) || max < 1) {
				max = 1
			}

			return { pass: currentCoords.tilt < _y, max: max }
		}

		function checkSouth(_height) {
			var _y = (self.element.offsetHeight * currentCoords.pixelRatio) - ((((_height * currentCoords.pixelRatio) / 100) * self.element.offsetHeight) + currentCoords.tilt)
			var max = (((self.element.offsetHeight * currentCoords.pixelRatio) - (currentCoords.renderHeight + currentCoords.tilt)) / (self.element.offsetHeight * currentCoords.pixelRatio)) * 100

			if (!max || isNaN(max) || max < 1) {
				max = 1
			}

			return { pass: _y < currentCoords.renderHeight, max: max }
		}

		function checkEast(_width) {
			var _x = (self.element.offsetWidth * currentCoords.pixelRatio) - ((((_width * currentCoords.pixelRatio) / 100) * self.element.offsetWidth) + currentCoords.pan)
			var max = (((self.element.offsetWidth * currentCoords.pixelRatio) - (currentCoords.renderWidth + currentCoords.pan)) / (self.element.offsetWidth * currentCoords.pixelRatio)) * 100

			if (!max || isNaN(max) || max < 1) {
				max = 1
			}

			return { pass: currentCoords.renderWidth > _x, max: max }
		}

		function checkWest(_width) {
			var _x = (((_width * currentCoords.pixelRatio) / 100) * self.element.offsetWidth)
			var max = ((currentCoords.pan / self.element.offsetWidth) * 100) / currentCoords.pixelRatio

			if (!max || isNaN(max) || max < 1) {
				max = 1
			}

			return { pass: currentCoords.pan < _x, max: max }
		}

		if (mode === 'north-handle') {

			if (checkNorth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y2)) {
					self.data.positions.y1 = height
					self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
				}
			} else {
				// self.data.positions.y1 = checkNorth(height).max
				// self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
			}

		} else if (mode === 'south-handle') {

			height = 100 - height

			if (checkSouth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y1)) {
					self.data.positions.y2 = height
					self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
				}
			} else {
				self.data.positions.y2 = checkSouth(height).max
				self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
			}

		} else if (mode === 'east-handle') {

			width = 100 - width

			if (checkEast(width).pass) {
				if (!justBoundaries && checkWidth(width, self.data.positions.x1)) {
					self.data.positions.x2 = width
					self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
				}
			} else {
				self.data.positions.x2 = checkEast(width).max
				self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
			}

		} else if (mode === 'west-handle') {

			if (checkWest(width).pass) {
				if (!justBoundaries && checkWidth(width, self.data.positions.x2)) {
					self.data.positions.x1 = width
					self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
				}
			} else {
				self.data.positions.x1 = checkWest(width).max
				self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
			}


		} else if (mode === 'north-east-handle') {

			if (checkNorth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y2)) {
					self.data.positions.y1 = height
					self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
				}
			} else {
				self.data.positions.y1 = checkNorth(height).max
				self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
			}

			width = 100 - width

			if (checkEast(width).pass) {
				if (!justBoundaries && checkWidth(width, self.data.positions.x1)) {
					self.data.positions.x2 = width
					self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
				}
			} else {
				self.data.positions.x2 = checkEast(width).max
				self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
			}

		} else if (mode === 'north-west-handle') {
			if (checkNorth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y2)) {
					self.data.positions.y1 = height
					self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
				}
			} else {
				self.data.positions.y1 = checkNorth(height).max
				self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
			}

			if (checkWest(width).pass) {
				if (!justBoundaries && checkWidth(width, self.data.positions.x2)) {
					self.data.positions.x1 = width
					self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
				}
			} else {
				self.data.positions.x1 = checkWest(width).max
				self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
			}
		} else if (mode === 'south-east-handle') {
			width = 100 - width
			height = 100 - height

			if (checkSouth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y1)) {
					self.data.positions.y2 = height
					self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
				}
			} else {
				self.data.positions.y2 = checkSouth(height).max
				self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
			}

			if (checkEast(width).pass) {
				if (!justBoundaries && checkWidth(width, self.data.positions.x1)) {
					self.data.positions.x2 = width
					self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
				}
			} else {
				self.data.positions.x2 = checkEast(width).max
				self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
			}
		} else if (mode === 'south-west-handle') {
			height = 100 - height

			if (checkSouth(height).pass) {
				if (!justBoundaries && checkHeight(height, self.data.positions.y1)) {
					self.data.positions.y2 = height
					self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
				}
			} else {
				self.data.positions.y2 = checkSouth(height).max
				self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
			}

			if (checkWidth(width, self.data.positions.x2)) {
				self.data.positions.x1 = width
				self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
			}
		}

		self.onUpdateCallbacks.forEach(function (cb) {
			cb(self.getCoordinates())
		})
	},

	init: function (el, options) {
		var self = window.imageRenderer.cropper
		self.options = options
		self.container = window.document.getElementById("crop-positioner")
		if (self.container) {
			self.container.parentNode.removeChild(self.container)
		}
		self.container = window.document.createElement("div")
		self.container.id = "crop-positioner"
		self.container.innerHTML = self.createHtml()
		self.onUpdateCallbacks = []
		self.element = el
		self.canvas = el.querySelector("canvas")
		self.element.appendChild(self.container)
		self.data.elements = {
			north: self.container.querySelector("#north-handle"),
			south: self.container.querySelector("#south-handle"),
			east: self.container.querySelector("#east-handle"),
			west: self.container.querySelector("#west-handle"),
			northeast: self.container.querySelector("#north-east-handle"),
			northwest: self.container.querySelector("#north-west-handle"),
			southeast: self.container.querySelector("#south-east-handle"),
			southwest: self.container.querySelector("#south-west-handle")
		}

		function checkBounds() {
			var stats = window.imageRenderer.stats

			if (stats.ready) {
				self.setPositions(
					self.container.offsetWidth * (self.data.positions.x1 / 100) + self.container.getBoundingClientRect().left,
					self.container.offsetHeight * (self.data.positions.y1 / 100) + self.container.getBoundingClientRect().top,
					"north-west-handle",
					true
				)

				self.setPositions(
					self.container.offsetWidth - (self.container.offsetWidth * (self.data.positions.x2 / 100)) + self.container.getBoundingClientRect().left,
					(self.container.offsetHeight - (self.container.offsetHeight * (self.data.positions.y2 / 100))) + self.container.getBoundingClientRect().top,
					"south-east-handle",
					true
				)
			}

			window.requestAnimationFrame(checkBounds)
		}

		checkBounds()

		function mouseDown(e) {
			e.preventDefault()
			e.stopPropagation()

			var _self = this
			var mode = _self.id

			self.data.mousemove = true

			function move(e) {
				if (!self.data.mousemove) { return }
				e.stopPropagation()
				e.preventDefault()
				console.log(e.x);
				self.setPositions(e.x, e.y, mode)
			}

			function clear() {
				self.data.mousemove = false
				window.document.removeEventListener('mousemove', move, false)
				window.document.removeEventListener('mouseup', clear, false)
				window.document.body.removeEventListener('mouseleave', clear, false)
			}

			window.document.addEventListener('mousemove', move, false)
			window.document.addEventListener('mouseup', clear, false)
			window.document.body.addEventListener('mouseleave', clear, false)
		}

		for (var handle in self.data.elements) {
			if (self.data.elements[handle]) {
				self.data.elements[handle].addEventListener("mousedown", mouseDown, false)
			}
		}

		self.sizeWatcher = window.requestAnimationFrame(self.position)

		self.getCoordinates()

		window.document.getElementById("revealed-space").addEventListener("mousedown", function () {
			function mousemove(e) {
				e.preventDefault();
				e.stopPropagation();

				var grabX = e.x - this.offsetLeft
				console.log(e.x - (e.target.offsetWidth / 2));
				self.setPositions(
					e.x - (this.offsetWidth / 2),
					e.y - (this.offsetHeight / 2),
					"west-handle"
				)

				// self.setPositions(
				// 	e.x + (this.offsetWidth / 2),
				// 	e.y + (this.offsetHeight / 2),
				// 	"south-east-handle",
				// 	true
				// )
			}

			window.addEventListener("mousemove", mousemove, false)
			window.addEventListener("mouseup", function () {
				window.removeEventListener("mousemove", mousemove, false)
			}, false)

		}, false)
	},

	position: function () {
		var self = window.imageRenderer.cropper

		if (!self.container) {
			return;
		}

		self.container.style.width = self.element.offsetWidth + "px"
		self.container.style.height = self.element.offsetHeight + "px"
		self.sizeWatcher = window.requestAnimationFrame(self.position)
	},

	destroy: function () {
		var self = window.imageRenderer.cropper
		if (self.container && self.container.parentNode) {
			self.container.parentNode.removeChild(self.container)
		}
	},

	createHtml: function () {
		return '<table><tr><td></td><td style="width:10px;"></td><td id="north-space" style="height: 25%;"></td><td style="width:10px"></td><td></td></tr><tr><td style="height:10px"></td><td id="north-west-handle" style="height:10px;cursor: nwse-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: -5px;"></div></td><td id="north-handle" style="height:10px; background: transparent; cursor: ns-resize; border-top: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 50%; top: -5px; margin-left: -5px;"></div></td><td id="north-east-handle" style="height:10px;cursor: nesw-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: -5px;"></div></td><td style="height:10px"></td></tr><tr><td id="west-space" style="width: 25%;"></td><td id="west-handle" style="cursor: ew-resize;border-left: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: -5px; top: 50%; margin-top: -5px;"></div></td><td id="revealed-space" style="background: transparent;"></td><td id="east-handle" style="cursor: ew-resize;border-right: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="right: -5px;top: 50%; margin-top: -5px;"></div></td><td id="east-space" style="width: 25%;"></td></tr><tr><td style="height:10px"></td><td id="south-west-handle" style="height:10px;cursor: nesw-resize; background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: 5px;"></div></td><td id="south-handle" style="height:10px; cursor: ns-resize; border-bottom: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: 50%; top: 5px; margin-left: -5px;"></div></td><td id="south-east-handle" style="height:10px;cursor: nwse-resize;background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: 5px;"></div></td><td style="height:10px"></td></tr><tr><td></td><td></td><td id="south-space" style="height: 25%;"></td><td></td><td></td></tr></table>'
	}
}