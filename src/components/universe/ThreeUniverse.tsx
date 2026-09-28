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
const HOME_DISTANCE = HOME_CAMERA.length();
const ENTER_DISTANCE = 1.15;
const EXIT_DISTANCE = 28;
const EARTH_RADIUS = 2.05;
const CLOUD_RADIUS = 2.053;
const PRESENCE_RADIUS = 2.056;
const SURFACE_NORMAL_AXIS = new THREE.Vector3(0, 0, 1);
const SUN_DISTANCE = 20;
const SUN_CLOCK_REFRESH_MS = 60_000;

type ThreeUniverseProps = {
  resetSignal?: number;
};

type PresenceMarker = {
  group: THREE.Group;
};

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function normalizeLongitude(value: number) {
  const degrees = normalizeDegrees(value);
  return degrees > 180 ? degrees - 360 : degrees;
}

// Approximate the point on Earth directly beneath the Sun for the supplied
// instant. Date comes from the visitor's computer clock; converting that instant
// to UTC gives us the correct global day/night orientation without hard-coding
// any one timezone such as EST/EDT.
function getSubsolarPoint(date: Date) {
  const julianDay = date.getTime() / 86_400_000 + 2_440_587.5;
  const daysSinceJ2000 = julianDay - 2_451_545.0;

  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * daysSinceJ2000);
  const meanAnomaly = THREE.MathUtils.degToRad(
    normalizeDegrees(357.528 + 0.9856003 * daysSinceJ2000),
  );

  const eclipticLongitude = THREE.MathUtils.degToRad(
    normalizeDegrees(
      meanLongitude +
        1.915 * Math.sin(meanAnomaly) +
        0.02 * Math.sin(2 * meanAnomaly),
    ),
  );

  const obliquity = THREE.MathUtils.degToRad(23.439 - 0.0000004 * daysSinceJ2000);
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );

  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );

  const rightAscensionDegrees = normalizeDegrees(
    THREE.MathUtils.radToDeg(rightAscension),
  );

  const greenwichSiderealTime = normalizeDegrees(
    280.46061837 + 360.98564736629 * (julianDay - 2_451_545.0),
  );

  return {
    lat: THREE.MathUtils.radToDeg(declination),
    lon: normalizeLongitude(rightAscensionDegrees - greenwichSiderealTime),
  };
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

function orientMarkerToSurface(marker: THREE.Group, position: THREE.Vector3) {
  const outwardNormal = position.clone().normalize();
  marker.quaternion.setFromUnitVectors(SURFACE_NORMAL_AXIS, outwardNormal);
}

