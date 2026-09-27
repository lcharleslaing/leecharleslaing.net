"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

const worlds = [
  { name: "Music", color: 0xff9d3d, radius: 3.8, angle: 0.2, y: 0.9 },
  { name: "Engineering", color: 0x8ca8ff, radius: 4.4, angle: 1.35, y: 0.15 },
  { name: "Programming", color: 0x37d8ff, radius: 4.1, angle: 2.55, y: -0.8 },
  { name: "Stories", color: 0xbf68ff, radius: 4.5, angle: 3.5, y: 0.65 },
  { name: "Video", color: 0xff604f, radius: 4.0, angle: 4.55, y: -0.55 },
  { name: "Thought / Faith", color: 0xf4d45c, radius: 4.55, angle: 5.55, y: 1.15 },
] as const;

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

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function ThreeUniverse() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0.35, 8.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
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
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.7;
    controls.minDistance = 5.2;
    controls.maxDistance = 12;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x6b7ba6, 0.72);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffd1a0, 3.1);
    sun.position.set(5, 2.5, 4);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4ca9ff, 1.3);
    rim.position.set(-5, 1.5, -3);
    scene.add(rim);

    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load("https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg");
    earthMap.colorSpace = THREE.SRGBColorSpace;
    const cloudMap = textureLoader.load("https://threejs.org/examples/textures/planets/earth_clouds_1024.png");
    cloudMap.colorSpace = THREE.SRGBColorSpace;

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(2.05, 96, 96),
      new THREE.MeshPhongMaterial({ map: earthMap, shininess: 7, specular: new THREE.Color(0x22384a) }),
    );
    earth.rotation.z = THREE.MathUtils.degToRad(-6);
    earthGroup.add(earth);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(2.075, 96, 96),
      new THREE.MeshPhongMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.33,
        depthWrite: false,
      }),
    );
    clouds.rotation.z = earth.rotation.z;
    earthGroup.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.12, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x55aaff, transparent: true, opacity: 0.055, side: THREE.BackSide }),
    );
    earthGroup.add(atmosphere);

    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xffd37d });
    const glowGeometry = new THREE.SphereGeometry(0.035, 14, 14);

    for (const [lat, lon] of presence) {
      const orb = new THREE.Mesh(glowGeometry, glowMaterial.clone());
      orb.position.copy(latLonToVector3(lat, lon, 2.105));
      earthGroup.add(orb);

      const halo = new THREE.PointLight(0xffa64d, 0.65, 0.55, 2);
      halo.position.copy(orb.position);
      earthGroup.add(halo);
    }

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const orbitGeometry = new THREE.RingGeometry(3.55, 3.565, 180);
    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0x7da8ff,
      transparent: true,
      opacity: 0.095,
      side: THREE.DoubleSide,
    });
    const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbitRing.rotation.x = Math.PI / 2;
    orbitGroup.add(orbitRing);

    const worldMeshes: THREE.Mesh[] = [];

    worlds.forEach((world, index) => {
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(index === 0 ? 0.34 : 0.25, 36, 36),
        new THREE.MeshStandardMaterial({
          color: world.color,
          emissive: world.color,
          emissiveIntensity: index === 0 ? 0.55 : 0.36,
          roughness: 0.72,
          metalness: 0.08,
        }),
      );

      planet.position.set(Math.cos(world.angle) * world.radius, world.y, Math.sin(world.angle) * world.radius);
      orbitGroup.add(planet);
      worldMeshes.push(planet);

      const light = new THREE.PointLight(world.color, index === 0 ? 1.2 : 0.65, 2.2, 2);
      light.position.copy(planet.position);
      orbitGroup.add(light);

      const labelEl = document.createElement("div");
      labelEl.textContent = world.name;
      labelEl.style.color = "rgba(255,255,255,.9)";
      labelEl.style.fontSize = "11px";
      labelEl.style.letterSpacing = "0.22em";
      labelEl.style.textTransform = "uppercase";
      labelEl.style.whiteSpace = "nowrap";
      labelEl.style.textShadow = "0 2px 12px rgba(0,0,0,.95)";
      labelEl.style.transform = "translateY(18px)";

      const label = new CSS2DObject(labelEl);
      label.position.set(0, -0.42, 0);
      planet.add(label);
    });

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 1600;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i += 1) {
      const r = 18 + Math.random() * 32;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.86, sizeAttenuation: true }),
    );
    scene.add(stars);

    let pointerDown = false;
    renderer.domElement.addEventListener("pointerdown", () => {
      pointerDown = true;
    });
    renderer.domElement.addEventListener("pointerup", () => {
      pointerDown = false;
    });
    renderer.domElement.addEventListener("pointerleave", () => {
      pointerDown = false;
    });

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
    let animationFrame = 0;

    const render = () => {
      const delta = clock.getDelta();

      if (!pointerDown) {
        earth.rotation.y += delta * 0.045;
        clouds.rotation.y += delta * 0.058;
        orbitGroup.rotation.y += delta * 0.018;
      }

      worldMeshes.forEach((mesh, index) => {
        mesh.rotation.y += delta * (0.16 + index * 0.018);
      });

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      earthMap.dispose();
      cloudMap.dispose();
      starsGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      orbitGeometry.dispose();
      orbitMaterial.dispose();
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}
