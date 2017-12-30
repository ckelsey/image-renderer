window.imageRenderer.methods.renderVr = function (data) {
	return new Promise(function (resolve, reject) {
		var allowNonVR = data.allowNonVR;
		var is3D = data["3D"];
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		var glAttribs = {
			antialias: true,
		};

		var frameData;
		var vrDisplay;
		var vrSceneFrame;
		var panorama;
		var panorama2;
		var viewMat;

		var canvas;
		var img1;
		var img2;
		var originalImage;
		var ctxTop = window.document.createElement("canvas").getContext("2d");
		var ctxBottom = window.document.createElement("canvas").getContext("2d");

		var gl;
		var isPresenting = false;
		var canPresent = false;
		var normalSceneFrame = null;

		function getPoseMatrix(out, pose) {
			var orientation = pose.orientation;
			if (!orientation) { orientation = [0, 0, 0, 1]; }

			window.mat4.fromQuat(out, orientation);
			window.mat4.invert(out, out);
		}

		function drawVRScene() {
			gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

			vrSceneFrame = vrDisplay.requestAnimationFrame(drawVRScene);
			vrDisplay.getFrameData(frameData);

			getPoseMatrix(viewMat, frameData.pose);

			gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
			panorama.render(frameData.leftProjectionMatrix, viewMat);

			gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
			panorama2.render(frameData.rightProjectionMatrix, viewMat);

			vrDisplay.submitFrame();

			window.imageRenderer.stats.x = 0;
			window.imageRenderer.stats.y = 0;
			window.imageRenderer.stats.z = 0;
			window.imageRenderer.stats.viewWidth = window.imageRenderer.stats.renderWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
			window.imageRenderer.stats.viewHeight = window.imageRenderer.stats.renderHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
			window.imageRenderer.stats.status = "drawing";
			window.imageRenderer.stats.type = "vr"
			window.imageRenderer.stats.canvas = canvas
			window.imageRenderer.stats.originalImage = originalImage
		}

		function drawScene() {

			gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

			normalSceneFrame = window.requestAnimationFrame(drawScene);
			vrDisplay.getFrameData(frameData);

			getPoseMatrix(viewMat, frameData.pose);

			gl.viewport(0, 0, canvas.width, canvas.height);
			panorama.render(frameData.leftProjectionMatrix, viewMat);

			vrDisplay.submitFrame();
		}


		function positionCanvas() {
			var leftEye = vrDisplay.getEyeParameters("left");
			var rightEye = vrDisplay.getEyeParameters("right");

			if (isPresenting) {
				canvas.width = (Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2);
				canvas.height = (Math.max(leftEye.renderHeight, rightEye.renderHeight));
				canvas.style.width = "100%";
				canvas.style.height = "100%";
				canvas.style.top = "0px";
				canvas.style.left = "0px";
			} else {
				canvas.style.position = "relative";
				canvas.width = Math.max(canvasWrapper.offsetWidth, canvasWrapper.offsetHeight) * window.devicePixelRatio;
				canvas.height = Math.max(canvasWrapper.offsetWidth, canvasWrapper.offsetHeight) * window.devicePixelRatio;
				canvas.style.width = (canvas.width / window.devicePixelRatio) + "px";
				canvas.style.height = (canvas.height / window.devicePixelRatio) + "px";
				canvas.style.top = ((canvasWrapper.offsetHeight - (canvas.height / window.devicePixelRatio)) / 2) + "px";
				canvas.style.left = ((canvasWrapper.offsetWidth - (canvas.width / window.devicePixelRatio)) / 2) + "px";
			}
		}

		function onPresent() {
			try {
				window.cancelAnimationFrame(normalSceneFrame);
			} catch (e) { }

			var btnWrapper = window.document.querySelector(".buttonWrapper")

			if (btnWrapper) {
				btnWrapper.parentElement.removeChild(btnWrapper)
			}

			canvasWrapper.classList.add("fullscreen");

			setTimeout(function () {
				isPresenting = true;

				positionCanvas();

				if (!panorama) {
					panorama = new window.VRPanorama(gl);
				}
				panorama.useImage(img1);

				if (!panorama2) {
					panorama2 = new window.VRPanorama(gl);
				}
				panorama2.useImage(img2);

				drawVRScene();
			}, 500);
		}

		function onNormalScene() {
			try {
				vrDisplay.cancelAnimationFrame(vrSceneFrame);
			} catch (e) { }

			positionCanvas();

			if (!panorama) {
				panorama = new window.VRPanorama(gl);
			}
			panorama.useImage(img1);

			if (!panorama2) {
				panorama2 = new window.VRPanorama(gl);
			}
			panorama2.useImage(img2);

			return drawScene();
		}

		function setImages(img) {
			ctxTop.canvas.width = 4096;
			ctxTop.canvas.height = 2048;
			ctxBottom.canvas.width = 4096;
			ctxBottom.canvas.height = 2048;
			ctxTop.drawImage(img, 0, 0);

			if (is3D || img.width === img.height) {
				ctxBottom.drawImage(img, 0, -ctxBottom.canvas.height);
				img1 = ctxTop.canvas
				img2 = ctxBottom.canvas
			} else {
				img1 = ctxTop.canvas
				img2 = ctxTop.canvas
			}
		}

		function present() {
			vrDisplay.requestPresent([{ source: canvas }]).then(function () {
				onPresent();
			});
		}

		function presentChange() {
			if (!vrDisplay.isPresenting) {
				isPresenting = false
				run()
			}
		}

		function run() {
			panorama = null;
			panorama2 = null;
			gl = false;
			canvasWrapper.innerHTML = "";
			canvasWrapper.classList.remove("fullscreen");
			frameData = new window.VRFrameData();
			viewMat = window.mat4.create()
			canvas = window.document.createElement("canvas");
			gl = canvas.getContext("webgl", glAttribs);
			canvasWrapper.appendChild(canvas);
			canvas.setAttribute("type", "vr");

			isPresenting = false;

			if (!gl) {
				gl = canvas.getContext("experimental-webgl", glAttribs);
			}

			if (img1) {
				originalImage = img1
				onNormalScene()
				window.imageRenderer.createControls({
					vr: present
				})
				return
			}

			img1 = new window.Image();
			img2 = new window.Image();

			var hasLoadedControls = false

			window.imageRenderer.initImages(function (_img) {
				originalImage = _img
				setImages(_img);

				if (vrDisplay.isPresenting) {
					onPresent()
				} else {
					onNormalScene();
				}

				if (!hasLoadedControls) {
					window.imageRenderer.createControls({
						vr: present
					})
					hasLoadedControls = true
				}

				resolve();
			}, function (_img) {
				setImages(_img);
				onNormalScene()
				window.imageRenderer.createControls({
					vr: present
				})
			}, reject)

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