import * as pdfjs from '../../assets/app/pdfjs-modern/build/pdf.mjs';

import { extractImage } from './pdfjs-image-extractor.mjs';

const base = new URL(
    '../../assets/app/pdfjs-modern/',
    import.meta.url
).href;

pdfjs.GlobalWorkerOptions.workerSrc =
    base + 'build/pdf.worker.mjs';

window.__comicbedPdfjs = {
    version: pdfjs.version,

    extractImage(page) {
        return extractImage(page, pdfjs);
    },

    getDocument(options) {
        return pdfjs.getDocument({
            cMapUrl: base + 'cmaps/',
            cMapPacked: true,
            standardFontDataUrl: base + 'standard_fonts/',
            wasmUrl: base + 'wasm/',
            iccUrl: base + 'iccs/',
            ...options
        });
    }
};
