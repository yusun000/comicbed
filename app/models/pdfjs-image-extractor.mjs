const SUPPORTED_VERSION = '6.5.438';

// Enable PDF diagnostics with ?pdfDebug=true.
const pdfDebug = new URLSearchParams(
    window.location.search
).get('pdfDebug') === 'true';

async function getImageObject(page, id) {
    const deadline = performance.now() + 1000;

    while (performance.now() < deadline) {
        for (const store of [page.objs, page.commonObjs]) {
            if (store && store.has(id)) {
                return store.get(id);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null;
}

// PDF.js 6.5.438 internal path representation.
function isFullPageClip(args, view, ops) {
    if (!args || args.length !== 3 ||
        args[0] !== ops.endPath ||
        !args[1] || args[1].length !== 1 ||
        !args[2] || args[2].length !== 4) {
        return false;
    }

    const [x0, y0, x1, y1] = view;

    const near = (a, b) =>
        Math.abs(a - b) < 0.0001;

    const bounds = Array.from(args[2]);

    if (!bounds.every((v, i) => near(v, view[i]))) {
        return false;
    }

    const path = Array.from(args[1][0]);

    const expected = [
        0, x0, y0,
        1, x1, y0,
        1, x1, y1,
        1, x0, y1,
        4
    ];

    return path.length === expected.length &&
        path.every((v, i) => near(v, expected[i]));
}

export async function extractImage(page, pdfjs) {

    function debug(reason, details) {
        if (pdfDebug && page.pageNumber <= 3) {
            console.log(
                '[XObject]', page.pageNumber,
                reason, details
            );
        }
    }

    function fallback(reason, details) {
        debug(reason, details);
        return null;
    }


    // Internal object access is version-dependent.
    if (pdfjs.version !== SUPPORTED_VERSION) {
        return fallback('version', pdfjs.version);
    }

    if (page.rotate !== 0) {
        return fallback('rotation', page.rotate);
    }

    const list = await page.getOperatorList();
    const ops = pdfjs.OPS;

    if (pdfDebug && page.pageNumber <= 3) {
        const names = Object.fromEntries(
            Object.entries(ops).map(([k, v]) => [v, k])
        );

        debug('operators', list.fnArray.map(
            op => names[op] || op
        ).join(', '));

        debug('page view', JSON.stringify(page.view));

        for (let i = 0; i < list.fnArray.length; i++) {
            const op = list.fnArray[i];

            if (op === ops.transform ||
                op === ops.paintImageXObject ||
                op === ops.clip ||
                op === ops.constructPath ||
                op === ops.setRenderingIntent) {
                debug(
                    names[op],
                    JSON.stringify(list.argsArray[i])
                );
            }
        }
    }

    const patterns = [
        [
            ops.save,
            ops.transform,
            ops.dependency,
            ops.paintImageXObject,
            ops.restore
        ],
        [
            ops.save,
            ops.restore,
            ops.save,
            ops.setRenderingIntent,
            ops.save,
            ops.transform,
            ops.dependency,
            ops.paintImageXObject,
            ops.restore,
            ops.restore
        ]
    ];

    patterns.push([
        ops.save,
        ops.restore,
        ops.save,
        ops.clip,
        ops.constructPath,
        ops.setRenderingIntent,
        ops.save,
        ops.transform,
        ops.dependency,
        ops.paintImageXObject,
        ops.restore,
        ops.restore
    ]);

    const matched = patterns.some(pattern =>
        pattern.length === list.fnArray.length &&
        pattern.every((op, i) => op === list.fnArray[i])
    );

    if (!matched) {
        return fallback('unsupported operators',
                        list.fnArray.length);
    }

    const transformIndex =
        list.fnArray.indexOf(ops.transform);

    const imageIndex =
        list.fnArray.indexOf(ops.paintImageXObject);

    const matrix = list.argsArray[transformIndex];
    const view = page.view;

    if (!matrix || matrix.length !== 6 ||
        !view || view.length !== 4) {
        return null;
    }

    const clipIndex = list.fnArray.indexOf(ops.clip);

    if (clipIndex !== -1) {
        const pathIndex =
            list.fnArray.indexOf(ops.constructPath);

        if (pathIndex !== clipIndex + 1 ||
            !isFullPageClip(
                list.argsArray[pathIndex], view, ops
            )) {
            return fallback('unsupported clipping');
        }

        debug('full page clipping accepted');
    }

    const [a, b, c, d, e, f] = matrix;

    const width = view[2] - view[0];
    const height = view[3] - view[1];

    const near = (x, y) =>
        Math.abs(x - y) < 0.0001;

    // Reject rotated, mirrored, cropped or partial images.
    if (a <= 0 || d <= 0 ||
        !near(b, 0) || !near(c, 0) ||
        !near(a, width) || !near(d, height) ||
        !near(e, view[0]) || !near(f, view[1])) {
        return fallback('image placement', JSON.stringify(matrix));
    }

    const id = list.argsArray[imageIndex][0];
    const image = await getImageObject(page, id);

    if (!image || !image.bitmap ||
        !image.width || !image.height) {
        return fallback('image format', image ? Object.keys(image).join(', ') : 'unavailable');
    }

    // PDF.js may use VideoFrame for native JPEG decoding.
    const bitmap = image.bitmap;

    const isVideoFrame =
        typeof VideoFrame !== 'undefined' &&
        bitmap instanceof VideoFrame;

    const bitmapWidth = isVideoFrame
        ? bitmap.displayWidth
        : bitmap.width;

    const bitmapHeight = isVideoFrame
        ? bitmap.displayHeight
        : bitmap.height;

    if (bitmapWidth !== image.width ||
        bitmapHeight !== image.height) {
        return fallback('bitmap dimensions', JSON.stringify({
            imageWidth: image.width,
            imageHeight: image.height,
            bitmapWidth: image.bitmap.width,
            bitmapHeight: image.bitmap.height,
            bitmapType: Object.prototype.toString.call(image.bitmap),
            displayWidth: image.bitmap.displayWidth,
            displayHeight: image.bitmap.displayHeight,
            codedWidth: image.bitmap.codedWidth,
            codedHeight: image.bitmap.codedHeight,
            imageKeys: Object.keys(image),
            operatorArgs: list.argsArray[imageIndex]
        }));
    }

    const pageRatio = width / height;
    const imageRatio = image.width / image.height;

    if (Math.abs(pageRatio / imageRatio - 1) >= 0.005) {
        return fallback('aspect ratio', {
            page: pageRatio,
            image: imageRatio,
            width: image.width,
            height: image.height
        });
    }

    // Preserve annotations by falling back to normal rendering.
    const annotations = await page.getAnnotations({
        intent: 'display'
    });

    if (annotations.length !== 0) {
        return fallback('annotations', annotations.length);
    }

    const canvas = document.createElement('canvas');

    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext('2d');

    if (!context) {
        return null;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image.bitmap, 0, 0);

    return canvas;
}