export default function ThreeUniverse({ resetSignal = 0 }: ThreeUniverseProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastResetSignal = useRef(resetSignal);
  const [path, setPath] = useState<UniverseNode[]>([universeRoot]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);

  const currentSystem = path[path.length - 1];
  const breadcrumb = useMemo(
    () => path.map((node) => node.name).join("  /  "),
    [path],
  );

  function hardResetToEarth() {
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
    if (lastResetSignal.current === resetSignal) return;
    lastResetSignal.current = resetSignal;
    hardResetToEarth();
  }, [resetSignal]);

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
    controls.update();

    scene.add(new THREE.AmbientLight(0x6b7ba6, 0.72));

    const sun = new THREE.DirectionalLight(0xffd1a0, 3.1);
    sun.position.set(5, 2.5, 4);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4ca9ff, 1.3);
    rim.position.set(-5, 1.5, -3);
    scene.add(rim);

    const textureLoader = new THREE.TextureLoader();
    const centerGroup = new THREE.Group();
    const surfaceGroup = new THREE.Group();
    centerGroup.add(surfaceGroup);
    scene.add(centerGroup);

    let earthMap: THREE.Texture | null = null;
    let cloudMap: THREE.Texture | null = null;
    let centerMesh: THREE.Mesh;
    const presenceMarkers: PresenceMarker[] = [];

    if (currentSystem.id === "earth") {
      // Temporary remote textures. These will be replaced with local PWA-safe assets.
      earthMap = textureLoader.load(
        "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
      );
      earthMap.colorSpace = THREE.SRGBColorSpace;
      cloudMap = textureLoader.load(
        "https://threejs.org/examples/textures/planets/earth_clouds_1024.png",
      );
      cloudMap.colorSpace = THREE.SRGBColorSpace;

      // Texture, clouds, atmosphere and geographic markers share one transform,
      // so latitude/longitude markers stay attached while Earth slowly rotates.
      surfaceGroup.rotation.z = THREE.MathUtils.degToRad(-6);

      centerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(EARTH_RADIUS, 96, 96),
        new THREE.MeshPhongMaterial({
          color: 0xffffff,
          map: earthMap,
          shininess: 7,
          specular: new THREE.Color(0x22384a),
        }),
      );
      surfaceGroup.add(centerMesh);

      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(CLOUD_RADIUS, 96, 96),
        new THREE.MeshPhongMaterial({
          map: cloudMap,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
        }),
      );
      surfaceGroup.add(clouds);

      surfaceGroup.add(
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

      for (const [lat, lon] of presence) {
        const markerPosition = latLonToVector3(lat, lon, PRESENCE_RADIUS);
        const marker = new THREE.Group();
        marker.position.copy(markerPosition);
        orientMarkerToSurface(marker, markerPosition);

        const halo = new THREE.Mesh(
          new THREE.CircleGeometry(0.065, 32),
          new THREE.MeshBasicMaterial({
            color: 0xffc873,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.FrontSide,
          }),
        );
        halo.position.z = 0.0005;
        marker.add(halo);

        const core = new THREE.Mesh(
          new THREE.CircleGeometry(0.021, 28),
          new THREE.MeshBasicMaterial({
            color: 0xffe6ae,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            side: THREE.FrontSide,
          }),
        );
        core.position.z = 0.001;
        marker.add(core);

        surfaceGroup.add(marker);
        presenceMarkers.push({ group: marker });
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
      surfaceGroup.add(centerMesh);

      surfaceGroup.add(
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
    const childMeshes: Array<{
      node: UniverseNode;
      mesh: THREE.Mesh;
      labelEl: HTMLElement;
    }> = [];

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

      const light = new THREE.PointLight(
        node.color,
        index === 0 ? 1.1 : 0.55,
        2.2,
        2,
      );
      light.position.copy(planet.position);
      orbitGroup.add(light);

      const labelEl = createLabel(node.name);
      labelEl.style.opacity = "0.82";
      const label = new CSS2DObject(labelEl);
      label.position.set(0, -(node.size ?? 0.27) - 0.2, 0);
      planet.add(label);

      childMeshes.push({ node, mesh: planet, labelEl });
    });

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

    starsGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(starsGeometry, starsMaterial));

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
      controls.target.set(0, 0, 0);
      targetGoal.set(0, 0, 0);
      cameraGoal.copy(HOME_CAMERA);
      controls.update();
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
      const hits = raycaster.intersectObjects(
        [centerMesh, ...childMeshes.map((item) => item.mesh)],
        false,
      );
      if (hits.length === 0) return null;

      const mesh = hits[0].object as THREE.Mesh;
      if (mesh === centerMesh) return { type: "center" as const };

      const child = childMeshes.find((item) => item.mesh === mesh);
      return child ? { type: "child" as const, item: child } : null;
    };

    const focusNode = (item: {
      node: UniverseNode;
      mesh: THREE.Mesh;
      labelEl: HTMLElement;
    }) => {
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
      const moved = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );
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
      renderer.domElement.style.cursor = getHit(event) ? "pointer" : "grab";
    };

    const handlePointerLeave = () => {
      pointerDown = false;
      renderer.domElement.style.cursor = "grab";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Home") return;

      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isEditing) return;

      event.preventDefault();
      hardResetToEarth();
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("keydown", handleKeyDown);

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
    const markerWorldPosition = new THREE.Vector3();
    const sunLocalPosition = new THREE.Vector3();
    const sunWorldPosition = new THREE.Vector3();
    let subsolarPoint = getSubsolarPoint(new Date());
    let nextSunClockRefresh = Date.now() + SUN_CLOCK_REFRESH_MS;

    const updateEarthSun = () => {
      if (currentSystem.id !== "earth") return;

      const now = Date.now();
      if (now >= nextSunClockRefresh) {
        subsolarPoint = getSubsolarPoint(new Date(now));
        nextSunClockRefresh = now + SUN_CLOCK_REFRESH_MS;
      }

      // The Earth is intentionally given a slow decorative rotation. Transform
      // the real-time Sun direction through that same surface transform so the
      // daylight remains attached to the correct geographic longitudes while
      // the globe turns visually.
      sunLocalPosition.copy(
        latLonToVector3(subsolarPoint.lat, subsolarPoint.lon, SUN_DISTANCE),
      );
      surfaceGroup.updateWorldMatrix(true, false);
      sunWorldPosition.copy(sunLocalPosition);
      surfaceGroup.localToWorld(sunWorldPosition);
      sun.position.copy(sunWorldPosition);
    };

    updateEarthSun();

    const render = () => {
      if (disposed) return;
      const delta = clock.getDelta();

      if (!pointerDown) {
        surfaceGroup.rotation.y +=
          delta * (currentSystem.id === "earth" ? 0.045 : 0.025);
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
      updateEarthSun();

      presenceMarkers.forEach(({ group }) => {
        group.getWorldPosition(markerWorldPosition);
        const distanceToCamera = camera.position.distanceTo(markerWorldPosition);
        const markerScale = THREE.MathUtils.clamp(
          distanceToCamera / HOME_DISTANCE,
          0.05,
          1,
        );
        group.scale.setScalar(markerScale);
      });

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
      window.removeEventListener("keydown", handleKeyDown);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
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
          onClick={hardResetToEarth}
          title="Return to Earth (Home key)"
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
        Double click to enter · Home key returns to Earth
      </div>
    </div>
  );
}
