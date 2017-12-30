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

window.imageRenderer = {
	data: null,
	stats: {},
	subscriptions: {},

	resetStats: function () {
		window.imageRenderer.stats = {
			x: 0,
			y: 0,
			z: 0,
			viewWidth: 0,
			viewHeight: 0,
			renderWidth: 0,
			renderHeight: 0,
			previewProgress: 0,
			imageProgress: 0,
			status: "initializing"
		};
	},

	subscribe: function (event, callback) {
		if (!window.imageRenderer.subscriptions[event]) {
			window.imageRenderer.subscriptions[event] = [];
		}

		window.imageRenderer.subscriptions[event].push(callback);
	},

	trigger: function (event, data) {
		var self = window.imageRenderer;

		if (!self.subscriptions[event]) {
			return;
		}

		for (var i = 0; i < self.subscriptions[event].length; i++) {
			self.subscriptions[event][i](data);
		}
	},

	passToMethod: function (data, method) {
		window.imageRenderer.methods[method](data);
	},

	loadImage: function (url, endCB, progressCB, errorCB) {

		function checkLoaded(_img) {

			if (_img.width) {
				endCB(_img);
			} else {
				(function (i) {
					setTimeout(function () {
						checkLoaded(i)
					}, 100)
				})(_img)
			}
		}

		var xmlHTTP = new window.XMLHttpRequest();
		xmlHTTP.open("GET", url, true);
		xmlHTTP.responseType = "arraybuffer";
		xmlHTTP.onload = function (e) {

			if (e.target.status === 200 && e.target.response.byteLength) {
				var blob = new window.Blob([e.target.response]);
				var uri = window.URL.createObjectURL(blob);
				var img = new window.Image();

				img.onload = function (e) {
					checkLoaded(e.target)
				};

				img.src = uri;
			} else if (errorCB) {
				errorCB(e.target.status);
			}
		};
		xmlHTTP.onerror = function (e) {
			if (errorCB) { errorCB(e.target.status); }
		};

		xmlHTTP.onprogress = function (e) {
			if (progressCB) {
				progressCB(parseInt((e.loaded / e.total) * 100), function () {
					xmlHTTP.abort();
				});
			}
		};

		xmlHTTP.send();
	},

	updateZoomHandle: function (invert) {
		var zoomRangeHandle = window.document.querySelector(".zoom-range-handle")

		if (!zoomRangeHandle) {
			return
		}

		var self = window.imageRenderer
		var percent = (self.stats.z - self.stats.minZoom) / (self.stats.maxZoom - self.stats.minZoom)
		zoomRangeHandle.style.bottom = (invert ? 100 - (percent * 100) : percent * 100) + "%"
	},

	initImages: function (mainCB, prevCB, errCB) {
		var self = window.imageRenderer
		var progressBar = window.document.createElement("div");
		progressBar.classList.add("renderer-progressbar");
		self.data.element.appendChild(progressBar);

		function loadMain() {
			self.loadImage(self.data.image,
				function (mainimg) {
					progressBar.style.opacity = 0;

					setTimeout(function () {
						var _p = window.document.querySelectorAll(".renderer-progressbar")
						if (_p) {
							for (var p = 0; p < _p.length; p++) {
								self.data.element.removeChild(_p[p]);
							}
						}
					}, 600);

					mainCB(mainimg)
				},
				function (prog) {
					window.imageRenderer.stats.previewProgress = prog
					progressBar.style.width = prog + "%"
					self.trigger("statsUpdate", self.stats)
				},
				function (err) {
					progressBar.style.opacity = 0;

					setTimeout(function () {
						var _p = window.document.querySelectorAll(".renderer-progressbar")
						if (_p) {
							for (var p = 0; p < _p.length; p++) {
								self.data.element.removeChild(_p[p]);
							}
						}
					}, 600);

					if (errCB) {
						errCB(err)
					}
				}
			);
		}

		function loadPreview() {
			self.loadImage(self.data.preview, function (previmg) {
				prevCB(previmg)
				window.imageRenderer.stats.previewProgress = 100
				loadMain()
			}, function (prog) {
				window.imageRenderer.stats.previewProgress = prog
				progressBar.style.width = prog + "%"
				self.trigger("statsUpdate", self.stats)
			}, function () {
				loadMain()
			});
		}

		if (self.data.preview) {
			loadPreview();
		} else {
			loadMain();
		}
	},

	createControls: function (options) {
		var self = window.imageRenderer

		function exitHandler() {
			if (options.onExitFullscreen) {
				options.onExitFullscreen()
			}

			window.imageRenderer.data.element.classList.remove("fullscreen");
		}

		var isMobile = window.hasOwnProperty('ontouchstart')
		var buttonWrapper = self.data.element.querySelectorAll(".buttonWrapper")

		if (buttonWrapper && buttonWrapper.length) {
			for (var b = 0; b < buttonWrapper.length; b++) {
				buttonWrapper[b].parentNode.removeChild(buttonWrapper[b])
			}
		}

		buttonWrapper = window.document.createElement("div");
		buttonWrapper.classList.add("buttonWrapper")
		self.data.element.appendChild(buttonWrapper);

		var vr = options.vr
		var fullscreen = options.fullscreen
		var zoom = options.zoom

		function zoomMouseDown(e) {
			e.preventDefault()
			e.stopPropagation()

			var isDragging = true
			var y = 0;
			var lastY = e.clientY;

			function mouseMove(e) {
				e.preventDefault()
				e.stopPropagation()

				if (isDragging === true) {
					y = -(e.clientY - lastY);
					zoom(y / 20)
					lastY = e.clientY
				}

			}

			function mouseUp() {
				window.document.removeEventListener("mousemove", mouseMove, false);
				window.document.removeEventListener("mouseup", mouseUp, false);
			}

			window.document.addEventListener("mousemove", mouseMove, false);
			window.document.addEventListener("mouseup", mouseUp, false);
		}

		if (vr) {
			var vrButton = window.document.createElement("button");
			vrButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 86" viewBox="0 0 196.33 123.31"><path d="M194.33 14a12 12 0 0 0-12-12s-63.12-2-84.17-2-84.17 2-84.17 2a12 12 0 0 0-12 12S0 57.73 0 70.33c0 11.76 2 41 2 41a12 12 0 0 0 12 12h56.33s15.31-41.21 27.67-41c12.09.21 25.67 41 25.67 41h58.67a12 12 0 0 0 12-12s2-36.48 2-48.65S194.33 14 194.33 14zM46.67 86.66A28.33 28.33 0 1 1 75 58.33a28.33 28.33 0 0 1-28.33 28.33zm102 0A28.33 28.33 0 1 1 177 58.33a28.33 28.33 0 0 1-28.33 28.33z"/></svg>';
			vrButton.addEventListener('click', vr, false);
			buttonWrapper.appendChild(vrButton);
		}

		if (fullscreen) {
			window.document.removeEventListener('webkitfullscreenchange', exitHandler, false);
			window.document.removeEventListener('mozfullscreenchange', exitHandler, false);
			window.document.removeEventListener('fullscreenchange', exitHandler, false);
			window.document.removeEventListener('MSFullscreenChange', exitHandler, false);

			var fullscreenButton = window.document.createElement("button");
			fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 59" viewBox="0 0 193.57 193.57"><path d="M69.2.04q.06 13.21.12 26.43c0 1.05-.49 1.49-1.48 1.5H30.66c-2.59 0-2.64 0-2.64 2.64v35.88c0 2.8 0 2.81-2.84 2.8L.04 69.16V1.6C.04.24.32-.04 1.68-.04Q35.42.08 69.2.04zM193.54 69.16q-13.21.06-26.43.12c-1.05 0-1.49-.49-1.5-1.48v-1.89V30.6c0-2.59 0-2.64-2.64-2.64h-35.91c-2.8 0-2.81 0-2.8-2.84q0-12.55.12-25.11h67.65c1.29 0 1.55.25 1.55 1.55q-.08 33.81-.04 67.6zM.04 124.38q13.21-.06 26.43-.12c1.05 0 1.49.49 1.5 1.48v37.2c0 2.59 0 2.64 2.64 2.64h35.91c2.8 0 2.81 0 2.8 2.84q0 12.55-.12 25.11H1.55c-1.29 0-1.55-.25-1.55-1.55q.08-33.82.04-67.6zM124.38 193.54q-.06-13.21-.12-26.43c0-1.05.49-1.49 1.48-1.5h37.2c2.59 0 2.64 0 2.64-2.64v-35.88c0-2.8 0-2.81 2.84-2.8l25.11.12v67.65c0 1.29-.25 1.55-1.55 1.55q-33.78-.11-67.6-.07z"></path></svg>';
			fullscreenButton.addEventListener('click', fullscreen, false);
			buttonWrapper.appendChild(fullscreenButton);

			window.document.addEventListener('webkitfullscreenchange', exitHandler, false);
			window.document.addEventListener('mozfullscreenchange', exitHandler, false);
			window.document.addEventListener('fullscreenchange', exitHandler, false);
			window.document.addEventListener('MSFullscreenChange', exitHandler, false);
		}

		if (zoom) {
			var zoomControlsWrapper = window.document.createElement("div")
			zoomControlsWrapper.className = isMobile ? "zoom-controls mobile" : "zoom-controls"

			var zoomPlus = window.document.createElement("button")
			zoomPlus.className = "zoom-plus"
			zoomPlus.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35"><path d="M0,0V35H35V0ZM30,22H22v8H13V22H5V13h8V5h9v8h8Z"/></svg>'
			zoomPlus.addEventListener("click", function () {
				zoom(1)
			}, false)

			var zoomMinus = window.document.createElement("button")
			zoomMinus.className = "zoom-minus"
			zoomMinus.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35"><path d="M0,0V35H35V0ZM30,22H5V13H30Z"/></svg>'
			zoomMinus.addEventListener("click", function () {
				zoom(-1)
			}, false)

			var zoomRange = window.document.createElement("div")
			zoomRange.className = "zoom-range"
			zoomRange.addEventListener("mousedown", zoomMouseDown, false)

			var zoomRangeHandle = window.document.createElement("div")
			zoomRangeHandle.className = "zoom-range-handle"
			zoomRangeHandle.addEventListener("mousedown", zoomMouseDown, false)

			zoomRange.appendChild(zoomRangeHandle)
			zoomControlsWrapper.appendChild(zoomPlus)
			zoomControlsWrapper.appendChild(zoomRange)
			zoomControlsWrapper.appendChild(zoomMinus)
			buttonWrapper.appendChild(zoomControlsWrapper)
		}

	},

	methods: {},

	isFullscreen: function () {
		if ((window.outerHeight - window.innerHeight) > 100) {
			return window.outerWidth === window.imageRenderer.data.element.offsetWidth && window.outerWidth === window.screen.width;
		} else {
			return window.screen.width - window.outerWidth < 35 && window.innerHeight === window.screen.height;
		}
	},

	exitFullscreen: function () {
		var canvasWrapper = window.imageRenderer.data.element;
		canvasWrapper.classList.remove("fullscreen");

		if (window.document.exitFullscreen) {
			window.document.exitFullscreen();
		} else if (window.document.webkitExitFullscreen) {
			window.document.webkitExitFullscreen();
		} else if (window.document.mozCancelFullScreen) {
			window.document.mozCancelFullScreen();
		} else if (window.document.msExitFullscreen) {
			window.document.msExitFullscreen();
		}
	},

	enterFullscreen: function () {
		var canvasWrapper = window.imageRenderer.data.element;
		canvasWrapper.classList.add("fullscreen");

		if (canvasWrapper.requestFullscreen) {
			canvasWrapper.requestFullscreen();
		} else if (canvasWrapper.webkitRequestFullscreen) {
			canvasWrapper.webkitRequestFullscreen();
		} else if (canvasWrapper.mozRequestFullScreen) {
			canvasWrapper.mozRequestFullScreen();
		} else if (canvasWrapper.msRequestFullscreen) {
			canvasWrapper.msRequestFullscreen();
		}
	},

	toggleFullscreen: function () {
		var self = window.imageRenderer;

		if (window.imageRenderer.isFullscreen()) {
			self.exitFullscreen()
		} else {
			self.enterFullscreen()
		}
	},

	keyDown: function (e) {
		var self = window.imageRenderer;

		if ((e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27)) {
			self.exitFullscreen()
		}
	},

	getVariants: function () {
		var self = window.imageRenderer;
		var result = {
			small: null,
			large: null
		}

		if (!self.stats.originalImage) {
			return
		}

		var ctx = window.document.createElement("canvas").getContext("2d")
		ctx.canvas.width = self.stats.originalImage.naturalWidth * window.devicePixelRatio
		ctx.canvas.height = self.stats.originalImage.naturalHeight * window.devicePixelRatio
		ctx.drawImage(self.stats.originalImage, 0, 0, self.stats.originalImage.naturalWidth, self.stats.originalImage.naturalHeight, 0, 0, ctx.canvas.width, ctx.canvas.height)
		ctx.canvas.toBlob(function (large) {
			result.large = large
			var link = window.document.createElement('a');
			window.document.body.appendChild(link);
			link.download = "large"
			link.href = URL.createObjectURL(large);
			link.click();
			window.document.body.removeChild(link);

			ctx.canvas.width = self.stats.originalImage.naturalWidth / 2
			ctx.canvas.height = self.stats.originalImage.naturalHeight / 2
			ctx.drawImage(self.stats.originalImage, 0, 0, self.stats.originalImage.naturalWidth, self.stats.originalImage.naturalHeight, 0, 0, ctx.canvas.width, ctx.canvas.height)

			ctx.canvas.toBlob(function (small) {
				result.small = small
				link = window.document.createElement('a');
				window.document.body.appendChild(link);
				link.download = "small"
				link.href = URL.createObjectURL(small);
				link.click();
				window.document.body.removeChild(link);
			}, "image/jpeg", 0.5)
		}, "image/jpeg", 0.9)
	},

	init: function (data) {
		var self = window.imageRenderer;

		return new Promise(function (resolve, reject) {

			if (!data.element || !data.image) {
				return reject();
			}

			window.removeEventListener('keydown', self.keyDown, false)

			self.data = data;
			self.resetStats();
			self.subscriptions = [];
			data.element.setAttribute("imageRenderer", true)

			var method = self.methods.renderFlat;

			if (data["360"]) {
				method = self.methods.render360;
			}

			window.addEventListener('keydown', self.keyDown, false)

			if (method) {
				return method(data).then(function () {
					if (data.crop) {
						window.imageRenderer.cropper.init(data.element, data.crop)
					}

					return resolve()

				}, reject);
			}

			reject();
		});
	}
};