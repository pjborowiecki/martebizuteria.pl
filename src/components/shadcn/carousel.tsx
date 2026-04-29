"use client";

import {
  type ComponentProps,
  createContext,
  type JSX,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { type EmblaCarouselType, type EmblaOptionsType, type EmblaPluginType } from "embla-carousel";
import useEmblaCarousel, { type EmblaViewportRefType } from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

type CarouselApi = EmblaCarouselType;
type CarouselRef = EmblaViewportRefType;
type CarouselPlugin = EmblaPluginType[];

interface CarouselProps {
  readonly opts?: EmblaOptionsType;
  readonly plugins?: CarouselPlugin;
  readonly orientation?: "horizontal" | "vertical";
  readonly setApi?: (api: CarouselApi) => void;
}

interface CarouselContextProps extends CarouselProps {
  readonly api: CarouselApi | undefined;
  readonly canScrollNext: boolean;
  readonly canScrollPrev: boolean;
  readonly carouselRef: CarouselRef;
  readonly scrollNext: () => void;
  readonly scrollPrev: () => void;
}

const CarouselContext = createContext<CarouselContextProps | undefined>(undefined);

function useCarousel(): CarouselContextProps {
  const context = useContext(CarouselContext);

  if (context === undefined) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function useCarouselNavigation(api: CarouselApi | undefined) {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((emblaApi: CarouselApi) => {
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, []);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  useEffect(
    function syncCarouselScrollState() {
      const currentApi = api;
      if (currentApi !== undefined) {
        onSelect(currentApi);
        currentApi.on("reInit", onSelect);
        currentApi.on("select", onSelect);
      }
      return function unsubscribeFromCarouselEvents() {
        if (currentApi !== undefined) {
          currentApi.off("reInit", onSelect);
          currentApi.off("select", onSelect);
        }
      };
    },
    [api, onSelect]
  );

  return { canScrollNext, canScrollPrev, scrollNext, scrollPrev };
}

function useCarouselKeyboard(scrollPrev: () => void, scrollNext: () => void) {
  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext]
  );
}

interface CarouselContextOptions {
  readonly api: CarouselApi | undefined;
  readonly carouselRef: CarouselRef;
  readonly nav: ReturnType<typeof useCarouselNavigation>;
  readonly opts?: EmblaOptionsType;
  readonly orientation: "horizontal" | "vertical";
  readonly plugins?: CarouselPlugin;
  readonly setApi?: (api: CarouselApi) => void;
}

function useCarouselContext({ api, carouselRef, nav, opts, orientation, plugins, setApi }: CarouselContextOptions): CarouselContextProps {
  const { canScrollNext, canScrollPrev, scrollNext, scrollPrev } = nav;
  return useMemo<CarouselContextProps>(
    () => ({
      api,
      canScrollNext,
      canScrollPrev,
      carouselRef,
      opts,
      orientation,
      plugins,
      scrollNext,
      scrollPrev,
      setApi
    }),
    [api, canScrollNext, canScrollPrev, carouselRef, opts, orientation, plugins, scrollNext, scrollPrev, setApi]
  );
}

function useCarouselSetup(orientation: "horizontal" | "vertical", opts?: EmblaOptionsType, plugins?: CarouselPlugin) {
  let axis: "x" | "y" = "y";
  if (orientation === "horizontal") {
    axis = "x";
  }

  let resolvedOrientation: "horizontal" | "vertical" = orientation;
  if (opts?.axis === "y" && orientation === "horizontal") {
    resolvedOrientation = "vertical";
  }

  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis }, plugins);
  return { api, carouselRef, resolvedOrientation };
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: Readonly<ComponentProps<"div"> & CarouselProps>): JSX.Element {
  const t = useTranslations("components.shadcn.carousel");
  const { api, carouselRef, resolvedOrientation } = useCarouselSetup(orientation, opts, plugins);
  const nav = useCarouselNavigation(api);
  const handleKeyDown = useCarouselKeyboard(nav.scrollPrev, nav.scrollNext);
  const contextValue = useCarouselContext({
    api,
    carouselRef,
    nav,
    opts,
    orientation: resolvedOrientation,
    plugins,
    setApi
  });

  useEffect(
    function publishCarouselApi() {
      if (api === undefined || setApi === undefined) {
        return;
      }
      setApi(api);
    },
    [api, setApi]
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <section
        {...props}
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        aria-roledescription="carousel"
        aria-label={props["aria-label"] ?? t("carouselLabel")}
        data-slot="carousel"
      >
        {children}
      </section>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  const { carouselRef, orientation } = useCarousel();

  let layoutClass = "-mt-4 flex-col";
  if (orientation === "horizontal") {
    layoutClass = "-ml-4";
  }

  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div className={cn("flex", layoutClass, className)} {...props} />
    </div>
  );
}

function CarouselItem({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  const { orientation } = useCarousel();

  let layoutClass = "pt-4";
  if (orientation === "horizontal") {
    layoutClass = "pl-4";
  }

  return <div data-slot="carousel-item" className={cn("min-w-0 shrink-0 grow-0 basis-full", layoutClass, className)} {...props} />;
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: Readonly<ComponentProps<typeof Button>>): JSX.Element {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  const t = useTranslations("components.shadcn.carousel");

  let posClass = "-top-12 left-1/2 -translate-x-1/2 rotate-90";
  if (orientation === "horizontal") {
    posClass = "top-1/2 -left-12 -translate-y-1/2";
  }

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn("absolute touch-manipulation", posClass, className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="sr-only">{t("previousSlide")}</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: Readonly<ComponentProps<typeof Button>>): JSX.Element {
  const { orientation, scrollNext, canScrollNext } = useCarousel();
  const t = useTranslations("components.shadcn.carousel");

  let posClass = "-bottom-12 left-1/2 -translate-x-1/2 rotate-90";
  if (orientation === "horizontal") {
    posClass = "top-1/2 -right-12 -translate-y-1/2";
  }

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn("absolute touch-manipulation", posClass, className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon />
      <span className="sr-only">{t("nextSlide")}</span>
    </Button>
  );
}

export { Carousel, type CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, useCarousel };
