import * as THREE from "three";
import type { GameSnapshot, Obstacle, NPC } from "../game/types";

type ObjRec = {
  mesh: THREE.Object3D;
  id: number;
  kind: string;
};

export class Renderer3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private snow: THREE.Mesh;
  private playerRoot = new THREE.Group();
  private yetiMesh: THREE.Object3D | null = null;
  private obstaclePool = new Map<number, ObjRec>();
  private npcPool = new Map<number, ObjRec>();
  private clock = 0;
  private active = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setClearColor(0xdbeafe, 1);
    this.renderer.shadowMap.enabled = true;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.5, 500);
    this.camera.position.set(0, 28, -22);
    this.camera.lookAt(0, 0, 8);

    this.scene.fog = new THREE.Fog(0xdbeafe, 40, 160);

    // Lights
    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 1.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff7ed, 1.1);
    sun.position.set(-30, 50, -10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);

    // Snow ground (large plane, repositioned under player)
    const groundGeo = new THREE.PlaneGeometry(400, 400, 40, 40);
    const pos = groundGeo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.08) * Math.cos(y * 0.07) * 0.35);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.95,
      metalness: 0.02,
    });
    this.snow = new THREE.Mesh(groundGeo, groundMat);
    this.snow.rotation.x = -Math.PI / 2;
    this.snow.receiveShadow = true;
    this.scene.add(this.snow);

    this.scene.add(this.playerRoot);
    this.buildPlayer("skier");
  }

  private clearGroup(g: THREE.Group) {
    while (g.children.length) {
      const c = g.children[0]!;
      g.remove(c);
    }
  }

  private buildPlayer(character: "skier" | "snowboarder") {
    this.clearGroup(this.playerRoot);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: character === "snowboarder" ? 0x0f766e : 0xc41e3a,
      roughness: 0.6,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.8 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
    const gearMat = new THREE.MeshStandardMaterial({
      color: character === "snowboarder" ? 0x134e4a : 0x64748b,
      roughness: 0.4,
    });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.45), bodyMat);
    torso.position.y = 1.1;
    torso.castShadow = true;
    this.playerRoot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), skinMat);
    head.position.y = 1.75;
    head.castShadow = true;
    this.playerRoot.add(head);

    const pants = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.4), pantMat);
    pants.position.y = 0.55;
    pants.castShadow = true;
    this.playerRoot.add(pants);

    if (character === "snowboarder") {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 1.7), gearMat);
      board.position.y = 0.12;
      board.castShadow = true;
      this.playerRoot.add(board);
    } else {
      for (const sx of [-0.22, 0.22]) {
        const ski = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.5), gearMat);
        ski.position.set(sx, 0.1, 0.1);
        ski.castShadow = true;
        this.playerRoot.add(ski);
      }
    }
  }

  private lastCharacter: string | null = null;

  resize(cssW: number, cssH: number, dpr: number) {
    this.renderer.setPixelRatio(Math.min(dpr, 2));
    this.renderer.setSize(cssW, cssH, true);
    this.camera.aspect = cssW / Math.max(1, cssH);
    this.camera.updateProjectionMatrix();
  }

  setActive(on: boolean) {
    this.active = on;
    // When switching away, 2D context may take over the same canvas —
    // WebGL and 2D can't share a canvas reliably. Parent handles dual-canvas.
  }

  render(snap: GameSnapshot) {
    if (!this.active) return;
    this.clock += 0.016;

    if (this.lastCharacter !== snap.player.character) {
      this.buildPlayer(snap.player.character);
      this.lastCharacter = snap.player.character;
    }

    const p = snap.player;
    const camX = snap.cameraX;
    const camY = snap.cameraY;
    this.playerRoot.visible = !snap.hidePlayer;
    if (!snap.hidePlayer) {
      // Map game coords: x -> x, y (downhill) -> z
      this.playerRoot.position.set(p.x * 0.08, p.airborne > 0 ? 1.2 : 0, p.y * 0.08);
      const yaw = this.dirToYaw(p.dir);
      this.playerRoot.rotation.y = yaw;
      if (p.crashTimer > 0) {
        this.playerRoot.rotation.z = Math.sin(this.clock * 20) * 0.5;
        this.playerRoot.rotation.x = 0.6;
      } else {
        this.playerRoot.rotation.z = 0;
        this.playerRoot.rotation.x = p.airborne > 0 ? -0.25 : 0.05;
      }
    }

    // Camera follows behind/above looking down-slope
    const camTarget = new THREE.Vector3(camX * 0.08, 0.5, camY * 0.08 + 6);
    const camPos = new THREE.Vector3(camX * 0.08, 22, camY * 0.08 - 18);
    this.camera.position.lerp(camPos, 0.15);
    this.camera.lookAt(camTarget);

    this.snow.position.set(camX * 0.08, 0, camY * 0.08 + 20);

    this.syncObstacles(snap.obstacles);
    this.syncNpcs(snap.npcs);
    this.syncYeti(snap);

    this.renderer.render(this.scene, this.camera);
  }

  private dirToYaw(dir: string): number {
    switch (dir) {
      case "hardLeft":
        return Math.PI / 2;
      case "left":
        return Math.PI / 3;
      case "downLeft":
        return Math.PI / 6;
      case "down":
      case "stop":
      case "up":
        return 0;
      case "downRight":
        return -Math.PI / 6;
      case "right":
        return -Math.PI / 3;
      case "hardRight":
        return -Math.PI / 2;
      default:
        return 0;
    }
  }

  private makeObstacleMesh(o: Obstacle): THREE.Object3D {
    const g = new THREE.Group();
    if (o.type === "tree" || o.type === "smallTree") {
      const scale = o.type === "smallTree" ? 0.7 : 1;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x78350f }),
      );
      trunk.position.y = 0.45;
      trunk.castShadow = true;
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(0.7 * scale, 1.6 * scale, 7),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 }),
      );
      leaves.position.y = 1.3 * scale;
      leaves.castShadow = true;
      g.add(trunk, leaves);
    } else if (o.type === "deadTree") {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 1.4, 5),
        new THREE.MeshStandardMaterial({ color: 0x44403c }),
      );
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      g.add(trunk);
    } else if (o.type === "rock") {
      const m = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45),
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 1,
        }),
      );
      m.position.y = 0.25;
      m.castShadow = true;
      g.add(m);
    } else if (o.type === "stump") {
      // Olive shrub/stump (classic #46)
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0xa3a34a, roughness: 1 }),
      );
      m.position.y = 0.22;
      m.castShadow = true;
      g.add(m);
    } else if (o.type === "jump") {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.35, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 }),
      );
      m.position.y = 0.1;
      m.rotation.x = -0.25;
      m.castShadow = true;
      g.add(m);
    } else if (o.type === "slowSnow") {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 1,
          transparent: true,
          opacity: 0.85,
        }),
      );
      m.scale.set(1.8, 0.35, 1.1);
      m.position.y = 0.05;
      g.add(m);
    } else if (o.type === "liftPole") {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
      );
      pole.position.y = 1.6;
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.7, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 }),
      );
      base.position.y = 0.35;
      g.add(pole, base);
    } else if (
      o.type === "liftEmpty" ||
      o.type === "liftPerson" ||
      o.type === "liftPair"
    ) {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.45, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
      );
      seat.position.y = 1.4;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
      );
      bar.position.y = 1.95;
      g.add(seat, bar);
      if (o.type === "liftPerson") {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.12, 0.25, 3, 6),
          new THREE.MeshStandardMaterial({ color: 0x2563eb }),
        );
        body.position.set(0, 1.75, 0);
        g.add(body);
      } else if (o.type === "liftPair") {
        for (const ox of [-0.22, 0.22]) {
          const body = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.12, 0.25, 3, 6),
            new THREE.MeshStandardMaterial({ color: ox < 0 ? 0x2563eb : 0xdc2626 }),
          );
          body.position.set(ox, 1.75, 0);
          g.add(body);
        }
      }
    } else if (o.type === "slalomFlagL" || o.type === "slalomFlagR") {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b }),
      );
      pole.position.y = 0.6;
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.28, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
      );
      flag.position.set(o.type === "slalomFlagL" ? 0.25 : -0.25, 1.0, 0);
      g.add(pole, flag);
    } else if (o.type === "finish") {
      const banner = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.6, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x1e293b }),
      );
      banner.position.y = 1.5;
      // checker
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.55, 0.16),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0xf8fafc : 0x0f172a }),
        );
        c.position.set(-3.5 + i, 1.5, 0);
        g.add(c);
      }
      g.add(banner);
    }
    return g;
  }

  private syncObstacles(list: Obstacle[]) {
    const seen = new Set<number>();
    for (const o of list) {
      seen.add(o.id);
      let rec = this.obstaclePool.get(o.id);
      if (!rec) {
        const mesh = this.makeObstacleMesh(o);
        this.scene.add(mesh);
        rec = { mesh, id: o.id, kind: o.type };
        this.obstaclePool.set(o.id, rec);
      }
      rec.mesh.position.set(o.x * 0.08, 0, o.y * 0.08);
    }
    for (const [id, rec] of this.obstaclePool) {
      if (!seen.has(id)) {
        this.scene.remove(rec.mesh);
        this.obstaclePool.delete(id);
      }
    }
  }

  private makeNpc(n: NPC): THREE.Object3D {
    const g = new THREE.Group();
    const color = n.kind === "snowboarder" ? 0x0369a1 : 0x7c3aed;
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.25, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color }),
    );
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    if (n.kind === "snowboarder") {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.06, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x0c4a6e }),
      );
      board.position.y = 0.1;
      g.add(board);
    }
    return g;
  }

  private syncNpcs(list: NPC[]) {
    const seen = new Set<number>();
    for (const n of list) {
      seen.add(n.id);
      let rec = this.npcPool.get(n.id);
      if (!rec) {
        const mesh = this.makeNpc(n);
        this.scene.add(mesh);
        rec = { mesh, id: n.id, kind: n.kind };
        this.npcPool.set(n.id, rec);
      }
      rec.mesh.position.set(n.x * 0.08, 0, n.y * 0.08);
    }
    for (const [id, rec] of this.npcPool) {
      if (!seen.has(id)) {
        this.scene.remove(rec.mesh);
        this.npcPool.delete(id);
      }
    }
  }

  private syncYeti(snap: GameSnapshot) {
    if (!snap.yeti?.active) {
      if (this.yetiMesh) {
        this.scene.remove(this.yetiMesh);
        this.yetiMesh = null;
      }
      return;
    }
    if (!this.yetiMesh) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 }),
      );
      body.position.y = 1.2;
      body.castShadow = true;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }),
      );
      head.position.y = 2.3;
      const eyeL = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x0f172a }),
      );
      eyeL.position.set(-0.22, 2.4, 0.55);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.22;
      g.add(body, head, eyeL, eyeR);
      this.yetiMesh = g;
      this.scene.add(g);
    }
    // World is already in original pixels; scale down for 3D scene
    this.yetiMesh.position.set(snap.yeti.x * 0.08, 0, snap.yeti.y * 0.08);
    if (snap.yeti.celebrating) {
      const hop = Math.abs(Math.sin(snap.yeti.frame * 0.9)) * 0.35;
      this.yetiMesh.position.y = hop;
      this.yetiMesh.scale.setScalar(1.1);
    } else if (snap.yeti.eating) {
      this.yetiMesh.scale.setScalar(1.15);
      this.yetiMesh.position.y = 0;
    } else {
      this.yetiMesh.scale.setScalar(1);
      this.yetiMesh.position.y = 0;
    }
  }

  dispose() {
    this.renderer.dispose();
  }
}
