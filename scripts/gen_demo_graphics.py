import os, struct, zlib, math

def _chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))

def make_png(data, width, height):
    raw = b''.join(b'\x00' + bytes(row) for row in data)
    return b'\x89PNG\r\n\x1a\n' + _chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0)) + _chunk(b'IDAT', zlib.compress(raw)) + _chunk(b'IEND', b'')

def save_png(path, data):
    height = len(data)
    width = len(data[0])
    with open(path, 'wb') as f:
        f.write(make_png(data, width, height))

def diag_frame(rows=12, cols=15):
    d = [[0]*cols for _ in range(rows)]
    for i in range(min(rows, cols)):
        for j in range(3):
            r = i
            c = i+j
            if r < rows and c < cols:
                d[r][c] = 255
    return d

def circle_path(size=200, radius=60, points=80):
    d = [[0]*size for _ in range(size)]
    cx=cy=size//2
    for i in range(points):
        angle=2*math.pi*i/points
        x=int(cx+radius*math.cos(angle))
        y=int(cy+radius*math.sin(angle))
        if 0<=x<size and 0<=y<size:
            d[y][x]=255
    return d

def solid_gray(size=200, level=200):
    return [[level]*size for _ in range(size)]

if __name__ == '__main__':
    os.makedirs('mock-data', exist_ok=True)
    save_png('mock-data/demo_heatmap.png', diag_frame())
    save_png('mock-data/demo_cop.png', circle_path())
    save_png('mock-data/cadence_hist.png', solid_gray(200))
    save_png('mock-data/symmetry_hist.png', solid_gray(200))
    save_png('mock-data/sway_hist.png', solid_gray(200))
