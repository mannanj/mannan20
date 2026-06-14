"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { AppProvider } from "@/context/app-context";
import { ContactModal } from "@/components/contact-modal";
import { SphereScene } from "./sphere-scene";
import { GalleryHud, type GalleryCategory } from "./gallery-hud";
import { GridView } from "./grid-view";
import { LetsTalkOverlay } from "./lets-talk-overlay";
import { ProductDetail } from "./product-detail";
import { useOrbitControls } from "./use-orbit-controls";
import { getGallerySound } from "./gallery-sound";
import {
  GALLERY_PRODUCTS,
  buildTiles,
  filterProducts,
  type GalleryFilter,
  type GalleryProduct,
  type SphereTile,
} from "./gallery-data";

const EXIT_MS = 620;

interface ProductsGalleryProps {
  onSelectCategory: (category: GalleryCategory) => void;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function detectWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function flashOpacity(p: number) {
  if (p < 0.52) return 0;
  if (p < 0.66) return (p - 0.52) / 0.14;
  if (p < 0.74) return 1;
  if (p < 0.96) return 1 - (p - 0.74) / 0.22;
  return 0;
}

class CanvasErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function GalleryExperience({ onSelectCategory }: ProductsGalleryProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [webglOk] = useState(detectWebGL);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [detailProduct, setDetailProduct] = useState<GalleryProduct | null>(null);
  const [letsTalkOpen, setLetsTalkOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const orbit = useOrbitControls();
  const introRef = useRef(0);
  const introActiveRef = useRef(true);
  const phaseRef = useRef<"intro" | "gallery" | "exiting">("intro");
  const flashRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const usable = webglOk && !failed;
  const tiles = useMemo<SphereTile[]>(
    () => buildTiles(filterProducts(GALLERY_PRODUCTS, filter)),
    [filter],
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    const sound = getGallerySound();
    setSoundEnabled(sound.isEnabled());
    const unsubscribe = sound.subscribe(setSoundEnabled);
    return () => {
      unsubscribe();
      sound.setEnabled(false);
    };
  }, []);

  useEffect(() => {
    if (reduced || !usable) {
      introRef.current = 1;
      introActiveRef.current = false;
      phaseRef.current = "gallery";
      if (flashRef.current) flashRef.current.style.opacity = "0";
      return;
    }
    introRef.current = 0;
    introActiveRef.current = true;
    phaseRef.current = "intro";
    let raf = 0;
    const tick = () => {
      const p = introRef.current;
      if (flashRef.current) flashRef.current.style.opacity = String(flashOpacity(p));
      if (p >= 1) {
        phaseRef.current = "gallery";
        if (flashRef.current) flashRef.current.style.opacity = "0";
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, usable]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (letsTalkOpen || gridOpen || detailProduct) return;
      e.preventDefault();
      orbit.wheel(e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [orbit, letsTalkOpen, gridOpen, detailProduct]);

  const requestCategory = useCallback(
    (category: GalleryCategory) => {
      if (category === "products") return;
      getGallerySound().whoosh();
      if (reduced || !usable) {
        onSelectCategory(category);
        return;
      }
      phaseRef.current = "exiting";
      introActiveRef.current = false;
      const startVal = introRef.current;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / EXIT_MS);
        introRef.current = startVal * (1 - p) + 0.35 * p;
        if (flashRef.current) flashRef.current.style.opacity = String(Math.min(1, p * 1.5));
        if (p < 1) requestAnimationFrame(tick);
        else onSelectCategory(category);
      };
      requestAnimationFrame(tick);
    },
    [onSelectCategory, reduced, usable],
  );

  const openTile = useCallback((tile: SphereTile) => setDetailProduct(tile.product), []);
  const openProduct = useCallback((product: GalleryProduct) => {
    setDetailProduct(product);
    setGridOpen(false);
  }, []);

  return (
    <div
      data-testid="products-gallery"
      role="region"
      aria-label="Products gallery — drag to orbit the sphere, or use the grid icon for a list view"
      className="fixed inset-0 z-[60] overflow-hidden bg-[#050507]"
    >
      {usable ? (
        <div
          ref={wrapperRef}
          onPointerDown={orbit.onPointerDown}
          className="absolute inset-0 touch-none"
          style={{ cursor: orbit.dragging ? "grabbing" : "grab" }}
        >
          <CanvasErrorBoundary onError={() => setFailed(true)}>
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0, 0, 9], fov: 72, near: 0.1, far: 100 }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
            >
              <SphereScene
                tiles={tiles}
                orbit={orbit.state}
                introRef={introRef}
                introActiveRef={introActiveRef}
                reducedMotion={reduced}
                onOpen={openTile}
              />
            </Canvas>
          </CanvasErrorBoundary>
        </div>
      ) : (
        <GridView
          products={GALLERY_PRODUCTS}
          filter={filter}
          onFilter={setFilter}
          onOpen={openProduct}
          onClose={() => onSelectCategory("writings")}
        />
      )}

      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-[66] bg-black"
        style={{ opacity: 0 }}
      />

      {usable && (
        <GalleryHud
          filter={filter}
          onFilter={setFilter}
          onSelectCategory={requestCategory}
          onOpenLetsTalk={() => setLetsTalkOpen(true)}
          onOpenGrid={() => setGridOpen(true)}
          onStepZoom={orbit.stepZoom}
          zoomIndex={orbit.zoomIndex}
          zoomLevels={orbit.zoomLevels}
          soundEnabled={soundEnabled}
          onToggleSound={() => getGallerySound().toggle()}
        />
      )}

      {usable && gridOpen && (
        <GridView
          products={GALLERY_PRODUCTS}
          filter={filter}
          onFilter={setFilter}
          onOpen={openProduct}
          onClose={() => setGridOpen(false)}
        />
      )}

      {letsTalkOpen && <LetsTalkOverlay onClose={() => setLetsTalkOpen(false)} />}
      {detailProduct && (
        <ProductDetail product={detailProduct} onClose={() => setDetailProduct(null)} />
      )}
    </div>
  );
}

export default function ProductsGallery(props: ProductsGalleryProps) {
  return (
    <AppProvider>
      <GalleryExperience {...props} />
      <ContactModal />
    </AppProvider>
  );
}
