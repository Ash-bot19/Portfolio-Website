import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/shaders/GammaCorrectionShader.js';

const modelSlots = document.querySelectorAll('[data-controller-model]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

modelSlots.forEach((container) => {
  const canvas = container.querySelector('canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false, // FXAA handles AA — hardware MSAA is unreliable across drivers
    powerPreference: 'high-performance',
  });

  renderer.setClearColor(0x000000, 0);

  // FXAA post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const fxaaPass = new ShaderPass(FXAAShader);
  composer.addPass(fxaaPass);
  // Restore sRGB gamma — EffectComposer renders to linear buffers, this converts back
  composer.addPass(new ShaderPass(GammaCorrectionShader));

  camera.position.set(0, 5.0, 1.5);
  camera.lookAt(0, 0, 0);

  // Lighting tuned for light-grey matte PS5 surface
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(3.5, 2.7, 4.8);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
  rimLight.position.set(-3.6, 1.5, -2.5);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x5668ff, 0.8, 14);
  fillLight.position.set(-2.5, -1.8, 3.6);
  scene.add(fillLight);

  const modelRoot = new THREE.Group();
  modelRoot.rotation.set(0.0, -0.6, 0.0);
  scene.add(modelRoot);

  // Light grey matte — matches PS5 DualSense colour, contrasts against dark bg
  const solidMat = new THREE.MeshStandardMaterial({
    color: 0xc8cad8,
    roughness: 0.72,
    metalness: 0.05,
  });

  let loadedModel = null;
  let rafId = null;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;

  function applyMaterial(model) {
    model.traverse((node) => {
      if (node.isMesh) {
        // Dispose old material(s) so no GPU leak from Blender-embedded textures
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else if (node.material) {
          node.material.dispose();
        }
        // Preserve Blender's baked smooth normals — do NOT recompute
        node.material = solidMat;
      }
    });
  }

  function fitModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    model.scale.setScalar(2.6 / maxAxis);
    modelRoot.add(model);
  }

  function resize() {
    const width = Math.max(1, container.offsetWidth);
    const height = Math.max(1, container.offsetHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    composer.setSize(width, height);
    fxaaPass.material.uniforms['resolution'].value.set(1 / (width * dpr), 1 / (height * dpr));
  }

  function render(time = 0) {
    if (loadedModel) {
      pointerX += (targetPointerX - pointerX) * 0.06;
      pointerY += (targetPointerY - pointerY) * 0.06;
      modelRoot.rotation.x = baseRotX + pointerY * 0.1;
      modelRoot.rotation.y = baseRotY + pointerX * 0.16 + (reducedMotion ? 0 : Math.sin(time * 0.00036) * 0.08);
      modelRoot.rotation.z = 0.0 + pointerX * 0.04;
    }
    composer.render();
    if (!reducedMotion) {
      rafId = requestAnimationFrame(render);
    }
  }

  function handlePointerMove(e) {
    const rect = container.getBoundingClientRect();
    targetPointerX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    targetPointerY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });

  requestAnimationFrame(resize);

  const isLeft = container.classList.contains('wib-prop-left');
  const modelSrc = container.dataset.modelSrc || 'assets/ps_controller.glb';
  const baseRotX = parseFloat(container.dataset.rotX ?? '0');
  const baseRotY = parseFloat(container.dataset.rotY ?? (isLeft ? '0.6' : '-0.6'));

  modelRoot.rotation.set(baseRotX, baseRotY, 0);

  new GLTFLoader().load(
    modelSrc,
    (gltf) => {
      loadedModel = gltf.scene;
      applyMaterial(loadedModel);
      fitModel(loadedModel);
      modelRoot.position.x = isLeft ? -0.8 : 0.8;
      resize();
      container.classList.add('is-loaded');
      if (!reducedMotion) requestAnimationFrame(render);
    },
    undefined,
    (err) => {
      console.error('[controller-model] GLB load failed:', err);
      container.remove();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    }
  );
});
