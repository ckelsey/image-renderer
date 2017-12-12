window.imageRenderer.methods.renderVr = function (data) {
	return new Promise(function (resolve, reject) {
		var allowNonVR = data.allowNonVR;
		var imageItem = data.image;
		var previewItem = data.preview;
		var is3D = data["3D"];
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		var glAttribs = {
			antialias: true,
		};

		var frameData = new window.VRFrameData();
		var vrDisplay;
		var vrSceneFrame;
		var panorama = null;
		var panorama2 = null;
		var viewMat = window.mat4.create();

		var canvas = window.document.createElement("canvas");
		var img1 = new window.Image();
		var img2 = new window.Image();
		var ctxTop = window.document.createElement("canvas").getContext("2d");
		var ctxBottom = window.document.createElement("canvas").getContext("2d");

		var gl = canvas.getContext("webgl", glAttribs);
		var isPresenting = false;
		var canPresent = false;
		var normalSceneFrame = null;

		canvasWrapper.appendChild(canvas);
		canvas.setAttribute("type", "vr");

		if (!gl) {
			gl = canvas.getContext("experimental-webgl", glAttribs);
		}

		function getPoseMatrix(out, pose) {
			var orientation = pose.orientation;
			if (!orientation) { orientation = [0, 0, 0, 1]; }

			window.mat4.fromQuat(out, orientation);
			window.mat4.invert(out, out);
		}

		function drawVRScene() {
			vrSceneFrame = vrDisplay.requestAnimationFrame(drawVRScene);
			vrDisplay.getFrameData(frameData);

			getPoseMatrix(viewMat, frameData.pose);

			gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

			gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
			panorama.render(frameData.leftProjectionMatrix, viewMat);

			gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);

			if (is3D) {
				panorama2.render(frameData.rightProjectionMatrix, viewMat);
			} else {
				panorama.render(frameData.rightProjectionMatrix, viewMat);
			}

			vrDisplay.submitFrame();

			window.imageRenderer.stats.x = 0;
			window.imageRenderer.stats.y = 0;
			window.imageRenderer.stats.z = 0;
			window.imageRenderer.stats.viewWidth = window.imageRenderer.stats.renderWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
			window.imageRenderer.stats.viewHeight = window.imageRenderer.stats.renderHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
			window.imageRenderer.stats.status = "drawing";
		}


		function positionCanvas() {
			canvas.style.position = "fixed";

			if (isPresenting) {
				var leftEye = vrDisplay.getEyeParameters("left");
				var rightEye = vrDisplay.getEyeParameters("right");
				canvas.width = (Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2) * window.devicePixelRatio;
				canvas.height = (Math.max(leftEye.renderHeight, rightEye.renderHeight)) * window.devicePixelRatio;
				canvas.style.width = "100%";
				canvas.style.height = "100%";
				canvas.style.top = "0px";
				canvas.style.left = "0px";
				canvas.style.zIndex = "9999";
			} else {
				canvas.width = Math.max(window.innerWidth, window.innerHeight) * window.devicePixelRatio;
				canvas.height = Math.max(window.innerWidth, window.innerHeight) * window.devicePixelRatio;
				canvas.style.width = (canvas.width / window.devicePixelRatio) + "px";
				canvas.style.height = (canvas.height / window.devicePixelRatio) + "px";
				canvas.style.top = ((window.innerHeight - (canvas.height / window.devicePixelRatio)) / 2) + "px";
				canvas.style.left = ((window.innerWidth - (canvas.width / window.devicePixelRatio)) / 2) + "px";
				canvas.style.zIndex = "9999";
			}
		}

		function onPresent() {
			try {
				window.cancelAnimationFrame(normalSceneFrame);
			} catch (e) { }

			setTimeout(function () {
				isPresenting = true;

				positionCanvas();

				if (is3D) {

					if (!panorama) {
						panorama = new window.VRPanorama(gl);
					}
					panorama.useImage(img1);

					if (!panorama2) {
						panorama2 = new window.VRPanorama(gl);
					}
					panorama2.useImage(img2);

					drawVRScene();
				} else {
					if (!panorama) {
						panorama = new window.VRPanorama(gl);
					}
					panorama.useImage(img1);
					drawVRScene();
				}
			}, 500);
		}

		function drawScene() {
			normalSceneFrame = window.requestAnimationFrame(drawScene);
			vrDisplay.getFrameData(frameData);

			getPoseMatrix(viewMat, frameData.pose);

			gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

			gl.viewport(0, 0, canvas.width, canvas.height);
			panorama.render(frameData.leftProjectionMatrix, viewMat);
		}

		function onNormalScene() {
			try {
				vrDisplay.cancelAnimationFrame(vrSceneFrame);
			} catch (e) { }

			window.removeEventListener("resize", positionCanvas, false);
			window.removeEventListener("vrdisplaypresentchange", presentChange, false);

			if (allowNonVR) {
				positionCanvas();

				// window.parent.document.getElementById("ansel_viewer_frame").classList.remove("in-vr-mode")

				isPresenting = false;

				if (!panorama) {
					panorama = new window.VRPanorama(gl);
				}

				panorama.useImage(img1);
				return drawScene();
			}

			window.imageRenderer.methods.render360(data);
		}

		function setImages(img) {
			if (is3D) {
				ctxTop.canvas.width = img.naturalWidth;
				ctxTop.canvas.height = img.naturalHeight / 2;
				ctxTop.drawImage(img, 0, 0);

				ctxBottom.canvas.width = img.naturalWidth;
				ctxBottom.canvas.height = img.naturalHeight / 2;
				ctxBottom.drawImage(img, 0, -ctxBottom.canvas.height);

				img1 = ctxTop.canvas;
				img2 = ctxBottom.canvas;
			} else {
				img1 = img;
			}
		}

		function present() {
			vrDisplay.requestPresent([{ source: canvas }]).then(function () {
				onPresent();
			});
		}

		function presentChange() {
			if (!vrDisplay.isPresenting) {
				onNormalScene();
			}
		}

		function run() {
			resolve();

			function loadMain() {

				window.imageRenderer.loadImage(imageItem, function (mainimg) {
					window.imageRenderer.stats.imageProgress = 100;
					setImages(mainimg);

					progressBar.style.opacity = 0;

					setTimeout(function () {
						canvasWrapper.removeChild(progressBar);
					}, 600);

					if (allowNonVR) {
						onNormalScene();
					} else {

						present();
					}

				}, function (prog) {
					window.imageRenderer.stats.imageProgress = prog;
					progressBar.style.width = prog + "%";
					window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
				});
			}

			function loadPreview () {
				window.imageRenderer.loadImage(previewItem, function (previmg) {
					window.imageRenderer.stats.previewProgress = 100;
					setImages(previmg);

					if (allowNonVR) {
						onNormalScene();
					} else {

						present();
					}

					var progressBar = document.createElement("div");
					progressBar.classList.add("renderer-progressbar");
					canvasWrapper.appendChild(progressBar);

					loadMain();
				}, function (prog) {
					window.imageRenderer.stats.previewProgress = prog;
					window.imageRenderer.trigger("statsUpdate", window.previewProgress.stats);
				}, function () {
					loadMain();
				});
			}

			if (previewItem) {
				loadPreview();
			} else {
				loadMain();
			}

			window.addEventListener("resize", positionCanvas, false);
			window.addEventListener("vrdisplaypresentchange", presentChange, false);
		}

		if (window.navigator.getVRDisplays) {
			try {
				window.navigator.getVRDisplays().then(function (displays) {
					if (displays.length > 0) {
						vrDisplay = displays[0];
						canPresent = vrDisplay.capabilities.canPresent;
					}

					if ((!vrDisplay || !vrDisplay.getFrameData || !canPresent) && !allowNonVR) {
						return window.imageRenderer.methods.render360(data);
					}

					run();
				});
			} catch (e) {
				return window.imageRenderer.methods.render360(data);
			}
		} else {
			return window.imageRenderer.methods.render360(data);
		}
	});
};