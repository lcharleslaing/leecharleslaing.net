"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { universeRoot, type UniverseNode } from "./universeData";

const presence = [
  [43.7, -84.5],
  [36.1, -86.7],
  [34.1, -118.2],
  [-23.5, -46.6],
  [51.5, -0.1],
  [6.5, 3.3],
  [-33.9, 18.4],
  [25.2, 55.3],
  [19.1, 72.8],
  [35.7, 139.7],
  [14.6, 121],
  [-33.9, 151.2],
] as const;

const HOME_CAMERA = new THREE.Vector3(0, 0.35, 8.3);
const ENTER_DISTANCE = 1.15;
const EXIT_DISTANCE = 28;

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function getNodePosition(node: UniverseNode) {
  const radius = node.orbitRadius ?? 4.2;
  const angle = node.angle ?? 0;

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    node.y ?? 0,
    Math.sin(angle) * radius,
  );
}

function createLabel(text: string) {
  const labelEl = document.createElement("div");
  labelEl.textContent = text;
  labelEl.style.color = "rgba(255,255,255,.92)";
  labelEl.style.fontSize = "11px";
  labelEl.style.letterSpacing = "0.22em";
  labelEl.style.textTransform = "uppercase";
  labelEl.style.whiteSpace = "nowrap";
  labelEl.style.textShadow = "0 2px 12px rgba(0,0,0,.95)";
  labelEl.style.transform = "translateY(18px)";
  labelEl.style.transition = "opacity 180ms ease";
  return labelEl;
}

