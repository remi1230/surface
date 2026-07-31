/**
 * Rendu du maillage.
 *
 * Pas de tampon de sommets : la passe de calcul a deja tout ecrit dans un
 * tampon de stockage, et le vertex shader y lit directement par
 * `vertex_index`. Le maillage n'existe nulle part ailleurs que sur le GPU.
 *
 * Double face assumee, comme dans le projet d'origine : ces surfaces
 * s'auto-intersectent et on veut les voir de dessous.
 */

import type { Mat4 } from '../math/mat4';

const SHADER = /* wgsl */ `
struct Camera {
  viewProj : mat4x4<f32>,
  eye      : vec4<f32>,
};

struct Vertex {
  pos        : vec3<f32>,
  area       : f32,
  nrm        : vec3<f32>,
  degenerate : f32,
  tu         : vec3<f32>,
  _pad1      : f32,
  tv         : vec3<f32>,
  _pad2      : f32,
};

@group(0) @binding(0) var<uniform> cam : Camera;
@group(0) @binding(1) var<storage, read> verts : array<Vertex>;

struct VSOut {
  @builtin(position) clip : vec4<f32>,
  @location(0) worldPos : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) area : f32,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VSOut {
  let v = verts[vi];
  var o : VSOut;
  o.clip = cam.viewProj * vec4<f32>(v.pos, 1.0);
  o.worldPos = v.pos;
  o.normal = v.nrm;
  o.area = v.area;
  return o;
}

@fragment
fn fs(frag : VSOut, @builtin(front_facing) facing : bool) -> @location(0) vec4<f32> {
  var n = normalize(frag.normal);
  if (!facing) { n = -n; }
  let toEye = normalize(cam.eye.xyz - frag.worldPos);
  let lambert = max(dot(n, toEye), 0.0);
  let rim = pow(1.0 - lambert, 3.0);

  // Teinte par l'element d'aire : les zones ou la parametrisation se dilate ou
  // se pince se lisent d'un coup d'oeil. C'est la carte de terrain gratuite
  // annoncee au paragraphe 9 de la note sur le jeu de tir.
  //
  // Provisoire : l'echelle n'est pas normalisee, donc la teinte se compare a
  // l'interieur d'une forme mais pas d'une forme a l'autre. La normalisation
  // demande une reduction sur le maillage, qui arrive avec le score (phase 3).
  let dist = clamp(frag.area / (frag.area + 2.0), 0.0, 1.0);
  let cool = vec3<f32>(0.16, 0.42, 0.62);
  let warm = vec3<f32>(0.85, 0.55, 0.25);
  let base = mix(cool, warm, dist);

  let col = base * (0.25 + 0.75 * lambert) + vec3<f32>(0.10, 0.14, 0.18) * rim;
  return vec4<f32>(col, 1.0);
}
`;

export class SurfaceRenderPass {
  private readonly pipeline: GPURenderPipeline;
  private readonly cameraBuffer: GPUBuffer;
  private readonly cameraData = new Float32Array(20);
  private bindGroup: GPUBindGroup;
  private depth: GPUTexture | null = null;
  private depthSize: [number, number] = [0, 0];

  constructor(
    private readonly device: GPUDevice,
    private readonly format: GPUTextureFormat,
    vertexBuffer: GPUBuffer,
  ) {
    const module = device.createShaderModule({ code: SHADER, label: 'surface.render' });
    this.pipeline = device.createRenderPipeline({
      label: 'surface.render',
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });
    this.cameraBuffer = device.createBuffer({
      size: this.cameraData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'camera',
    });
    this.bindGroup = this.makeBindGroup(vertexBuffer);
  }

  private makeBindGroup(vertexBuffer: GPUBuffer): GPUBindGroup {
    return this.device.createBindGroup({
      label: 'surface.render.bind',
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
        { binding: 1, resource: { buffer: vertexBuffer } },
      ],
    });
  }

  /** A appeler quand la surface est reconstruite : le tampon de sommets change d'identite. */
  rebind(vertexBuffer: GPUBuffer): void {
    this.bindGroup = this.makeBindGroup(vertexBuffer);
  }

  setCamera(viewProj: Mat4, eye: [number, number, number]): void {
    this.cameraData.set(viewProj, 0);
    this.cameraData[16] = eye[0];
    this.cameraData[17] = eye[1];
    this.cameraData[18] = eye[2];
    this.cameraData[19] = 1;
    this.device.queue.writeBuffer(this.cameraBuffer, 0, this.cameraData);
  }

  private ensureDepth(width: number, height: number): GPUTextureView {
    if (!this.depth || this.depthSize[0] !== width || this.depthSize[1] !== height) {
      this.depth?.destroy();
      this.depth = this.device.createTexture({
        size: { width, height },
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        label: 'depth',
      });
      this.depthSize = [width, height];
    }
    return this.depth.createView();
  }

  encode(
    encoder: GPUCommandEncoder,
    colorView: GPUTextureView,
    size: [number, number],
    indexBuffer: GPUBuffer,
    indexCount: number,
  ): void {
    const pass = encoder.beginRenderPass({
      label: 'surface',
      colorAttachments: [
        {
          view: colorView,
          clearValue: { r: 0.043, g: 0.047, b: 0.062, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.ensureDepth(size[0], size[1]),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setIndexBuffer(indexBuffer, 'uint32');
    pass.drawIndexed(indexCount);
    pass.end();
  }

  get colorFormat(): GPUTextureFormat {
    return this.format;
  }

  destroy(): void {
    this.depth?.destroy();
    this.cameraBuffer.destroy();
  }
}
