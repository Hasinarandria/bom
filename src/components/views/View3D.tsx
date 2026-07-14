import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Block, Panel } from '../../types';
import { calculateBlock } from '../../lib/calculations';

interface Props {
  blocks: Block[];
  panels: Panel[];
}

export function View3D({ blocks, panels }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 30, 80);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(15, 12, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x444422, 0.4);
    scene.add(hemiLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3e,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(40, 40, 0x444466, 0x333344);
    grid.position.y = 0;
    scene.add(grid);

    // Build blocks
    const blockMeshes: THREE.Object3D[] = [];
    let xOffset = -((blocks.length - 1) * 3) / 2;

    blocks.forEach((block) => {
      const panel = panels.find((p) => p.id === block.panel_id) ?? null;
      const calc = calculateBlock(block, panel);
      if (!panel) return;

      const panelLong = panel.length_mm / 1000;
      const panelShort = panel.width_mm / 1000;
      const hSpacing = block.horizontal_spacing / 1000;
      const vSpacing = block.vertical_spacing / 1000;

      const isPortrait = block.orientation === 'portrait';
      const panelW = isPortrait ? panelShort : panelLong;
      const panelH = isPortrait ? panelLong : panelShort;

      const blockWidth = block.columns * panelW + (block.columns - 1) * hSpacing;
      const blockDepth = block.rows * panelH + (block.rows - 1) * vSpacing;

      const blockGroup = new THREE.Group();
      blockGroup.position.x = xOffset;
      blockGroup.userData = { blockId: block.id, blockName: block.name };

      // Roof / purlins
      const purlinMat = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.7 });
      const purlinSpacing = block.purlin_spacing / 1000;
      const numPurlins = block.num_purlins;
      const totalPurlinDepth = (numPurlins - 1) * purlinSpacing;
      const purlinStart = -totalPurlinDepth / 2;

      for (let i = 0; i < numPurlins; i++) {
        const purlinGeo = new THREE.BoxGeometry(blockWidth + 0.4, 0.06, 0.08);
        const purlin = new THREE.Mesh(purlinGeo, purlinMat);
        purlin.position.set(0, 0.03, purlinStart + i * purlinSpacing);
        purlin.castShadow = true;
        blockGroup.add(purlin);
      }

      // Rails
      const railMat = new THREE.MeshStandardMaterial({ color: 0xaaaabb, metalness: 0.6, roughness: 0.3 });
      const railLength = (calc.railLength / 1000);
      const railSpacing = blockDepth / block.num_rails;

      for (let r = 0; r < block.num_rails; r++) {
        const railGeo = new THREE.BoxGeometry(railLength, 0.04, 0.04);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(0, 0.12, -blockDepth / 2 + (r + 0.5) * railSpacing);
        rail.castShadow = true;
        blockGroup.add(rail);

        // L-Feet along rail
        const lfootMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, metalness: 0.5 });
        for (let p = 0; p < numPurlins; p++) {
          const lfootGeo = new THREE.BoxGeometry(0.04, 0.1, 0.06);
          const lfoot = new THREE.Mesh(lfootGeo, lfootMat);
          lfoot.position.set(
            -railLength / 2 + 0.2 + (p / Math.max(1, numPurlins - 1)) * (railLength - 0.4),
            0.08,
            -blockDepth / 2 + (r + 0.5) * railSpacing,
          );
          lfoot.castShadow = true;
          blockGroup.add(lfoot);
        }
      }

      // Panels
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1a3a5a,
        roughness: 0.3,
        metalness: 0.5,
      });
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x888899,
        metalness: 0.7,
        roughness: 0.3,
      });

      const cellStartX = -blockWidth / 2 + panelW / 2;
      const cellStartZ = -blockDepth / 2 + panelH / 2;

      for (let row = 0; row < block.rows; row++) {
        for (let col = 0; col < block.columns; col++) {
          const px = cellStartX + col * (panelW + hSpacing);
          const pz = cellStartZ + row * (panelH + vSpacing);

          // Panel body
          const pGeo = new THREE.BoxGeometry(panelW - 0.02, 0.03, panelH - 0.02);
          const pMesh = new THREE.Mesh(pGeo, panelMat);
          pMesh.position.set(px, 0.16, pz);
          pMesh.castShadow = true;
          pMesh.userData = { isPanel: true, blockId: block.id };
          blockGroup.add(pMesh);

          // Frame
          const fGeo = new THREE.BoxGeometry(panelW, 0.035, panelH);
          const fMesh = new THREE.Mesh(fGeo, frameMat);
          fMesh.position.set(px, 0.158, pz);
          fMesh.castShadow = true;
          blockGroup.add(fMesh);
        }
      }

      // End clamps (small cubes at rail ends)
      const clampMat = new THREE.MeshStandardMaterial({ color: 0xcc6644 });
      for (let r = 0; r < block.num_rails; r++) {
        for (let end = 0; end < 2; end++) {
          const clampGeo = new THREE.BoxGeometry(0.03, 0.04, 0.02);
          const clamp = new THREE.Mesh(clampGeo, clampMat);
          clamp.position.set(
            end === 0 ? -railLength / 2 + 0.05 : railLength / 2 - 0.05,
            0.18,
            -blockDepth / 2 + (r + 0.5) * railSpacing,
          );
          blockGroup.add(clamp);
        }
      }

      // Mid clamps
      for (let r = 0; r < block.num_rails; r++) {
        for (let c = 0; c < block.columns - 1; c++) {
          const mx = cellStartX + panelW + c * (panelW + hSpacing) + hSpacing / 2;
          const clampGeo = new THREE.BoxGeometry(0.02, 0.04, 0.02);
          const clamp = new THREE.Mesh(clampGeo, clampMat);
          clamp.position.set(mx, 0.18, -blockDepth / 2 + (r + 0.5) * railSpacing);
          blockGroup.add(clamp);
        }
      }

      scene.add(blockGroup);
      blockMeshes.push(blockGroup);
      xOffset += blockWidth + 3;
    });

    // Mouse controls
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let azimuth = Math.atan2(camera.position.x, camera.position.z);
    let elevation = Math.atan2(camera.position.y, Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2));
    let radius = camera.position.length();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      azimuth -= dx * 0.01;
      elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, elevation - dy * 0.01));
      prevX = e.clientX;
      prevY = e.clientY;
      updateCamera();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(5, Math.min(60, radius + e.deltaY * 0.02));
      updateCamera();
    };

    function updateCamera() {
      camera.position.x = radius * Math.cos(elevation) * Math.sin(azimuth);
      camera.position.y = radius * Math.sin(elevation);
      camera.position.z = radius * Math.cos(elevation) * Math.cos(azimuth);
      camera.lookAt(0, 1, 0);
    }
    updateCamera();

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Touch support
    let touchPrevX = 0;
    let touchPrevY = 0;
    let touchDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchPrevX = e.touches[0].clientX;
        touchPrevY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchPrevX;
        const dy = e.touches[0].clientY - touchPrevY;
        azimuth -= dx * 0.01;
        elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, elevation - dy * 0.01));
        touchPrevX = e.touches[0].clientX;
        touchPrevY = e.touches[0].clientY;
        updateCamera();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        radius = Math.max(5, Math.min(60, radius + (touchDist - dist) * 0.05));
        touchDist = dist;
        updateCamera();
      }
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });

    // Raycaster for hover
    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const onHover = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObjects(blockMeshes, true);
      const hit = intersects.find((i) => i.object.userData?.isPanel);
      setHovered(hit ? hit.object.userData.blockId : null);
    };
    canvas.addEventListener('mousemove', onHover);

    // Animation loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('mousemove', onHover);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [blocks, panels]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full rounded-lg overflow-hidden" />
      {hovered && (
        <div className="absolute bottom-4 left-4 rounded-md bg-background/90 px-3 py-1.5 text-sm shadow-md backdrop-blur">
          {blocks.find((b) => b.id === hovered)?.name ?? ''}
        </div>
      )}
      <div className="absolute top-4 right-4 rounded-md bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur">
        Glisser pour pivoter · Molette pour zoomer
      </div>
    </div>
  );
}
