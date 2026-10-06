import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TelemetryGlobeProps {
  isDark?: boolean;
}

export const TelemetryGlobe3D: React.FC<TelemetryGlobeProps> = ({ isDark = true }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setHasReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setHasReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || hasReducedMotion) return;

    let isVisible = true;
    let animationFrameId: number;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Color definitions based on calm control room theme
    const wireColor = isDark ? 0x27272a : 0xd4d4d8;
    const dotColor = isDark ? 0x52525b : 0xa1a1aa;
    const signalColor = 0xff5a36; // Warm signal orange accent

    // Group for rotation
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Dotted Globe Geometry
    const radius = 1.0;
    const dotCount = 800;
    const dotPositions = new Float32Array(dotCount * 3);
    const dotSizes = new Float32Array(dotCount);

    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / dotCount);
      const theta = Math.sqrt(dotCount * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      dotPositions[i * 3] = x;
      dotPositions[i * 3 + 1] = y;
      dotPositions[i * 3 + 2] = z;
      dotSizes[i] = 1.5;
    }

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));

    const dotMaterial = new THREE.PointsMaterial({
      color: dotColor,
      size: 0.02,
      transparent: true,
      opacity: isDark ? 0.6 : 0.45,
    });
    const dotPoints = new THREE.Points(dotGeometry, dotMaterial);
    globeGroup.add(dotPoints);

    // 2. Minimalist Wireframe Latitude/Longitude Rings
    const ringMaterial = new THREE.LineBasicMaterial({
      color: wireColor,
      transparent: true,
      opacity: isDark ? 0.35 : 0.25,
    });

    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (lat * Math.PI) / 180;
      const ringRadius = radius * Math.cos(phi);
      const ringY = radius * Math.sin(phi);

      const segments = 48;
      const ringGeometry = new THREE.BufferGeometry();
      const ringVertices = [];

      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        ringVertices.push(ringRadius * Math.cos(theta), ringY, ringRadius * Math.sin(theta));
      }

      ringGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ringVertices, 3));
      const ring = new THREE.Line(ringGeometry, ringMaterial);
      globeGroup.add(ring);
    }

    // 3. Indian Disaster Coordinates Hotspots (Kerala, Assam, Bihar, Hyderabad)
    // Convert lat/lon to spherical 3D points
    const hotspots = [
      { lat: 11.1, lon: 76.1, name: 'Kerala' },
      { lat: 26.1, lon: 90.0, name: 'Assam' },
      { lat: 25.6, lon: 85.1, name: 'Bihar' },
      { lat: 17.4, lon: 78.4, name: 'Hyderabad' },
    ];

    const hotspotGroup = new THREE.Group();
    hotspots.forEach((spot) => {
      const phi = (90 - spot.lat) * (Math.PI / 180);
      const theta = (spot.lon + 180) * (Math.PI / 180);

      const hx = -(radius * Math.sin(phi) * Math.cos(theta));
      const hz = radius * Math.sin(phi) * Math.sin(theta);
      const hy = radius * Math.cos(phi);

      const markerGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const markerMat = new THREE.MeshBasicMaterial({ color: signalColor });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(hx, hy, hz);
      hotspotGroup.add(marker);

      // Pulse halo
      const haloGeo = new THREE.RingGeometry(0.045, 0.07, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: signalColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.set(hx, hy, hz);
      halo.lookAt(0, 0, 0);
      hotspotGroup.add(halo);
    });
    globeGroup.add(hotspotGroup);

    // Initial orientation: face the Indian subcontinent
    globeGroup.rotation.y = 2.4;
    globeGroup.rotation.x = 0.35;

    // Mouse interaction parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 0.4;
      targetY = y * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Pause rendering when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      // Slow calm rotation
      globeGroup.rotation.y += 0.0025;

      // Mouse smoothing
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      globeGroup.position.x = mouseX * 0.5;
      globeGroup.position.y = -mouseY * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      renderer.dispose();
      dotGeometry.dispose();
      dotMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hasReducedMotion, isDark]);

  if (hasReducedMotion) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="w-48 h-48 rounded-full border border-dashed border-neutral-700 flex items-center justify-center relative">
          <div className="w-32 h-32 rounded-full border border-neutral-600 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A36] animate-ping" />
          </div>
          <span className="absolute bottom-2 text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
            Telemetry Feed Active
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full min-h-[300px] flex items-center justify-center" />
      <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-mono text-neutral-400 pointer-events-none">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF5A36] animate-pulse" />
        <span>3D TELEMETRY MATRIX &bull; 4 REGIONAL NODES</span>
      </div>
    </div>
  );
};
