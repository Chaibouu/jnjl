"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Icosaèdre filaire en rotation lente — accent 3D discret dans le hero.
 * Canvas transparent, pas d'interaction requise ; se met en pause hors écran.
 */
export function HeroScene({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(1.9, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffbc01,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId = 0;
    let visible = true;
    const animate = () => {
      if (visible) {
        mesh.rotation.x += 0.0025;
        mesh.rotation.y += 0.0035;
        renderer.render(scene, camera);
      }
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(container);

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
    />
  );
}
