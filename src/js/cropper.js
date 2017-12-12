/*

TO INIT, PASS IN CANVAS ELEMENT. THERE ARE OPTIONS FOR MINIMUM WIDTH/HEIGHT

cropper.init(document.querySelector("#canvas_wrapper canvas"), {
	minWidth: 100,
	minHeight: 100
})

=====================================


IF YOU NEED DATA WHEN ITS BEEN UPDATED

cropper.onUpdate(function (data) {
	x1 = data.x1
	x2 = data.x2
	y1 = data.y1
	y2 = data.y2
})

=====================================


BY DEFAULT ITS HIDDEN, CALL THIS TO SHOW

cropper.show()

=====================================


CALL THIS TO GET COORDS IN PX

cropper.getCoordinates()

=====================================

CALL THIS TO GET COORDS IN %

cropper.getRelativeCoordinates()

======================================

THERE ARE A FEW OPTIONS TO GET A SCREENSHOT

screenshotData(type, quality) => base64 string
screenshotImage(callback, type, quality) => img element
screenshotCanvas(type, quality) => canvas element

*/

window.imageRenderer.cropper = {
	ver: "2.0.0",
	element: null,
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

		return data
	},

	getRelativeCoordinates: function () {
		var self = window.imageRenderer.cropper
		var w = self.element.offsetWidth
		var h = self.element.offsetHeight

		return {
			x: self.data.positions.x1,
			y: self.data.positions.y1,
			width: ((w - (((self.data.positions.x1 + self.data.positions.x2) / 100) * w)) / w) * 100,
			height: ((h - (((self.data.positions.y1 + self.data.positions.y2) / 100) * h)) / h) * 100
		}
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
		ctx.canvas.width = coords.width
		ctx.canvas.height = coords.height
		ctx.drawImage(self.canvas, coords.x, coords.y, coords.width, coords.height, 0, 0, coords.width, coords.height)
		return ctx.canvas
	},

	init: function (el, options) {
		var self = window.imageRenderer.cropper
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
		self.element.append(self.container)
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

		function mouseDown(e) {
			e.preventDefault()
			e.stopPropagation()

			var _self = this
			var handleHeight = (_self.offsetHeight / self.element.offsetHeight) * 100
			var handleWidth = (_self.offsetWidth / self.element.offsetWidth) * 100
			var mode = _self.id

			self.data.mousemove = true

			function move(e) {
				if (!self.data.mousemove) { return }
				e.stopPropagation()
				e.preventDefault()

				var height = ((e.y - (handleHeight / 2)) / self.element.offsetHeight) * 100 || 0
				var width = ((e.x - (handleWidth / 2)) / self.element.offsetWidth) * 100 || 0

				function checkHeight(y1, y2) {
					if (!options || !options.minHeight) {
						return true
					}
					return self.element.offsetHeight - (((y1 + y2) / 100) * self.element.offsetHeight) > options.minHeight
				}

				function checkWidth(x1, x2) {
					if (!options || !options.minWidth) {
						return true
					}
					return self.element.offsetWidth - (((x1 + x2) / 100) * self.element.offsetWidth) > options.minWidth
				}

				if (mode === 'north-handle') {

					if (checkHeight(height, self.data.positions.y2)) {
						self.data.positions.y1 = height
						self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
					}

				} else if (mode === 'south-handle') {

					height = 100 - height

					if (checkHeight(height, self.data.positions.y1)) {
						self.data.positions.y2 = height
						self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
					}

				} else if (mode === 'east-handle') {

					width = 100 - width

					if (checkWidth(width, self.data.positions.x1)) {
						self.data.positions.x2 = width
						self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
					}

				} else if (mode === 'west-handle') {

					if (checkWidth(width, self.data.positions.x2)) {
						self.data.positions.x1 = width
						self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
					}

				} else if (mode === 'north-east-handle') {

					if (checkHeight(height, self.data.positions.y2)) {
						self.data.positions.y1 = height
						self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
					}

					width = 100 - width

					if (checkWidth(width, self.data.positions.x1)) {
						self.data.positions.x2 = width
						self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
					}

				} else if (mode === 'north-west-handle') {
					if (checkHeight(height, self.data.positions.y2)) {
						self.data.positions.y1 = height
						self.container.querySelector("#north-space").style.height = self.data.positions.y1 + "%"
					}

					if (checkWidth(width, self.data.positions.x2)) {
						self.data.positions.x1 = width
						self.container.querySelector("#west-space").style.width = self.data.positions.x1 + "%"
					}
				} else if (mode === 'south-east-handle') {
					width = 100 - width
					height = 100 - height

					if (checkHeight(height, self.data.positions.y1)) {
						self.container.querySelector("#south-space").style.height = self.data.positions.y2 + "%"
						self.data.positions.y2 = height
					}

					if (checkWidth(width, self.data.positions.x1)) {
						self.data.positions.x2 = width
						self.container.querySelector("#east-space").style.width = self.data.positions.x2 + "%"
					}
				} else if (mode === 'south-west-handle') {
					height = 100 - height

					if (checkHeight(height, self.data.positions.y1)) {
						self.data.positions.y2 = height
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
		if (self.container) {
			self.container.parentNode.removeChild(self.container)
		}
	},

	createHtml: function () {
		return '<table><tr><td></td><td style="width:10px;"></td><td id="north-space" style="height: 5%;"></td><td style="width:10px"></td><td></td></tr><tr><td style="height:10px"></td><td id="north-west-handle" style="height:10px;cursor: nwse-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: -5px;"></div></td><td id="north-handle" style="height:10px; background: transparent; cursor: ns-resize; border-top: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 50%; top: -5px; margin-left: -5px;"></div></td><td id="north-east-handle" style="height:10px;cursor: nesw-resize;border-top: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: -5px;"></div></td><td style="height:10px"></td></tr><tr><td id="west-space" style="width: 5%;"></td><td id="west-handle" style="cursor: ew-resize;border-left: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: -5px; top: 50%; margin-top: -5px;"></div></td><td id="revealed-space" style="background: transparent;"></td><td id="east-handle" style="cursor: ew-resize;border-right: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="right: -5px;top: 50%; margin-top: -5px;"></div></td><td id="east-space" style="width: 5%;"></td></tr><tr><td style="height:10px"></td><td id="south-west-handle" style="height:10px;cursor: nesw-resize; background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-left: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: -5px; top: 5px;"></div></td><td id="south-handle" style="height:10px; cursor: ns-resize; border-bottom: 1px dotted rgba(255, 255, 255, 0.25);background: transparent;"><div class="handle" style="left: 50%; top: 5px; margin-left: -5px;"></div></td><td id="south-east-handle" style="height:10px;cursor: nwse-resize;background: transparent; border-bottom: 1px dotted rgba(255, 255, 255, 0.25); border-right: 1px dotted rgba(255, 255, 255, 0.25);"><div class="handle" style="left: 5px; top: 5px;"></div></td><td style="height:10px"></td></tr><tr><td></td><td></td><td id="south-space" style="height: 5%;"></td><td></td><td></td></tr></table>'
	}
}