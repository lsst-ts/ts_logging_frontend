import { NotificationBannerSolid } from "@/components/NotificationBannerSolid";

export function NotificationBannerStack({ banners }) {
  // const [visibleBanners, setVisibleBanners] = useState(banners);

  // for (const banner of banners) {
  //   if (!visibleBanners.some((b) => b.source === banner.source)) {
  //     setVisibleBanners([...visibleBanners, banner]);
  //   }
  // }

  // const dismissBanner = (source) => {
  //     setVisibleBanners(visibleBanners.filter(b => b.source !== source));
  // };

  return (
    <div className="flex flex-col gap-4">
      {banners.map((banner) => (
        <NotificationBannerSolid
          key={banner.source}
          type={banner.type}
          source={banner.source}
          title={banner.title}
          description={banner.description}
          meta={banner.meta}
          // dismissible={banner.type !== "error"}
          // onDismiss={() => dismissBanner(banner.source)}
        />
      ))}
    </div>
  );
}
