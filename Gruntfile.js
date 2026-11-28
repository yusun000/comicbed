module.exports = function(grunt) {
  'use strict';

  var typescriptSources = 'app/**/*.ts';

  // MIME types required by modern PDF.js.
  require('mime').define({
    'text/javascript': ['mjs'],
    'application/wasm': ['wasm']
  });

  // plugins
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-exec");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-handlebars");
  grunt.loadNpmTasks("grunt-contrib-requirejs");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-manifest");
  // Compile with the pinned TypeScript compiler.
  // Unlike grunt-typescript, propagate compiler failures.
  grunt.registerTask('typescript', 'Compile TypeScript', function() {
    var compiler = require.resolve('typescript/bin/tsc.js');

    var args = [
      compiler,
      '--module', 'amd',
      '--target', 'ES3',
      '--sourcemap',
      '--noImplicitAny'
    ].concat(grunt.file.expand(typescriptSources).sort());

    var result = require('child_process').spawnSync(
      process.execPath,
      args,
      { stdio: 'inherit' }
    );

    if (result.error) {
      grunt.fail.warn(result.error.message);
    }

    if (result.status !== 0) {
      grunt.fail.warn(
        'TypeScript compilation failed: ' + result.status
      );
    }
  });
  grunt.loadNpmTasks("grunt-preprocess");
  // tasks
  grunt.registerTask('default', [
    'connect:debug',
    'typescript',
    'handlebars',
    'watch'
  ]);
  grunt.registerTask('build', [
    'typescript',
    'handlebars',
    'copy',
    'cssmin',
    'preprocess',
    'uglify',
    'requirejs',
    // 'manifest',
    'connect:release'
  ]);
  grunt.registerTask('server:release', ['connect:release']);
  grunt.registerTask('test:browser', [
    'typescript',
    'handlebars',
    'connect:debug:keepalive'
  ]);
  // config
  grunt.initConfig({
    clean: {
      generated: [
        'dist',
        'app/**/*.js',
        'app/**/*.js.map',
        '!app/models/pdfjs_bridge.js'
      ]
    },
    connect: {
      debug: {
        options: {
          port: 9000,
          base: '.',
          keepalive: false
        }
      },
      release: {
        options: {
          port: 9001,
          base: 'dist/',
          keepalive: true
        }
      }
    },
    preprocess: {
      release: {
        src: ['dist/index.html', 'app/utils/logger.js'],
        options: {
          inline: true,
          context: {}
        }
      }
    },
    copy: {
      release: {
        files: [
          {
            src: [
              'index.html',
              'assets/app/pdfjs-modern/**/*',
              'app/models/pdfjs-loader.mjs',
              'app/models/pdfjs-image-extractor.mjs',
              'assets/app/tiff/js/tiff.min.js',
              'assets/app/css/images/*',
            ],
            dest: 'dist/',
            expand: true
          }, {
            cwd: 'assets/app/jquery-mobile/css/images/',
            src: [
              'ajax-loader.gif',
              '*/delete-white.*',
              '*/info-white.*',
              '*/gear-white.*',
            ],
            dest: 'dist/assets/app/css/images',
            expand: true,
          }
        ]
      }
    },
    handlebars: {
      compile: {
        options: {
          namespace: "JST",
          amd: true,
          processName: function(filepath) {
            var fileName = filepath.substring(filepath.lastIndexOf('/') + 1);
            return fileName.substring(0, fileName.indexOf('.'));
          }
        },
        files: {
          "app/templates.js": "app/templates/**/*.html"
        }
      }
    },
    requirejs: {
      compile: {
        options: {
          baseUrl: 'app',
          mainConfigFile: "app/config.js",
          out: "dist/app/main.js",
          name: 'main',
          wrap: false,
          findNestedDependencies: true
        }
      },
      pdf_unarchiver: {
        options: {
          baseUrl: 'app',
          mainConfigFile: "app/config.js",
          out: "dist/app/models/pdf_unarchiver.js",
          name: 'models/pdf_unarchiver',
          wrap: false
        }
      },
      zip_unarchiver: {
        options: {
          baseUrl: 'app',
          mainConfigFile: "app/config.js",
          out: "dist/app/models/zip_unarchiver.js",
          name: 'models/zip_unarchiver',
          wrap: false
        }
      },
      rar_unarchiver: {
        options: {
          baseUrl: 'app',
          mainConfigFile: "app/config.js",
          out: "dist/app/models/rar_unarchiver.js",
          name: 'models/rar_unarchiver',
          wrap: false
        }
      }
    },
    cssmin: {
      release: {
        files: {
          'dist/assets/app/css/comicbed.css': [
            'assets/app/css/comicbed.css',
            'assets/vendor/bootstrap-progressbar/css/bootstrap-progressbar-3.0.0-rc2.min.css',
            'assets/app/jquery-mobile/css/jquery.mobile-1.4.0-rc.1.min.css'
          ]
        }
      }
    },
    uglify: {
      release: {
        files: {
          "dist/assets/vendor/requirejs/js/require.js": [
            "assets/vendor/requirejs/js/require.js"
          ]
        }
      }
    },
    watch: {
      typescript: {
        files: [typescriptSources],
        tasks: ['typescript'],
        options: {
          livereload: true
        }
      },
      templates: {
        files: 'app/templates/**/*.html',
        tasks: ['handlebars'],
        options: {
          livereload: true
        }
      }
    },
    manifest: {
      generate: {
        options: {
          basePath: 'dist/',
          network: ['*'],
          fallback: [],
          exclude: [],
          preferOnline: true,
          timestamp: true,
        },
        src: [
          'index.html',
          'app/main.js',
          'assets/vendor/requirejs/js/require.js',
          'assets/app/css/comicbed.css',
          'assets/app/css/images/ajax-loader.gif',
          'assets/app/css/images/*.png'
        ],
        dest: 'dist/manifest.appcache'
      }
    }
  });
};
