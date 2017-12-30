window.imageRenderer.methods.renderFlat = function (data) {
	return new Promise(function (resolve, reject) {
		var canDoVR, prevX, prevY, prevW, prevH;
		var fill = data.fill;
		var is3D = data["3D"];
		var isMobile = window.hasOwnProperty('ontouchstart')
		var previousHeight = 0;
		var previousWidth = 0;
		var originalImage, image, image2D, image3D, zoomMin, zoomMax = 1.5, zoom, canvas;
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		function sendUpdate(ready) {
			window.imageRenderer.stats.x = image.oCoords.tl.x * window.devicePixelRatio;
			window.imageRenderer.stats.y = image.oCoords.tl.y * window.devicePixelRatio;
			window.imageRenderer.stats.z = zoom;
			window.imageRenderer.stats.viewWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
			window.imageRenderer.stats.viewHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
			window.imageRenderer.stats.renderWidth = (image.oCoords.tr.x - image.oCoords.tl.x) * window.devicePixelRatio;
			window.imageRenderer.stats.renderHeight = (image.oCoords.bl.y - image.oCoords.tl.y) * window.devicePixelRatio;
			window.imageRenderer.stats.status = "drawing";
			window.imageRenderer.stats.minZoom = zoomMin;
			window.imageRenderer.stats.maxZoom = zoomMax;
			window.imageRenderer.stats.type = "flat"
			window.imageRenderer.stats.canvas = canvas
			window.imageRenderer.stats.originalImage = originalImage

			if (ready) {
				window.imageRenderer.stats.ready = 1
			}

			window.imageRenderer.updateZoomHandle()

			window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
		}

		function getMinZoom() {
			if (!image) {
				return 0;
			}

			var method = fill ? 'max' : 'min';

			return Math[method](canvasWrapper.offsetWidth / image.width, canvasWrapper.offsetHeight / image.height);
		}

		function isOutOfBounds(x, y) {
			image.setCoords();
			var top = image.oCoords.tl.y;
			var left = image.oCoords.tl.x;
			var bottom = image.oCoords.bl.y;
			var right = image.oCoords.br.x;
			var height = bottom - top;
			var width = right - left;
			var cHeight = canvas.height;
			var cWidth = canvas.width;
			var xOutOfBounds = false;
			var yOutOfBounds = false;
			var correctedY = y;
			var correctedX = x;

			if (((bottom + y) <= cHeight) || ((bottom + y) >= height && (top + y) >= 0)) {
				yOutOfBounds = true;

				if ((bottom + y) <= cHeight) {
					correctedY = cHeight - (bottom + y);
				} else {
					correctedY = height - (bottom + y);
				}

				if (cHeight > height) {
					correctedY = correctedY - ((cHeight - height) / 2);
				}
			}

			if (((right + x) <= cWidth) || ((right + x) >= width && (left + x) >= 0)) {
				xOutOfBounds = true;

				if ((right + x) <= cWidth) {
					correctedX = cWidth - (right + x);
				} else {
					correctedX = width - (right + x);
				}

				if (cWidth > width) {
					correctedX = correctedX - ((cWidth - width) / 2);
				}
			}

			return {
				x: xOutOfBounds,
				correctedX: correctedX,
				y: yOutOfBounds,
				correctedY: correctedY
			};
		}

		function zooming(point, amount) {
			if (zoom + amount > getMinZoom() && amount + zoom < zoomMax) {
				zoom = zoom + amount;
				canvas.zoomToPoint(point, zoom);
			} else {
				canvas.zoomToPoint(point, zoom);
			}

			var outOfBounds = isOutOfBounds(0, 0);

			if (outOfBounds.x || outOfBounds.y) {
				var delta = new window.fabric.Point(outOfBounds.correctedX, outOfBounds.correctedY);
				canvas.relativePan(delta);
			}

			sendUpdate();
		}

		function setZoomingPoint(amount) {
			var canvasCenterX = canvasWrapper.offsetWidth / 2;
			var canvasCenterY = canvasWrapper.offsetHeight / 2;
			var point = new window.fabric.Point(canvasCenterX, canvasCenterY);
			zooming(point, -amount * 16);
		}

		function mouseWheel(e) {
			e.preventDefault();
			var delta = Math.max(-1, Math.min(1, (-(e.deltaY) || e.wheelDelta || -e.detail)));
			if (delta !== 0) {
				setZoomingPoint(-delta / 16);
			}
		}

		var zoomQueue = []

		function doZoom(amount) {
			amount = amount / 6
			var queueCount = 11

			while (queueCount--) {
				zoomQueue.push(amount / 11)
			}

			function runZoom() {
				window.requestAnimationFrame(function () {
					if (zoomQueue.length) {
						var queueAmount = zoomQueue.shift()
						zoom = zoom + queueAmount

						if (zoom < getMinZoom()) {
							zoom = getMinZoom();
						}

						if (zoom > zoomMax) {
							zoom = zoomMax;
						}

						setZoomingPoint(zoom)

						runZoom()
					}
				})
			}

			runZoom()
		}

		function reCenter() {
			zoom = zoomMin = getMinZoom();
			canvas.setZoom(zoomMin);
			if (image) {
				image.viewportCenter();
				image.setCoords();
			}

			canvas.renderAll();

			sendUpdate();
		}

		function elResize() {
			if (window.imageRenderer.isFullscreen()) {
				canvasWrapper.classList.add("fullscreen");
			} else {
				canvasWrapper.classList.remove("fullscreen");
			}

			if (isMobile) {
				return
			}

			canvas.setDimensions({ width: Math.floor(canvasWrapper.offsetWidth), height: Math.floor(canvasWrapper.offsetHeight) });

			zoomMin = getMinZoom();

			if (previousWidth) {
				var ratio = Math.min((canvasWrapper.offsetWidth * window.devicePixelRatio) / previousWidth, (canvasWrapper.offsetHeight * window.devicePixelRatio) / previousHeight)
				zoom = zoom * ratio
			}

			if (zoom < zoomMin) {
				zoom = zoomMin;
			} else if (zoom > zoomMax) {
				zoom = zoomMax
			}

			setZoomingPoint(zoom);

			if (image) {

				var outOfBounds = isOutOfBounds(0, 0);

				if (outOfBounds.x || outOfBounds.y) {
					var delta = new window.fabric.Point(outOfBounds.correctedX, outOfBounds.correctedY);
					canvas.relativePan(delta);
				}

				image.setCoords();
			}

			previousHeight = canvasWrapper.offsetHeight * window.devicePixelRatio
			previousWidth = canvasWrapper.offsetWidth * window.devicePixelRatio

			sendUpdate();
		}

		function setEvents() {

			var panning = false;
			var previousEvent = null;

			canvas.on("mouse:down", function () {
				panning = true;
			});

			canvas.on("mouse:up", function () {
				panning = false;
			});

			// canvas.on("mouse:wheel", function (e) {
			// 	mouseWheel(e.e)
			// });

			canvas.on("mouse:move", function (e) {
				if (panning && e && e.e) {
					var x = e.e.movementX;
					var y = e.e.movementY;
					if (!x && previousEvent) {
						x = e.e.screenX - previousEvent.e.screenX;
						y = e.e.screenY - previousEvent.e.screenY;
					}

					var outOfBounds = isOutOfBounds(x, y);

					if (outOfBounds.y) { y = 0; }
					if (outOfBounds.x) { x = 0; }

					var delta = new window.fabric.Point(x, y);
					canvas.relativePan(delta);

					sendUpdate();
				}
				previousEvent = e;
			});

		}

		function toggleVr() {

			if (is3D && canDoVR) {
				if (window.imageRenderer.isFullscreen()) {
					updateImage(image2D);
				} else {
					updateImage(image3D);
				}

				if (!isMobile) {
					reCenter();
				}

			}

			window.imageRenderer.toggleFullscreen();
		}

		function toggleFullscreen() {
			window.imageRenderer.toggleFullscreen();
		}

		function onExitFullscreen() {
			setTimeout(function () {
				elResize()
			}, 200)
		}

		function create2D(img) {

			return new Promise(function (res) {

				var _img = new window.Image();

				_img.onload = function () {
					res(_img);
				};

				var ctx = window.document.createElement("canvas").getContext("2d");
				ctx.canvas.width = img.width / 2;
				ctx.canvas.height = img.height;
				ctx.drawImage(img, 0, 0);
				_img.src = ctx.canvas.toDataURL();

			});
		}

		function proxyImg(_img, amount) {
			var width = amount;
			var height = _img.height * (amount / _img.width)
			var pCtx = window.document.createElement("canvas").getContext("2d")
			pCtx.canvas.width = width
			pCtx.canvas.height = height
			pCtx.drawImage(_img, 0, 0, _img.width, _img.height, 0, 0, width, height)
			_img.src = pCtx.canvas.toDataURL("image/jpeg", 1)
			return _img
		}


		var hasLoadedControls = false
		function updateImage(_img) {

			if (_img.width > 6000) {
				_img = proxyImg(_img, 6000)
			}

			if (isMobile) {
				canvasWrapper.style.backgroundImage = "url(" + _img.src + ")"
				canvasWrapper.style.backgroundRepeat = "no-repeat"
				canvasWrapper.style.backgroundPosition = "center center"
				canvasWrapper.style.backgroundSize = "contain"
				return;
			}

			var controlOptions = {
				fullscreen: toggleFullscreen,
				onExitFullscreen: onExitFullscreen,
				zoom: doZoom
			}

			if (is3D && canDoVR) {
				controlOptions.vr = toggleVr
			}

			if (!hasLoadedControls) {
				window.imageRenderer.createControls(controlOptions)
				hasLoadedControls = true
			}

			image = canvas.getObjects()[0];
			prevX = image ? image.left : 0
			prevY = image ? image.top : 0

			if (image) {
				image.setSrc(_img.src, function () {

					image.set({
						'left': prevX,
						'top': prevY,
						width: prevW,
						height: prevH
					});

					zoomMin = getMinZoom();
					canvas.setZoom(zoom || zoomMin)
					image.setCoords()
					canvas.renderAll();
				})
			} else {
				window.fabric.Image.fromURL(_img.src, function (oImg) {

					canvas.add(oImg);
					image = canvas.getObjects()[0];

					prevW = _img.width || image.width
					prevH = _img.height || image.height

					image.hasBorders = image.hasControls = false;
					image.selectable = false;

					zoomMin = getMinZoom();
					zoom = zoomMin;
					canvas.setZoom(zoomMin);

					image.viewportCenter();
					image.setCoords();
					canvas.renderAll();
					canvasWrapper.classList.add("active");

					sendUpdate(true);

					setEvents();


				}, { crossOrigin: "anonymous" });
			}

		}


		function run() {

			if (!isMobile) {
				canvas = window.document.createElement("canvas");
				canvasWrapper.appendChild(canvas);
				canvas = new window.fabric.Canvas(canvas, {
					allowTouchScrolling: false,
					enableRetinaScaling: true,
					stopContextMenu: true,
					lockUniScaling: true,
					centeredScaling: true,
					alignX: "mid",
					alignY: "mid",
				});

				canvas.setDimensions({ width: canvasWrapper.offsetWidth, height: canvasWrapper.offsetHeight });
				canvas.selection = false;
			} else {
				canvas = new window.Image()
				canvasWrapper.appendChild(canvas);
			}

			window.imageRenderer.initImages(function (_img) {
				originalImage = _img
				if (is3D) {
					image3D = _img;

					create2D(image3D).then(function (_img2D) {
						image2D = _img2D;
						updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
					});
				} else {
					image2D = _img;
					updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
				}

				resolve();
			}, function (_img) {

				if (is3D) {
					image3D = _img;

					create2D(_img).then(function (_img) {
						image2D = _img;
						updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
					});

				} else {
					image2D = _img;
					updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
				}
			}, reject)

			window.addEventListener("resize", elResize, false);
			window.onorientationchange = reCenter;
		}

		if (window.navigator.getVRDisplays) {
			try {
				window.navigator.getVRDisplays().then(function (displays) {
					if (displays.length > 0) {
						var vrDisplay = displays[0];
						canDoVR = vrDisplay.capabilities.canPresent;
					}

					run();
				});
			} catch (e) {
				run();
			}
		} else {
			run();
		}
	});
};