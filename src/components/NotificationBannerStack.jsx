import { NotificationBanner } from "@/components/NotificationBanner";

export function NotificationBannerStack({ notifications, onDismiss }) {
  const items = notifications ?? [];

  return (
    <div className="flex flex-col gap-4">
      {items.map((banner) => (
        <NotificationBanner
          key={banner.id || banner.source}
          onDismiss={onDismiss ? () => onDismiss(banner.id) : undefined}
          {...banner}
        />
      ))}
    </div>
  );
}
