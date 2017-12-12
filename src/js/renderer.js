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
		console.log("event", event);
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

		for (var i = 0; i < self.subscriptions[event].length; i++){
			self.subscriptions[event][i](data);
		}
	},

	passToMethod: function (data, method) {
		window.imageRenderer.methods[method](data);
	},

	loadImage: function (url, endCB, progressCB, errorCB) {
		var xmlHTTP = new window.XMLHttpRequest();
		xmlHTTP.open("GET", url, true);
		xmlHTTP.responseType = "arraybuffer";
		xmlHTTP.onload = function (e) {

			if (e.target.status === 200 && e.target.response.byteLength) {
				var blob = new window.Blob([e.target.response]);
				var uri = window.URL.createObjectURL(blob);
				var img = new window.Image();

				img.onload = function (e) {
					// window.URL.revokeObjectURL(uri);
					if (endCB) {
						endCB(e.target);
					}
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

	methods: {},

	isFullscreen: function () {
		return window.outerWidth === screen.width && window.innerHeight === screen.height;
	},

	toggleFullscreen: function () {
		var canvasWrapper = window.imageRenderer.data.element;

		if (window.imageRenderer.isFullscreen()) {
			canvasWrapper.classList.remove("fullscreen");

			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			}
			return;
		}

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

	init: function (data) {
		var self = window.imageRenderer;

		return new Promise(function (resolve, reject) {

			if (!data.element || !data.image) {
				return reject();
			}

			self.data = data;
			self.resetStats();
			self.subscriptions = [];
			data.element.setAttribute("imageRenderer", true)

			var method = self.methods.renderFlat;

			if (data["360"]) {
				method = self.methods.render360;
			}

			if (method) {
				return method(data).then(function () {
					if (data.crop) {
						window.imageRenderer.cropper.init(data.element, data.crop)
					}

					return resolve()

				});
			}

			reject();
		});
	}
};