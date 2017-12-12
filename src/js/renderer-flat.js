window.imageRenderer.methods.renderFlat = function (data) {
	return new Promise(function (resolve, reject) {
		var canDoVR;
		var fill = data.fill;
		var imageItem = data.image;
		var previewItem = data.preview;
		var is3D = data["3D"];
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		function sendUpdate() {
			window.imageRenderer.stats.x = image.oCoords.tl.x * window.devicePixelRatio;
			window.imageRenderer.stats.y = image.oCoords.tl.y * window.devicePixelRatio;
			window.imageRenderer.stats.z = zoom;
			window.imageRenderer.stats.viewWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
			window.imageRenderer.stats.viewHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
			window.imageRenderer.stats.renderWidth = (image.oCoords.tr.x - image.oCoords.tl.x) * window.devicePixelRatio;
			window.imageRenderer.stats.renderHeight = (image.oCoords.bl.y - image.oCoords.tl.y) * window.devicePixelRatio;
			window.imageRenderer.stats.status = "drawing";
			window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
		}

		var image, image2D, image3D, zoomMin, zoom, canvas, fullscreenButton, vrButton;

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
			amount = (amount * (zoom * 0.025));

			if (zoom + amount > getMinZoom() || amount > 0) {
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
			var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
			if (delta !== 0) {
				setZoomingPoint(-delta / 16);
			}
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
			canvas.setDimensions({ width: Math.floor(canvasWrapper.offsetWidth), height: Math.floor(canvasWrapper.offsetHeight) });

			zoomMin = getMinZoom();

			if (zoom < zoomMin) {
				zoom = zoomMin;
				canvas.setZoom(zoomMin);
			}

			if (image) {

				var outOfBounds = isOutOfBounds(0, 0);

				if (outOfBounds.x || outOfBounds.y) {
					var delta = new window.fabric.Point(outOfBounds.correctedX, outOfBounds.correctedY);
					canvas.relativePan(delta);
				}

				image.setCoords();
			}

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

			canvasWrapper.addEventListener("mousewheel", mouseWheel, false);
			window.document.addEventListener("fullscreenchange", reCenter, false);
			window.document.addEventListener("webkitfullscreenchange", reCenter, false);
			window.document.addEventListener("mozfullscreenchange", reCenter, false);

		}

		function toggleFullscreen() {

			if (is3D && canDoVR) {
				if (window.imageRenderer.isFullscreen()) {
					updateImage(image2D);
				} else {
					updateImage(image3D);
				}

				reCenter();
			}

			window.imageRenderer.toggleFullscreen();
		}

		function createControlButtons() {
			if (!fullscreenButton) {

				var buttonWrapper = document.createElement("div");
				buttonWrapper.classList.add("buttonWrapper")
				canvasWrapper.appendChild(buttonWrapper);

				if (is3D && canDoVR) {
					vrButton = document.createElement("button");
					vrButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 86" viewBox="0 0 196.33 123.31"><path d="M194.33 14a12 12 0 0 0-12-12s-63.12-2-84.17-2-84.17 2-84.17 2a12 12 0 0 0-12 12S0 57.73 0 70.33c0 11.76 2 41 2 41a12 12 0 0 0 12 12h56.33s15.31-41.21 27.67-41c12.09.21 25.67 41 25.67 41h58.67a12 12 0 0 0 12-12s2-36.48 2-48.65S194.33 14 194.33 14zM46.67 86.66A28.33 28.33 0 1 1 75 58.33a28.33 28.33 0 0 1-28.33 28.33zm102 0A28.33 28.33 0 1 1 177 58.33a28.33 28.33 0 0 1-28.33 28.33z"/></svg>';
					vrButton.addEventListener('click', toggleFullscreen, false);
					buttonWrapper.appendChild(vrButton);
				}

				fullscreenButton = document.createElement("button");
				fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 59" viewBox="0 0 193.57 193.57"><path d="M69.2.04q.06 13.21.12 26.43c0 1.05-.49 1.49-1.48 1.5H30.66c-2.59 0-2.64 0-2.64 2.64v35.88c0 2.8 0 2.81-2.84 2.8L.04 69.16V1.6C.04.24.32-.04 1.68-.04Q35.42.08 69.2.04zM193.54 69.16q-13.21.06-26.43.12c-1.05 0-1.49-.49-1.5-1.48v-1.89V30.6c0-2.59 0-2.64-2.64-2.64h-35.91c-2.8 0-2.81 0-2.8-2.84q0-12.55.12-25.11h67.65c1.29 0 1.55.25 1.55 1.55q-.08 33.81-.04 67.6zM.04 124.38q13.21-.06 26.43-.12c1.05 0 1.49.49 1.5 1.48v37.2c0 2.59 0 2.64 2.64 2.64h35.91c2.8 0 2.81 0 2.8 2.84q0 12.55-.12 25.11H1.55c-1.29 0-1.55-.25-1.55-1.55q.08-33.82.04-67.6zM124.38 193.54q-.06-13.21-.12-26.43c0-1.05.49-1.49 1.48-1.5h37.2c2.59 0 2.64 0 2.64-2.64v-35.88c0-2.8 0-2.81 2.84-2.8l25.11.12v67.65c0 1.29-.25 1.55-1.55 1.55q-33.78-.11-67.6-.07z"></path></svg>';
				fullscreenButton.addEventListener('click', toggleFullscreen, false);
				buttonWrapper.appendChild(fullscreenButton);
			}
		}

		function create2D(img) {
			return new Promise(function (resolve) {

				var _img = new window.Image();

				_img.onload = function () {
					resolve(_img);
				};

				var ctx = window.document.createElement("canvas").getContext("2d");
				ctx.canvas.width = img.naturalWidth / 2;
				ctx.canvas.height = img.naturalHeight;
				ctx.drawImage(img, 0, 0);
				_img.src = ctx.canvas.toDataURL();

			});
		}


		function updateImage(_img) {
			image = canvas.getObjects()[0];

			window.fabric.Image.fromURL(_img.src, function (oImg) {
				canvas.add(oImg);
				canvas.remove(image);

				image = canvas.getObjects()[0];
				image.hasBorders = image.hasControls = false;
				image.selectable = false;

				var previousZoomMin = zoomMin;
				zoomMin = getMinZoom();

				if (!zoom) {
					zoom = zoomMin;
					canvas.setZoom(zoomMin);
				} else {
					zoom = zoom / (previousZoomMin / zoomMin);
					canvas.setZoom(zoom);
				}

				image.viewportCenter();

				image.setCoords();
				canvas.renderAll();



				canvasWrapper.classList.add("active");

				sendUpdate();

				createControlButtons();

				if('touchstart' in window.document.documentElement){
					return;
				}

				setEvents();
			}, { crossOrigin: "anonymous" });
		}


		function run() {

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

			var progressBar = document.createElement("div");
			progressBar.classList.add("renderer-progressbar");
			canvasWrapper.appendChild(progressBar);

			function loadMain() {
				window.imageRenderer.loadImage(imageItem, function (mainimg) {
					window.imageRenderer.stats.imageProgress = 100;
					progressBar.style.opacity = 0;

					setTimeout(function () {
						canvasWrapper.removeChild(progressBar);
					}, 600);

					if (is3D) {
						image3D = mainimg;

						create2D(image3D).then(function (mainimg2D) {
							image2D = mainimg2D;
							updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
						});
					} else {
						image2D = mainimg;
						updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
					}

				}, function (prog) {
					window.imageRenderer.stats.imageProgress = prog;
					progressBar.style.width = prog + "%";
					window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
				});
			}

			function loadPreview() {
				window.imageRenderer.loadImage(previewItem, function (previmg) {
					window.imageRenderer.stats.previewProgress = 100;

					if (is3D) {
						image3D = previmg;

						create2D(previmg).then(function (previmg) {

							image2D = previmg;
							updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
						});
					} else {
						image2D = previmg;
						updateImage(window.imageRenderer.isFullscreen() ? image3D : image2D);
					}

					loadMain();

				}, function (prog) {
					window.imageRenderer.stats.previewProgress = prog;
					progressBar.style.width = prog + "%";
					window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
				});
			}

			if (previewItem) {
				loadPreview();
			} else {
				loadMain();
			}


			window.addEventListener("resize", elResize, false);
			window.onorientationchange = reCenter;

			resolve();
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