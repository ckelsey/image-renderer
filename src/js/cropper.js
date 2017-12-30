window.imageRenderer.cropper = {
	ver: "2.0.0",
	element: null,
	options: {
		minHeight: 400,
		minWidth: 600
	}, //minWidth, minHeight, circle, maxWidth
	data: {
		mousemove: false,
		positions: {
			y1: 0,
			y2: 0,
			x1: 0,
			x2: 0
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

		var data = {
			x: self.data.positions.x1,
			y: self.data.positions.x2,
			width: self.data.positions.x2 - self.data.positions.x1,
			height: self.data.positions.y2 - self.data.positions.y1
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

	setPositions: function (x1, x2, y1, y2) {
		var self = window.imageRenderer.cropper

		function checkPositions() {
			if (x1 < 5) {
				x1 = 5
			}

			if (x2 > self.container.offsetWidth - 5) {
				x2 = self.container.offsetWidth - 5
			}

			if (y1 < 5) {
				y1 = 5
			}

			if (y2 > self.container.offsetHeight - 5) {
				y2 = self.container.offsetHeight - 5
			}
		}

		checkPositions()

		if (self.options.minWidth && x2 - x1 < self.options.minWidth) {
			x2 = x1 + self.options.minWidth

			if (x2 > self.container.offsetWidth - 5) {
				x2 = self.container.offsetWidth - 5
				x1 = x2 - self.options.minWidth
			}
		}

		if (self.options.minHeight && y2 - y1 < self.options.minHeight) {
			y2 = y1 + self.options.minHeight

			if (y2 > self.container.offsetHeight - 5) {
				y2 = self.container.offsetHeight - 5
				y1 = y2 - self.options.minHeight
			}
		}

		checkPositions()

		self.data.positions.x1 = x1
		self.data.positions.x2 = x2
		self.data.positions.y1 = y1
		self.data.positions.y2 = y2

		self.container.querySelector("#north-space").style.height = ((self.data.positions.y1 / self.container.offsetHeight) * 100) + "%"
		self.container.querySelector("#south-space").style.height = (((self.container.offsetHeight - self.data.positions.y2) / self.container.offsetHeight) * 100) + "%"
		self.container.querySelector("#west-space").style.width = ((self.data.positions.x1 / self.container.offsetWidth) * 100) + "%"
		self.container.querySelector("#east-space").style.width = (((self.container.offsetWidth - self.data.positions.x2) / self.container.offsetWidth) * 100) + "%"

		self.onUpdateCallbacks.forEach(function (cb) {
			cb(self.getCoordinates())
		})
	},

	init: function (el, options) {
		var self = window.imageRenderer.cropper
		self.options = options || {}
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

		if (self.options.minWidth && self.element) {
			self.element.style.minWidth = self.options.minWidth + "px"
		}

		if (self.options.minHeight && self.element) {
			self.element.style.minHeight = self.options.minHeight + "px"
		}

		function initCropper() {
			var stats = window.imageRenderer.stats
			var currentCoords = self.getCoordinates();


			if (stats.ready) {
				var percentageX = self.options.minWidth ? ((currentCoords.renderWidth / currentCoords.pixelRatio) - self.options.minWidth) / 2 : (currentCoords.renderWidth * 0.1) / currentCoords.pixelRatio
				var percentageY = self.options.minHeight ? ((currentCoords.renderHeight / currentCoords.pixelRatio) - self.options.minHeight) / 2 : (currentCoords.renderHeight * 0.1) / currentCoords.pixelRatio

				self.setPositions(
					percentageX,
					((currentCoords.renderWidth / currentCoords.pixelRatio) - percentageX) + ((currentCoords.viewWidth - currentCoords.renderWidth) / currentCoords.pixelRatio),
					percentageY,
					((currentCoords.renderHeight / currentCoords.pixelRatio) - percentageY) + ((currentCoords.viewHeight - currentCoords.renderHeight) / currentCoords.pixelRatio)
				)

				self.resize()
			} else {
				window.requestAnimationFrame(initCropper)
			}
		}

		initCropper()

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
				var box = self.container.getBoundingClientRect(),
					x1 = self.data.positions.x1,
					x2 = self.data.positions.x2,
					y1 = self.data.positions.y1,
					y2 = self.data.positions.y2

				if (mode.toString().indexOf("north") > -1 || mode.toString().indexOf("south") > -1) {
					if (mode.toString().indexOf("north") > -1) {
						y1 = e.y - box.top
					} else {
						y2 = e.y - box.top
					}
				}

				if (mode.toString().indexOf("west") > -1 || mode.toString().indexOf("east") > -1) {
					if (mode.toString().indexOf("west") > -1) {
						x1 = e.x - box.left
					} else {
						x2 = e.x - box.left
					}
				}

				self.setPositions(x1, x2, y1, y2)
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

		var revealedSpace = window.document.getElementById("revealed-space")

		function moveRevealedSpace(e) {
			e.preventDefault();
			e.stopPropagation();

			var box = self.container.getBoundingClientRect()
			var distanceX1 = e.x - self.data.elements.west.getBoundingClientRect().left + (self.data.elements.west.offsetWidth / 2.2)
			var distanceX2 = (self.data.elements.east.getBoundingClientRect().left + (self.data.elements.east.offsetWidth / 2.2)) - e.x
			var distanceY1 = e.y - self.data.elements.north.getBoundingClientRect().top + (self.data.elements.north.offsetHeight / 2.2)
			var distanceY2 = (self.data.elements.south.getBoundingClientRect().top + (self.data.elements.south.offsetHeight / 2.2)) - e.y

			function mousemove(e) {
				e.preventDefault();
				e.stopPropagation();

				self.setPositions(
					(e.x - box.left) + (self.data.elements.west.offsetWidth / 2.2) - distanceX1,
					(e.x - box.left) + (self.data.elements.east.offsetWidth / 2.2) + distanceX2,
					(e.y - box.top) + (self.data.elements.north.offsetHeight / 2.2) - distanceY1,
					(e.y - box.top) + (self.data.elements.south.offsetHeight / 2.2) + distanceY2
				)
			}

			window.addEventListener("mousemove", mousemove, false)
			window.addEventListener("mouseup", function () {
				window.removeEventListener("mousemove", mousemove, false)
			}, true)
		}

		revealedSpace.addEventListener("mousedown", moveRevealedSpace, true)

		window.addEventListener("resize", self.resize, false)
	},

	resize: function () {
		var self = window.imageRenderer.cropper
		self.setPositions(self.data.positions.x1, self.data.positions.x2, self.data.positions.y1, self.data.positions.y2)
	},

	position: function () {
		var self = window.imageRenderer.cropper

		if (!self.container || !self.element) {
			return;
		}

		var currentCoords = self.getCoordinates();

		self.container.style.width = (currentCoords.renderWidth / currentCoords.pixelRatio) + "px"
		self.container.style.height = (currentCoords.renderHeight / currentCoords.pixelRatio) + "px"
		self.container.style.left = (((currentCoords.viewWidth - currentCoords.renderWidth) / 2) / currentCoords.pixelRatio) + "px"
		self.container.style.top = (((currentCoords.viewHeight - currentCoords.renderHeight) / 2) / currentCoords.pixelRatio) + "px"
		self.sizeWatcher = window.requestAnimationFrame(self.position)
	},

	destroy: function () {
		var self = window.imageRenderer.cropper
		window.addEventListener("resize", self.resize, false)
		if (self.container && self.container.parentNode) {
			self.container.parentNode.removeChild(self.container)
		}
	},

	createHtml: function () {
		return '<table><tr><td></td><td style="width:10px;"></td><td id="north-space" style="height: 25%;"></td><td style="width:10px"></td><td></td></tr><tr><td style="height:10px"></td><td id="north-west-handle" style="height:10px;cursor: nwse-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: -5px;"></div></td><td id="north-handle" style="height:10px; background: transparent; cursor: ns-resize; border-top: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 50%; top: -5px; margin-left: -5px;"></div></td><td id="north-east-handle" style="height:10px;cursor: nesw-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: -5px;"></div></td><td style="height:10px"></td></tr><tr><td id="west-space" style="width: 25%;"></td><td id="west-handle" style="cursor: ew-resize;border-left: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: -5px; top: 50%; margin-top: -5px;"></div></td><td id="revealed-space" style="background: transparent;"></td><td id="east-handle" style="cursor: ew-resize;border-right: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="right: -5px;top: 50%; margin-top: -5px;"></div></td><td id="east-space" style="width: 25%;"></td></tr><tr><td style="height:10px"></td><td id="south-west-handle" style="height:10px;cursor: nesw-resize; background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: 5px;"></div></td><td id="south-handle" style="height:10px; cursor: ns-resize; border-bottom: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: 50%; top: 5px; margin-left: -5px;"></div></td><td id="south-east-handle" style="height:10px;cursor: nwse-resize;background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: 5px;"></div></td><td style="height:10px"></td></tr><tr><td></td><td></td><td id="south-space" style="height: 25%;"></td><td></td><td></td></tr></table>'
	}
}