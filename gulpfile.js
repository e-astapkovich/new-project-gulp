const { src, dest, series, parallel, watch } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const notify = require('gulp-notify');
const sourcemap = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const browserSync = require('browser-sync').create();
const fileinclude = require('gulp-file-include');
const svgmin = require('gulp-svgmin');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const tinypng = require('gulp-tinypng-compress');
const typograf = require('gulp-typograf');

const srcFolder = './src';
const buildFolder = './dist';
const paths = {
  srcScss: `${srcFolder}/scss/**/*.scss`,
  srcImgFolder: `${srcFolder}/img`,
  srcSvg: `${srcFolder}/img/svg-for-sprite/*.svg`,
  srcFontsFolder: `${srcFolder}/fonts`,
  srcFontsScss: `${srcFolder}/scss/_fonts.scss`,
  srcPartialsFolder: `${srcFolder}/partials`,
  buildCssFolder: `${buildFolder}/css`,
  buildImgFolder: `${buildFolder}/img`,
  buildFontsFolder: `${buildFolder}/fonts`,
};

const delDirDist = (done) => {
  if (fs.existsSync(buildFolder)) {
    fs.rmdirSync(buildFolder, { recursive: true, force: true })
  }
  done();
}

// Обработка SCSS
const styles = () => {
  return src(paths.srcScss, { sourcemaps: true })
    .pipe(sourcemap.init())
    .pipe(sass({
      outputStyle: 'expanded'
    })
      .on('error', notify.onError()))
    .pipe(autoprefixer({
      cascade: false
    }))
    .pipe(sourcemap.write('.'))
    .pipe(dest(paths.buildCssFolder))
    .pipe(browserSync.stream())
};

const stylesBuild = () => {
  return src(paths.srcScss)
    .pipe(sass({
      outputStyle: 'expanded'
    }).on('error', notify.onError()))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(autoprefixer({
      cascade: false
    }))
    .pipe(cleanCSS({
      level: 2
    }))
    .pipe(dest(paths.buildCssFolder))
};

// Объединение html-частей и типограф
const htmlInclude = () => {
  return src(`${srcFolder}/*.html`)
    .pipe(fileinclude({
      prefix: '@',
      basepath: '@file'
    }))
    .pipe(typograf({
      locale: ['ru', 'en-US']
    }))
    .pipe(dest(buildFolder))
    .pipe(browserSync.stream());
};

// Перемещение изображений без сжатия
const imgToApp = () => {
  return src(`${paths.srcImgFolder}/*.{jpg, jpeg, png}`)
    .pipe(dest(paths.buildImgFolder));
}

// Перемещение и сжатие SVG-изображений
const svgToApp = () => {
  return src(`${paths.srcImgFolder}/*.svg`)
    .pipe(
      svgmin({
        js2svg: {
          pretty: true,
        },
      })
    )
    .pipe(dest(paths.buildImgFolder));
}

// Преобразование SVG-изображений в спрайты
const svgToSprite = () => {
  return src(paths.srcSvg)
    .pipe(
      svgmin({
        js2svg: {
          pretty: true,
        },
      })
    )
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: "../sprite.svg"
          }
        },
      }))
    .pipe(dest(paths.buildImgFolder));
}

// Сжатие изображений
const imgCompress = () => {
  return src(`${paths.srcImgFolder}/*.{jpg, jpeg, png}`)
    .pipe(tinypng({
      key: 'GkvR94BWvvGD9tc4WP0zHM64P1fdDlJb',
      parallel: true,
      parallelMax: 50
    }))
    .pipe(dest(paths.buildImgFolder))
}

// Конвертация шрифтов из TTF в WOFF и WOFF2
const fontsConvert = () => {
  src(`${paths.srcFontsFolder}/*.ttf`)
    .pipe(ttf2woff())
    .pipe(dest(paths.buildFontsFolder))
  return src(`${paths.srcFontsFolder}/*.ttf`)
    .pipe(ttf2woff2())
    .pipe(dest(paths.buildFontsFolder))
}

const fontsWoffMove = () => {
  src(`${paths.srcFontsFolder}/*.woff`)
    .pipe(dest(paths.buildFontsFolder))
  return src(`${paths.srcFontsFolder}/*.woff2`)
    .pipe(dest(paths.buildFontsFolder))
}

// Создание миксина для @font-face
const fontStyle = (done) => {
  const weights = {
    'thin': 100,
    'extralight': 200,
    'light': 300,
    'normal': 400,
    'regular': 400,
    'medium': 500,
    'semibold': 600,
    'bold': 700,
    'extrabold': 800,
    'black': 900,
  };
  fs.writeFileSync(paths.srcFontsScss, '');
  fs.readdir(paths.buildFontsFolder, function (err, items) {
    if (items) {
      let c_fontName;
      for (var i = 0; i < items.length; i++) {
        let fontName = items[i].split('.')[0];
        if (c_fontName != fontName) {
          let fontFamily = fontName.split('-')[0];
          let fontWeightWord = fontName.split('-')[1].toLowerCase();
          let fontWeightNumber = weights[fontWeightWord];
          let fontStyle = fontName.split('-')[2] ? fontName.split('-')[2] : 'normal';
          fs.appendFileSync(paths.srcFontsScss, `@include font("${fontFamily}", ${fontWeightNumber}, ${fontStyle}, "${fontName}");\r\n`);
        }
        c_fontName = fontName;
      }
    }
  })
  done();
}

const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: buildFolder
    }
  });

  watch(paths.srcScss, styles);
  watch(`${srcFolder}/**/*.html`, htmlInclude);
  watch(`${paths.srcImgFolder}/**/*.{ jpg, jpeg, png }`, imgToApp);
  watch(`${paths.srcImgFolder}/**/*.svg`, svgToApp);
  watch(paths.srcSvg, svgToSprite);
  watch(`${paths.srcFontsFolder}/*.ttf`, fontsConvert);
  watch(paths.buildFontsFolder, fontStyle);
};

// map-файлы, картинки без сжатия
exports.default = series(delDirDist, parallel(htmlInclude, fontsConvert, imgToApp, svgToApp, svgToSprite), fontsWoffMove, fontStyle, styles, watchFiles);
// exports.default = series(delDirDist, htmlInclude, fontsConvert, imgToApp, svgToApp, svgToSprite, fontsWoffMove, fontStyle, styles, watchFiles);

// без map-файлов, картинки сжимаются Tinypng
exports.build = series(delDirDist, parallel(htmlInclude, fontsConvert, svgToApp, svgToSprite), fontsWoffMove, fontStyle, stylesBuild, imgCompress);
// exports.build = series(delDirDist, htmlInclude, fontsConvert, svgToApp, svgToSprite, fontsWoffMove, fontStyle, stylesBuild, imgCompress);

// TODO минифицированная версия
// без map-файлов, картинки сжимаются Tinypng, HTML и CSS минифицируются
// exports.buildmin = series()
