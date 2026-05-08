import { NotificationBanner } from "@/components/NotificationBanner";

export function NotificationBannerStack({ notifications, onDismiss }) {
  const items = notifications ?? [];

  return (
    <div className="flex flex-col gap-4">
      {items.map((banner) => (
        <NotificationBanner
          key={banner.id || banner.source}
          type={banner.type}
          source={banner.source}
          title={banner.title}
          description={banner.description}
          meta={banner.meta}
          onDismiss={onDismiss ? () => onDismiss(banner.id) : undefined}
        />
      ))}
    </div>
  );
}
