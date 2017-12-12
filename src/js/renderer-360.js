window.imageRenderer.methods.render360 = function (data) {
	return new Promise(function (resolve) {
		var imageItem = data.image;
		var previewItem = data.preview;
		var is3D = data["3D"];
		var canvasWrapper = data.element;
		canvasWrapper.style.height = "100%";
		canvasWrapper.style.width = "100%";
		canvasWrapper.innerHTML = "";

		var minZoom = 5, maxZoom = 100, zoom = 40, distance = 50,
			lon = 0, lat = 0, phi = 0, theta = 0, // Pan / tilt settings
			renderer = null, scene = null, camera = null, texture = null, material = null, controls = null, // Three elements
			isUserInteracting,

			img = null,
			ctxTop = window.document.createElement("canvas").getContext("2d"), // for 3d photospheres

			onPointerDownPointerX = 0,
			onPointerDownPointerY = 0,
			onPointerDownLon = 0,
			onPointerDownLat = 0,

			canDoVR = false,
			animationFrame = null,

			vrButton, fullscreenButton;

		/* RENDER METHODS */

		function draw() {
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
				window.imageRenderer.stats.x !== lon ||
				window.imageRenderer.stats.y !== lat ||
				window.imageRenderer.stats.z !== distance ||
				window.imageRenderer.stats.viewWidth !== canvasWrapper.offsetWidth * window.devicePixelRatio ||
				window.imageRenderer.stats.viewHeight !== canvasWrapper.offsetHeight * window.devicePixelRatio
			) {
				window.imageRenderer.stats.x = lon;
				window.imageRenderer.stats.y = lat;
				window.imageRenderer.stats.z = distance;
				window.imageRenderer.stats.viewWidth = window.imageRenderer.stats.renderWidth = canvasWrapper.offsetWidth * window.devicePixelRatio;
				window.imageRenderer.stats.viewHeight = window.imageRenderer.stats.renderHeight = canvasWrapper.offsetHeight * window.devicePixelRatio;
				window.imageRenderer.stats.status = "drawing";

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

		function resize() {
			renderer.setSize(canvasWrapper.offsetWidth, canvasWrapper.offsetHeight);
			camera.aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
			camera.updateProjectionMatrix();
		}


		/* SETUP */

		function setImages(_img) {
			if (is3D) {
				ctxTop.canvas.width = _img.naturalWidth;
				ctxTop.canvas.height = _img.naturalHeight / 2;
				ctxTop.drawImage(_img, 0, 0);
				img = ctxTop.canvas;
			} else {
				img = _img;
			}

			return img;
		}

		function goVR() {
			window.cancelAnimationFrame(animationFrame);
			window.document.removeEventListener("mouseup", onDocumentMouseUp, false);
			window.removeEventListener("resize", resize, true);

			window.imageRenderer.passToMethod(data, "renderVr");
		}

		function createControlButtons() {
			var buttonWrapper = window.document.createElement("div");
			buttonWrapper.classList.add("buttonWrapper")
			canvasWrapper.appendChild(buttonWrapper);

			if (canDoVR) {
				vrButton = window.document.createElement("button");
				vrButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 86" viewBox="0 0 196.33 123.31"><path d="M194.33 14a12 12 0 0 0-12-12s-63.12-2-84.17-2-84.17 2-84.17 2a12 12 0 0 0-12 12S0 57.73 0 70.33c0 11.76 2 41 2 41a12 12 0 0 0 12 12h56.33s15.31-41.21 27.67-41c12.09.21 25.67 41 25.67 41h58.67a12 12 0 0 0 12-12s2-36.48 2-48.65S194.33 14 194.33 14zM46.67 86.66A28.33 28.33 0 1 1 75 58.33a28.33 28.33 0 0 1-28.33 28.33zm102 0A28.33 28.33 0 1 1 177 58.33a28.33 28.33 0 0 1-28.33 28.33z"/></svg>';
				vrButton.addEventListener('click', goVR, false);
				buttonWrapper.appendChild(vrButton);
			}


			fullscreenButton = window.document.createElement("button");
			fullscreenButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" data-name="Layer 59" viewBox="0 0 193.57 193.57"><path d="M69.2.04q.06 13.21.12 26.43c0 1.05-.49 1.49-1.48 1.5H30.66c-2.59 0-2.64 0-2.64 2.64v35.88c0 2.8 0 2.81-2.84 2.8L.04 69.16V1.6C.04.24.32-.04 1.68-.04Q35.42.08 69.2.04zM193.54 69.16q-13.21.06-26.43.12c-1.05 0-1.49-.49-1.5-1.48v-1.89V30.6c0-2.59 0-2.64-2.64-2.64h-35.91c-2.8 0-2.81 0-2.8-2.84q0-12.55.12-25.11h67.65c1.29 0 1.55.25 1.55 1.55q-.08 33.81-.04 67.6zM.04 124.38q13.21-.06 26.43-.12c1.05 0 1.49.49 1.5 1.48v37.2c0 2.59 0 2.64 2.64 2.64h35.91c2.8 0 2.81 0 2.8 2.84q0 12.55-.12 25.11H1.55c-1.29 0-1.55-.25-1.55-1.55q.08-33.82.04-67.6zM124.38 193.54q-.06-13.21-.12-26.43c0-1.05.49-1.49 1.48-1.5h37.2c2.59 0 2.64 0 2.64-2.64v-35.88c0-2.8 0-2.81 2.84-2.8l25.11.12v67.65c0 1.29-.25 1.55-1.55 1.55q-33.78-.11-67.6-.07z"></path></svg>';
			fullscreenButton.addEventListener('click', window.imageRenderer.toggleFullscreen, false);
			buttonWrapper.appendChild(fullscreenButton);
		}

		function respond() {
			createControlButtons();

			resolve();
		}

		function finish(_img) {
			var i = setImages(_img);
			texture.image = i;
			texture.needsUpdate = true;
			draw();
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

			respond();

			var progressBar = window.document.createElement("div");
			progressBar.classList.add("renderer-progressbar");
			canvasWrapper.appendChild(progressBar);

			function loadMain() {
				window.imageRenderer.loadImage(imageItem, function (mainimg) {
					window.imageRenderer.stats.imageProgress = 100;
					progressBar.style.opacity = 0;

					setTimeout(function () {
						canvasWrapper.removeChild(progressBar);
					}, 600);

					finish(mainimg);

				}, function (prog) {
					window.imageRenderer.stats.imageProgress = prog;
					progressBar.style.width = prog + "%";
					window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
				});
			}



			function loadPreview() {
				window.imageRenderer.loadImage(previewItem, function (previmg) {
					window.imageRenderer.stats.previewProgress = 100;
					finish(previmg);
					loadMain();

				}, function (prog) {
					window.imageRenderer.stats.previewProgress = prog;
					window.imageRenderer.trigger("statsUpdate", window.imageRenderer.stats);
				}, function () {
					loadMain();
				});
			}

			if (previewItem) {
				loadPreview();
			} else {
				loadMain();
			}


			canvasWrapper.addEventListener("mousedown", onDocumentMouseDown, false);
			canvasWrapper.addEventListener("mousemove", onDocumentMouseMove, false);
			canvasWrapper.addEventListener("wheel", onDocumentMouseWheel, false);

			window.document.addEventListener("mouseup", onDocumentMouseUp, false);
			window.addEventListener("resize", resize, true);
		}

		if (window.navigator.getVRDisplays) {
			try {
				window.navigator.getVRDisplays().then(function (displays) {
					if (displays.length > 0) {
						var vrDisplay = displays[0];
						canDoVR = vrDisplay.capabilities.canPresent;
					}

					if (!canDoVR) {
						vrButton.style.display = "none";
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