'use strict';
var gulp = require('gulp');
var minifyCSS = require('gulp-minify-css');
var plugins = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();

/* BROWSER SYNC
* Starts bower server
*/

gulp.task('browser-sync', function () {
	browserSync.init({
		server: {
			baseDir: "./dist"
		},
		https: true
	});
});


var styles = ["src/css/*.css"]
gulp.task('css', css);

function css() {
	gulp.src(styles)
		.pipe(minifyCSS())
		.pipe(plugins.autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
		.pipe(plugins.concat('image-renderer.min.css'))
		.pipe(gulp.dest('dist'))
}

var js = [
	'lib/promise.polyfill.js',
	'lib/gl-matrix-min.js',
	'lib/wglu-program.js',
	'lib/webvr-polyfill.js',
	'lib/fabric.min.js',
	'lib/three.js',
	'lib/device-controls.js',
	'lib/vr-panorama.js',
	'src/js/renderer.js',
	'src/js/renderer-vr.js',
	'src/js/renderer-360.js',
	'src/js/renderer-flat.js',
	'src/js/cropper.js'
]

gulp.task('js', function () {
	return gulp.src(js)
		.pipe(plugins.sourcemaps.init())
		.pipe(plugins.concat('image-renderer.min.js'))
		.pipe(gulp.dest('dist'))
		.pipe(plugins.sourcemaps.write('./'))
		.pipe(gulp.dest('dist'))
});


gulp.task("moveToBuild", moveToBuild)

var buildFiles = [
	"src/index.html",
	"src/img/**"
]
function moveToBuild() {
	gulp.src(buildFiles, { base: './src/' }).pipe(gulp.dest('dist'));
}


gulp.task('live', function () {
	plugins.livereload.listen();
	gulp.watch(styles, ['css']);
	gulp.watch(js, ['js']);
	gulp.watch(buildFiles, ['moveToBuild']);
});

gulp.task('default', [
	'js',
	'css',
	"moveToBuild",
	'browser-sync',
	'live'
], function () { });