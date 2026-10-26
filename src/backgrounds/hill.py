#makes hill.webp and ridge.json from the cc0 commons photo
#clouds above cattle hill, roedean (february 2011) by hassocks5489, sha1 b79d79e2a1b557472f8c3ee7412e9e13f6c4a5c3
#usage: py -3 hill.py <photo.jpg> hill.webp ridge.json [preview.jpg], needs pillow and numpy
import sys
from PIL import Image
import numpy as np
src, out, ridge_out = sys.argv[1:4]
preview = sys.argv[4] if len(sys.argv) > 4 else None
a = np.asarray(Image.open(src).convert('RGB')).astype(float)
h, w, _ = a.shape

def ridge_of(img):
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    grassy = (g - (r + b) / 2) > 6
    run = np.ones_like(grassy)
    for k in range(10):
        run[:h - k] &= grassy[k:]
    start = int(h * 0.3)
    ridge = np.array([start + np.argmax(run[start:, x]) for x in range(w)], float)
    xs = np.arange(w)
    keep = np.ones(w, bool)
    for _ in range(6):
        coef = np.polyfit(xs[keep], ridge[keep], 5)
        fit = np.polyval(coef, xs)
        resid = ridge - fit
        keep = np.abs(resid) < max(4, 2.5 * np.std(resid[keep]))
    return fit

ridge = ridge_of(a)

#fence: replace the band under the ridge with grass from below
xs = np.arange(w)
band = np.clip(95 - 0.05 * xs, 0, None)
band[xs > 1550] = 0
for x in range(w):
    d = int(band[x])
    if d <= 0: continue
    y0 = int(ridge[x]) - 2
    feather = 24
    for y in range(y0, min(h, y0 + d + feather)):
        sy = y + d + 8
        if sy >= h: break
        t = 1.0 if y < y0 + d else 1 - (y - y0 - d) / feather
        a[y, x] = a[sy, x] * t + a[y, x] * (1 - t)

#shadow in the bottom right: clone grass from the left
cy, cx, rad = 1650, 2250, 150
yy, xx = np.mgrid[0:h, 0:w]
dist = np.hypot(yy - cy, xx - cx)
blend = np.clip((rad - dist) / 60, 0, 1)[..., None]
shifted = np.roll(a, 420, axis=1)
a = shifted * blend + a * (1 - blend)

#bare earth: fill from grass to the side
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.3 * r + 0.59 * g + 0.11 * b
earth = ((g - (r + b) / 2) < 8) & (lum < 95) & (np.arange(h)[:, None] > ridge[None, :] + 12)
from PIL import ImageFilter
soft = np.asarray(Image.fromarray((earth * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4))) / 255
soft = soft[..., None]
a = np.roll(a, 60, axis=1) * soft + a * (1 - soft)
print('earth pixels', int(earth.sum()))

#non-green pixels hugging the ridge are leftover sky
r, g, b = a[..., 0], a[..., 1], a[..., 2]
near = (np.arange(h)[:, None] < ridge[None, :] + 20)
leftover = near & ((g - (r + b) / 2) < 5)

#mirror, so the ridge peaks on the left and falls to the right like bliss
a = a[:, ::-1]
ridge = ridge[::-1]
leftover = leftover[:, ::-1]

#colour match the grass to bliss: mean and spread per channel in lab
def to_lab(rgb):
    c = rgb / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def from_lab(lab):
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1, 1.08883])
    m = np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]])
    c = xyz @ m.T
    c = np.where(c > 0.0031308, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(c * 255, 0, 255)

#a distant hill: soften the close up grass, more towards the ridge
from PIL import ImageFilter
near_blur = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
far_blur = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float)
depth = np.clip((np.arange(h)[:, None] - ridge[None, :]) / (h - ridge.min()), 0, 1)[..., None]
a = far_blur * (1 - depth) + near_blur * depth

#bliss's mean grass colour in lab, measured once; its lighting is added below
rmean = np.array([38.8, -21.8, 36.9])
lab = to_lab(a)
below = (np.arange(h)[:, None] > ridge[None, :] + 4)
mean = lab[below].mean(0)
lab = lab - mean + rmean

#bliss's light: bright along the ridge and left, darker in front
across = np.linspace(1, -1, w)[None, :]
down = depth[..., 0]
lab[..., 0] += 9 * (1 - down) - 7 * down + 4 * across
#restore colour lost to softening, greener where sunlit
lab[..., 1] = rmean[1] + (lab[..., 1] - rmean[1]) * 1.2 - 5 * (1 - down)
lab[..., 2] = rmean[2] + (lab[..., 2] - rmean[2]) * 1.2 + 4 * (1 - down)
a = from_lab(lab)
print('grass lab before', mean.round(1), 'after', rmean.round(1))

#cut out along the ridge, a little into the grass, with a soft edge
edge = ridge + 6
top = int(edge.min()) - 4
alpha = np.clip((np.arange(h)[:, None] - (edge[None, :] - 2)) / 3, 0, 1) * 255
alpha[leftover] = 0
rgba = np.dstack([a, alpha]).astype(np.uint8)
hill = Image.fromarray(rgba, 'RGBA').crop((0, top, w, h))
hill.save(out, 'WEBP', quality=80, method=6)
print('hill', hill.size, 'ridge rows', int(edge.min() - top), 'to', int(edge.max() - top))
#ridge outline for clipping cloud shadows
import json
points = [[round(x / (w - 1), 4), round((edge[x] - top) / hill.size[1], 4)] for x in range(0, w, w // 48)] + [[1, round((edge[-1] - top) / hill.size[1], 4)]]
open(ridge_out, 'w').write(json.dumps(points) + '\n')
if preview:
    sky = Image.new('RGBA', hill.size, (78, 132, 241, 255))
    sky.alpha_composite(hill)
    sky.convert('RGB').save(preview, quality=90)
