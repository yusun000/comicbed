define(['promise'], function (Promise) {
    'use strict';

    var loading = null;

    function load() {
        if (loading) {
            return loading;
        }

        loading = new Promise(function (resolve, reject) {
            if (window.__comicbedPdfjs) {
                resolve(window.__comicbedPdfjs);
                return;
            }

            var script = document.createElement('script');

            script.type = 'module';
            script.src = 'app/models/pdfjs-loader.mjs';

            script.onload = function () {
                if (window.__comicbedPdfjs) {
                    resolve(window.__comicbedPdfjs);
                } else {
                    reject(new Error(
                        'PDF.js module did not initialize'
                    ));
                }
            };

            script.onerror = function () {
                reject(new Error(
                    'Failed to load PDF.js module'
                ));
            };

            document.head.appendChild(script);
        });

        loading = loading.catch(function (error) {
            loading = null;
            throw error;
        });

        return loading;
    }

    return {
        load: load
    };
});