export default function ThreeUniverse() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [path, setPath] = useState<UniverseNode[]>([universeRoot]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  const currentSystem = path[path.length - 1];
  const breadcrumb = useMemo(() => path.map((node) => node.name).join("  /  "), [path]);

  function goHome() {
    setSelectedName(null);
    setPath([universeRoot]);
    setResetVersion((current) => current + 1);
  }

  function goBack() {
    if (path.length <= 1) {
      setResetVersion((current) => current + 1);
      return;
    }

    setSelectedName(null);
    setPath((current) => current.slice(0, -1));
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let navigationLocked = false;
    let animationFrame = 0;
    let pointerDown = false;
    let pointerStart = { x: 0, y: 0 };
    let selectedNode: UniverseNode | null = null;
    let focusActive = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02040a);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 600);
    camera.position.copy(HOME_CAMERA);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";
    host.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    labelRenderer.domElement.style.zIndex = "4";
    host.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.rotateSpeed = 0.52;
    controls.zoomSpeed = 1.05;
    controls.minDistance = 0.52;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x6b7ba6, 0.72));

    const sun = new THREE.DirectionalLight(0xffd1a0, 3.1);
    sun.position.set(5, 2.5, 4);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4ca9ff, 1.3);
    rim.position.set(-5, 1.5, -3);
    scene.add(rim);

    const textureLoader = new THREE.TextureLoader();
    const centerGroup = new THREE.Group();
    scene.add(centerGroup);

    let earthMap: THREE.Texture | null = null;
    let cloudMap: THREE.Texture | null = null;
    let centerMesh: THREE.Mesh;
    let clouds: THREE.Mesh | null = null;

    if (currentSystem.id === "earth") {
      earthMap = textureLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
      earthMap.colorSpace = THREE.SRGBColorSpace;

      cloudMap = textureLoader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");
      cloudMap.colorSpace = THREE.SRGBColorSpace;

      centerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(2.05, 96, 96),
        new THREE.MeshPhongMaterial({
          color: 0xffffff,
          map: earthMap,
          shininess: 7,
          specular: new THREE.Color(0x22384a),
        }),
      );
      centerMesh.rotation.z = THREE.MathUtils.degToRad(-6);
      centerGroup.add(centerMesh);

      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(2.075, 96, 96),
        new THREE.MeshPhongMaterial({
          map: cloudMap,
          transparent: true,
          opacity: 0.33,
          depthWrite: false,
        }),
      );
      clouds.rotation.z = centerMesh.rotation.z;
      centerGroup.add(clouds);

      centerGroup.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(2.12, 64, 64),
          new THREE.MeshBasicMaterial({
            color: 0x55aaff,
            transparent: true,
            opacity: 0.055,
            side: THREE.BackSide,
          }),
        ),
      );

      const glowGeometry = new THREE.SphereGeometry(0.035, 14, 14);
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffd37d });

      for (const [lat, lon] of presence) {
        const orb = new THREE.Mesh(glowGeometry, glowMaterial.clone());
        orb.position.copy(latLonToVector3(lat, lon, 2.105));
        centerGroup.add(orb);

        const halo = new THREE.PointLight(0xffa64d, 0.65, 0.55, 2);
        halo.position.copy(orb.position);
        centerGroup.add(halo);
      }
    } else {
      centerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(2.05, 96, 96),
        new THREE.MeshStandardMaterial({
          color: currentSystem.color,
          emissive: currentSystem.color,
          emissiveIntensity: 0.22,
          roughness: 0.7,
          metalness: 0.08,
        }),
      );
      centerGroup.add(centerMesh);

      centerGroup.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(2.12, 64, 64),
          new THREE.MeshBasicMaterial({
            color: currentSystem.color,
            transparent: true,
            opacity: 0.07,
            side: THREE.BackSide,
          }),
        ),
      );
    }

    centerMesh.userData.isCenter = true;

    const centerLabelEl = createLabel(currentSystem.name);
    centerLabelEl.style.fontSize = "12px";
    centerLabelEl.style.opacity = currentSystem.id === "earth" ? "0" : "0.72";
    const centerLabel = new CSS2DObject(centerLabelEl);
    centerLabel.position.set(0, -2.45, 0);
    centerGroup.add(centerLabel);

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const children = currentSystem.children ?? [];
    const childMeshes: Array<{ node: UniverseNode; mesh: THREE.Mesh; labelEl: HTMLElement }> = [];

    children.forEach((node, index) => {
      const radius = node.orbitRadius ?? 4.2;

      const orbitRing = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.008, radius + 0.008, 220),
        new THREE.MeshBasicMaterial({
          color: node.color,
          transparent: true,
          opacity: 0.045,
          side: THREE.DoubleSide,
        }),
      );
      orbitRing.rotation.x = Math.PI / 2;
      orbitGroup.add(orbitRing);

      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(node.size ?? 0.27, 42, 42),
        new THREE.MeshStandardMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: index === 0 ? 0.48 : 0.3,
          roughness: 0.72,
          metalness: 0.08,
        }),
      );

      planet.position.copy(getNodePosition(node));
      planet.userData.nodeId = node.id;
      orbitGroup.add(planet);

      const light = new THREE.PointLight(node.color, index === 0 ? 1.1 : 0.55, 2.2, 2);
      light.position.copy(planet.position);
      orbitGroup.add(light);

      const labelEl = createLabel(node.name);
      labelEl.style.opacity = "0.82";
      const label = new CSS2DObject(labelEl);
      label.position.set(0, -(node.size ?? 0.27) - 0.2, 0);
      planet.add(label);

      childMeshes.push({ node, mesh: planet, labelEl });
    });

    // Entire star field is real 3D geometry. There are deliberately no fixed 2D stars.
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 4200;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i += 1) {
      const radius = 16 + Math.random() * 170;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const targetGoal = new THREE.Vector3(0, 0, 0);
    const cameraGoal = HOME_CAMERA.clone();

    const clearSelectionStyles = () => {
      childMeshes.forEach(({ mesh, labelEl }, index) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = index === 0 ? 0.48 : 0.3;
        labelEl.style.opacity = "0.82";
      });
    };

    const focusCenter = () => {
      selectedNode = null;
      setSelectedName(null);
      clearSelectionStyles();
      targetGoal.set(0, 0, 0);
      cameraGoal.copy(HOME_CAMERA);
      focusActive = true;
    };

    const setPointerFromEvent = (event: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const getHit = (event: PointerEvent | MouseEvent) => {
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const targets = [centerMesh, ...childMeshes.map((item) => item.mesh)];
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length === 0) return null;

      const mesh = hits[0].object as THREE.Mesh;
      if (mesh === centerMesh) {
        return { type: "center" as const };
      }

      const child = childMeshes.find((item) => item.mesh === mesh);
      return child ? { type: "child" as const, item: child } : null;
    };

    const focusNode = (item: { node: UniverseNode; mesh: THREE.Mesh; labelEl: HTMLElement }) => {
      selectedNode = item.node;
      setSelectedName(item.node.name);

      childMeshes.forEach(({ mesh, labelEl }) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = mesh === item.mesh ? 0.95 : 0.24;
        labelEl.style.opacity = mesh === item.mesh ? "1" : "0.42";
      });

      const worldPosition = new THREE.Vector3();
      item.mesh.getWorldPosition(worldPosition);
      targetGoal.copy(worldPosition);

      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.001) direction.set(0, 0.25, 1);
      direction.normalize();
      cameraGoal.copy(worldPosition).add(direction.multiplyScalar(3.25));
      focusActive = true;
    };

    const enterNode = (node: UniverseNode) => {
      if (!node.children?.length || navigationLocked) return;
      navigationLocked = true;
      setSelectedName(null);
      setPath((current) => [...current, node]);
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDown = true;
      pointerStart = { x: event.clientX, y: event.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };

    const handlePointerUp = (event: PointerEvent) => {
      const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
      pointerDown = false;
      renderer.domElement.style.cursor = "grab";

      if (moved > 5) return;
      const hit = getHit(event);
      if (!hit) return;

      if (hit.type === "center") {
        focusCenter();
        return;
      }

      focusNode(hit.item);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const hit = getHit(event);
      if (!hit) return;

      if (hit.type === "center") {
        focusCenter();
        return;
      }

      focusNode(hit.item);
      if (hit.item.node.children?.length) {
        window.setTimeout(() => enterNode(hit.item.node), 180);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerDown) return;
      const hit = getHit(event);
      renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    };

    const handlePointerLeave = () => {
      pointerDown = false;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
      labelRenderer.setSize(clientWidth, clientHeight);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const clock = new THREE.Clock();

    const render = () => {
      if (disposed) return;
      const delta = clock.getDelta();

      if (!pointerDown) {
        centerMesh.rotation.y += delta * (currentSystem.id === "earth" ? 0.045 : 0.025);
        if (clouds) clouds.rotation.y += delta * 0.058;
        orbitGroup.rotation.y += delta * 0.014;
      }

      childMeshes.forEach(({ mesh }, index) => {
        mesh.rotation.y += delta * (0.14 + index * 0.012);
      });

      if (focusActive) {
        controls.target.lerp(targetGoal, 0.09);
        camera.position.lerp(cameraGoal, 0.075);

        if (
          controls.target.distanceTo(targetGoal) < 0.015 &&
          camera.position.distanceTo(cameraGoal) < 0.02
        ) {
          controls.target.copy(targetGoal);
          camera.position.copy(cameraGoal);
          focusActive = false;
        }
      }

      controls.update();

      const targetDistance = camera.position.distanceTo(controls.target);

      if (
        !navigationLocked &&
        selectedNode?.children?.length &&
        targetDistance < ENTER_DISTANCE
      ) {
        enterNode(selectedNode);
      }

      if (!navigationLocked && path.length > 1 && targetDistance > EXIT_DISTANCE) {
        navigationLocked = true;
        setSelectedName(null);
        setPath((current) => current.slice(0, -1));
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();

      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });

      earthMap?.dispose();
      cloudMap?.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
      host.replaceChildren();
    };
  }, [currentSystem, path.length, resetVersion]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "18.5%",
          transform: "translateX(-50%)",
          zIndex: 8,
          pointerEvents: "none",
          color: "rgba(255,255,255,.62)",
          fontSize: "10px",
          letterSpacing: ".22em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {breadcrumb}
        {selectedName ? `  ·  ${selectedName}` : ""}
      </div>

      <div
        style={{
          position: "absolute",
          left: "24px",
          bottom: "24px",
          zIndex: 10,
          display: "flex",
          gap: "10px",
        }}
      >
        <button
          type="button"
          onClick={goHome}
          title="Return to Earth"
          aria-label="Return to Earth"
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,.24)",
            background: "rgba(3,7,14,.54)",
            color: "rgba(255,255,255,.9)",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ◎
        </button>

        {path.length > 1 ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back one universe level"
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,.2)",
              background: "rgba(3,7,14,.54)",
              color: "rgba(255,255,255,.82)",
              backdropFilter: "blur(10px)",
              cursor: "pointer",
              padding: "0 16px",
              fontSize: "10px",
              letterSpacing: ".18em",
              textTransform: "uppercase",
            }}
          >
            Back
          </button>
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          right: "24px",
          bottom: "26px",
          zIndex: 8,
          pointerEvents: "none",
          color: "rgba(255,255,255,.48)",
          fontSize: "9px",
          letterSpacing: ".18em",
          textTransform: "uppercase",
          textAlign: "right",
          lineHeight: 1.7,
        }}
      >
        Click a world to focus · Click the center world to recenter
        <br />
        Double click to enter · Zoom far out to return
      </div>
    </div>
  );
}
