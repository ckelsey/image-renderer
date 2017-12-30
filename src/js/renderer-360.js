window.imageRenderer.methods.render360 = function (data) {
	return new Promise(function (resolve, reject) {
		var is3D = data["3D"];
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		var minZoom = 5, maxZoom = 50, zoom = 40, distance = 50, ready = false,
			lon = 270, lat = 0, phi = 0, theta = 0, // Pan / tilt settings
			renderer = null, scene = null, camera = null, texture = null, material = null, controls = null, // Three elements
			isUserInteracting,

			originalImage = null,
			ctxTop = window.document.createElement("canvas").getContext("2d"), // for 3d photospheres

			onPointerDownPointerX = 0,
			onPointerDownPointerY = 0,
			onPointerDownLon = 0,
			onPointerDownLat = 0,

			canDoVR = false,
			animationFrame = null;

		/* RENDER METHODS */

		function draw() {
			ready = true
			lat = Math.max(- 85, Math.min(85, lat));
			phi = window.THREE.Math.degToRad(90 - lat);
			theta = window.THREE.Math.degToRad(lon - 180);
			camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
			camera.position.y = distance * Math.cos(phi);
			camera.position.z = distance * Math.sin(phi) * Math.sin(theta);
			camera.lookAt(scene.position);

			if (canDoVR) {
				controls.update();
			}
			renderer.render(scene, camera);

			if (
				window.imageRenderer.stats.ready !== ready ||
				window.imageRenderer.stats.x !== lon ||
				window.imageRenderer.stats.y !== lat ||
				window.imageRenderer.stats.z !== distance ||
				window.imageRenderer.stats.viewWidth !== canvasWrapper.offsetWidth * window.devicePixelRatio ||
				window.imageRenderer.stats.viewHeight !== canvasWrapper.offsetHeight * window.devicePixelRatio
			) {
				window.imageRenderer.stats.ready = ready;
				window.imageRenderer.stats.x = lon;
				window.imageRenderer.stats.y = lat;
				window.imageRenderer.stats.z = distance;
				window.imageRenderer.stats.viewWidth = window.imageRenderer.stats.renderWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
				window.imageRenderer.stats.viewHeight = window.imageRenderer.stats.renderHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
				window.imageRenderer.stats.status = "drawing";
				window.imageRenderer.stats.minZoom = minZoom;
				window.imageRenderer.stats.maxZoom = maxZoom;
				window.imageRenderer.stats.type = "360"
				window.imageRenderer.stats.canvas = renderer.domElement
				window.imageRenderer.stats.originalImage = originalImage

				window.imageRenderer.updateZoomHandle(true)

				window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
			}

		}

		function animate() {
			animationFrame = window.requestAnimationFrame(animate);
			draw();
		}


		/* EVENT HANDLERS */

		function onDocumentMouseDown(event) {
			event.preventDefault();
			isUserInteracting = true;
			onPointerDownPointerX = event.clientX;
			onPointerDownPointerY = event.clientY;
			onPointerDownLon = lon;
			onPointerDownLat = lat;
		}

		function onDocumentMouseMove(event) {
			if (isUserInteracting === true) {
				lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
				lat = (onPointerDownPointerY - event.clientY) * 0.1 + onPointerDownLat;
			}
		}

		function onDocumentMouseUp() {
			isUserInteracting = false;
		}

		function onDocumentMouseWheel(event) {
			event.preventDefault();
			distance += event.deltaY * 0.05;

			if (distance < minZoom) {
				distance = minZoom;
			}

			if (distance > maxZoom) {
				distance = maxZoom;
			}
		}

		var zoomQueue = []

		function doZoom(amount) {
			var queueCount = 11

			amount = -amount * 1.5

			while (queueCount--) {
				zoomQueue.push(amount)
			}

			function runZoom() {
				window.requestAnimationFrame(function () {
					if (zoomQueue.length) {
						var queueAmount = zoomQueue.shift()
						distance = distance + queueAmount

						if (distance < minZoom) {
							distance = minZoom;
						}

						if (distance > maxZoom) {
							distance = maxZoom;
						}

						runZoom()
					}
				})
			}

			runZoom()
		}

		function resize() {
			if (window.imageRenderer.isFullscreen()) {
				canvasWrapper.classList.add("fullscreen");
			} else {
				canvasWrapper.classList.remove("fullscreen");
			}

			renderer.setSize(canvasWrapper.offsetWidth, canvasWrapper.offsetHeight);
			camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
			camera.updateProjectionMatrix();
		}


		/* SETUP */

		function setImages(_img) {

			if (is3D) {
				ctxTop.canvas.width = _img.width;
				ctxTop.canvas.height = _img.height / 2;
				ctxTop.drawImage(_img, 0, 0);
				_img = ctxTop.canvas;
			}

			return _img;
		}

		function fullscreen(e) {
			window.imageRenderer.toggleFullscreen(e)
			setTimeout(function () {
				resize()
			}, 200)
		}

		function onExitFullscreen() {

		}

		var hasLoadedControls = false

		function finish(_img) {
			var i = setImages(_img);
			texture.image = i;
			texture.needsUpdate = true;
			draw();

			if (!hasLoadedControls) {
				var controlOptions = {
					fullscreen: fullscreen,
					onExitFullscreen: onExitFullscreen,
					zoom: doZoom
				}

				window.imageRenderer.createControls(controlOptions)
			}

			hasLoadedControls = true
		}

		function run() {
			renderer = new window.THREE.WebGLRenderer({ antialiasing: false, preserveDrawingBuffer: true });
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(canvasWrapper.offsetWidth, canvasWrapper.offsetHeight);
			canvasWrapper.appendChild(renderer.domElement);
			renderer.domElement.preserveDrawingBuffer = true;
			renderer.domElement.id = "viewer-canvas";
			renderer.domElement.setAttribute("type", "360");

			scene = new window.THREE.Scene();

			camera = new window.THREE.PerspectiveCamera(zoom, canvasWrapper.offsetWidth / canvasWrapper.offsetHeight, 1, 2000);
			camera.layers.enable(1); // render left view when no stereo available
			camera.target = new window.THREE.Vector3(0, 0, 0);
			camera.lookAt(camera.target);
			camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
			camera.updateProjectionMatrix();

			// Allows VR devices to control view
			// There seems to be some conflict with these controls, commenting out for now
			if (canDoVR) {
				controls = new window.THREE.DeviceOrientationControls(camera);
			}

			var geometry = new window.THREE.SphereGeometry(100, 100, 40);
			geometry.applyMatrix(new window.THREE.Matrix4().makeScale(-1, 1, 1));
			geometry.applyMatrix(new window.THREE.Matrix4().makeRotationY(-Math.PI / 2));

			texture = new window.THREE.Texture();
			texture.format = 1022;

			material = new window.THREE.MeshBasicMaterial({ transparent: true, map: texture });
			var mesh = new window.THREE.Mesh(geometry, material);
			scene.add(mesh);

			animate();

			window.imageRenderer.initImages(function (_img) {

				originalImage = _img
				finish(_img);
				resolve();
			}, function (_img) {
				finish(_img);
			}, reject)


			canvasWrapper.addEventListener("mousedown", onDocumentMouseDown, false);
			canvasWrapper.addEventListener("mousemove", onDocumentMouseMove, false);
			window.document.addEventListener("mouseup", onDocumentMouseUp, false);
			window.addEventListener("resize", resize, true);
		}

		if (window.navigator.getVRDisplays) {
			try {
				window.navigator.getVRDisplays().then(function (displays) {
					if (displays.length > 0) {
						var vrDisplay = displays[0];
						canDoVR = vrDisplay.capabilities.canPresent;

						if (canDoVR) {
							window.imageRenderer.passToMethod(data, "renderVr");
							return resolve()
						}
					}

					run();
				}, function () {
					run()
				});
			} catch (e) {
				run();
			}
		} else {
			run();
		}
	});
};